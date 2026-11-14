--[[
	PlayerDataService
	Owns persistent progression (Mass, XP, Coins). Server-authoritative: the
	client only ever reads the replicated Player attributes this service sets.

	Replicated Player attributes:
	  Mass, XP (total), Level, LevelXP, LevelXPNeeded, Coins, Species, SpeciesName

	Persistence uses DataStoreService with retries. If loading fails the profile is
	marked noSave so a temporary outage can never overwrite real data with defaults.
	In an unpublished place / without Studio API access it runs in memory only.
	TODO(next milestone): session locking (or ProfileStore) before monetisation.
]]

local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage.Shared.Config.GameConfig)
local SharkConfig = require(ReplicatedStorage.Shared.Config.SharkConfig)
local Progression = require(ReplicatedStorage.Shared.Progression)

local PlayerDataService = {}

local DATA_VERSION = 1
local profiles: { [Player]: any } = {}
local store = nil

local function defaultProfile()
	return {
		Version = DATA_VERSION,
		Mass = SharkConfig.Growth.StartMass,
		XP = 0,
		Coins = 0,
	}
end

local function reconcile(data)
	local profile = defaultProfile()
	if type(data) == "table" then
		if type(data.Mass) == "number" then
			profile.Mass = math.clamp(data.Mass, SharkConfig.Growth.StartMass, SharkConfig.Growth.MaxMass)
		end
		if type(data.XP) == "number" then
			profile.XP = math.max(0, math.floor(data.XP))
		end
		if type(data.Coins) == "number" then
			profile.Coins = math.max(0, math.floor(data.Coins))
		end
	end
	return profile
end

local function keyFor(player: Player): string
	return "player_" .. player.UserId
end

local function applyAttributes(player: Player, profile)
	local level, levelXP, needed = Progression.levelFromXP(profile.XP)
	local species = Progression.speciesForLevel(level)
	player:SetAttribute("Mass", math.floor(profile.Mass * 10 + 0.5) / 10)
	player:SetAttribute("XP", profile.XP)
	player:SetAttribute("Level", level)
	player:SetAttribute("LevelXP", levelXP)
	player:SetAttribute("LevelXPNeeded", needed)
	player:SetAttribute("Coins", profile.Coins)
	player:SetAttribute("Species", species.Id)
	player:SetAttribute("SpeciesName", species.DisplayName)
end

local function load(player: Player)
	local data = nil
	local loadFailed = false
	if store then
		loadFailed = true
		for attempt = 1, 3 do
			local ok, result = pcall(store.GetAsync, store, keyFor(player))
			if ok then
				data = result
				loadFailed = false
				break
			end
			warn(`[PlayerData] Load attempt {attempt} failed for {player.Name}: {result}`)
			task.wait(attempt)
		end
	end
	if not player.Parent then
		return
	end
	local profile = reconcile(data)
	profile.noSave = loadFailed
	profiles[player] = profile
	applyAttributes(player, profile)
	player:SetAttribute("DataLoaded", true)
end

local function save(player: Player)
	local profile = profiles[player]
	if not store or not profile or profile.noSave then
		return
	end
	local payload = { Version = DATA_VERSION, Mass = profile.Mass, XP = profile.XP, Coins = profile.Coins }
	for attempt = 1, 3 do
		local ok, err = pcall(store.UpdateAsync, store, keyFor(player), function()
			return payload
		end)
		if ok then
			return
		end
		warn(`[PlayerData] Save attempt {attempt} failed for {player.Name}: {err}`)
		task.wait(attempt)
	end
end

function PlayerDataService.init()
	if GameConfig.USE_DATASTORE then
		local ok, result = pcall(DataStoreService.GetDataStore, DataStoreService, GameConfig.DATASTORE_NAME)
		if ok then
			store = result
		else
			warn(`[PlayerData] DataStore unavailable, running in memory only: {result}`)
		end
	end

	Players.PlayerAdded:Connect(load)
	for _, player in Players:GetPlayers() do
		task.spawn(load, player)
	end

	Players.PlayerRemoving:Connect(function(player)
		save(player)
		profiles[player] = nil
	end)

	game:BindToClose(function()
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				save(player)
				pending -= 1
			end)
		end
		local deadline = os.clock() + 25
		while pending > 0 and os.clock() < deadline do
			task.wait()
		end
	end)

	task.spawn(function()
		while true do
			task.wait(GameConfig.AUTOSAVE_INTERVAL)
			for player in profiles do
				task.spawn(save, player)
			end
		end
	end)
end

function PlayerDataService.getProfile(player: Player)
	return profiles[player]
end

function PlayerDataService.waitForProfile(player: Player, timeout: number?)
	local deadline = os.clock() + (timeout or 30)
	while not profiles[player] and player.Parent and os.clock() < deadline do
		task.wait(0.1)
	end
	return profiles[player]
end

-- Adds rewards and returns what changed: { LevelUp = newLevel?, Evolved = speciesId? }
function PlayerDataService.addRewards(player: Player, mass: number, xp: number, coins: number)
	local profile = profiles[player]
	if not profile then
		return nil
	end
	local oldLevel = Progression.levelFromXP(profile.XP)
	local oldSpecies = Progression.speciesForLevel(oldLevel)

	profile.Mass = math.min(profile.Mass + mass, SharkConfig.Growth.MaxMass)
	profile.XP += xp
	profile.Coins += coins

	local newLevel = Progression.levelFromXP(profile.XP)
	local newSpecies = Progression.speciesForLevel(newLevel)
	applyAttributes(player, profile)

	return {
		LevelUp = if newLevel > oldLevel then newLevel else nil,
		Evolved = if newSpecies.Id ~= oldSpecies.Id then newSpecies.Id else nil,
	}
end

function PlayerDataService.applyDeathPenalty(player: Player)
	local profile = profiles[player]
	if not profile then
		return
	end
	local g = SharkConfig.Growth
	profile.Mass = g.StartMass + (profile.Mass - g.StartMass) * g.DeathMassKeep
	applyAttributes(player, profile)
end

return PlayerDataService
