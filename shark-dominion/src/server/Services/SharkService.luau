--[[
	SharkService
	Server authority for every shark in the world.

	Movement model: each player's shark is a physics assembly network-owned by
	that player's client (responsive, no input latency). The client only steers
	LinearVelocity / AlignOrientation; the server:
	  * validates position deltas against the maximum legitimate speed and
	    snaps cheaters back to their last valid position,
	  * clamps sharks to the swimmable volume,
	  * owns health, hunger, stamina, ability cooldowns, growth and death.

	Replicated state:
	  Player attributes: Health, MaxHealth, Hunger, MaxHunger, Stamina, MaxStamina, AbilityReadyAt
	  Shark model attributes: OwnerUserId, Scale, Species, Boosting, AbilityActive,
	                          BiteCount, HitCount, Dead   (drive animation on every client)
]]

local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local SharkConfig = require(Shared.Config.SharkConfig)
local Progression = require(Shared.Progression)
local SharkRig = require(Shared.SharkRig)
local Remotes = require(Shared.Net.Remotes)
local Signal = require(Shared.Util.Signal)

local PlayerDataService = require(script.Parent.PlayerDataService)
local RemoteGuard = require(script.Parent.RemoteGuard)

local SharkService = {}
SharkService.SharkSpawned = Signal.new()
SharkService.SharkDied = Signal.new()

local states: { [Player]: any } = {}
local spawnCFrame = CFrame.new(0, -30, 0)
local sharkFolder: Folder
local rng = Random.new()

local function round1(x: number): number
	return math.floor(x * 10 + 0.5) / 10
end

local function newState(player: Player)
	return {
		player = player,
		model = nil,
		root = nil,
		lv = nil,
		ao = nil,
		dead = true,
		health = 100,
		maxHealth = 100,
		hunger = SharkConfig.Vitals.MaxHunger,
		stamina = SharkConfig.Stamina.Max,
		boostRequested = false,
		boosting = false,
		sinceBoostStop = 0,
		starveAccum = 0,
		lastBiteAt = 0,
		abilityUntil = 0,
		abilityReadyAt = 0,
		scale = 1,
		species = SharkConfig.Species[1].Id,
		lastValidPos = nil,
		lastValidAt = 0,
		strikes = 0,
		spawnedAt = 0,
	}
end

local function pushAttributes(state)
	local player = state.player
	player:SetAttribute("Health", round1(state.health))
	player:SetAttribute("MaxHealth", state.maxHealth)
	player:SetAttribute("Hunger", round1(state.hunger))
	player:SetAttribute("MaxHunger", SharkConfig.Vitals.MaxHunger)
	player:SetAttribute("Stamina", round1(state.stamina))
	player:SetAttribute("MaxStamina", SharkConfig.Stamina.Max)
	if state.model then
		state.model:SetAttribute("Boosting", state.boosting)
	end
end

local function spawnShark(player: Player)
	local state = states[player]
	if not state then
		return
	end
	local profile = PlayerDataService.waitForProfile(player)
	if not profile or not player.Parent or states[player] ~= state then
		return
	end

	if state.model then
		state.model:Destroy()
	end

	local level = Progression.levelFromXP(profile.XP)
	local species = Progression.speciesForLevel(level).Id
	local scale = Progression.scaleForMass(profile.Mass)

	local model = SharkRig.build(species)
	SharkRig.applyScale(model, scale)
	model.Name = player.Name
	model.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
	model:SetAttribute("OwnerUserId", player.UserId)
	model:SetAttribute("BiteCount", 0)
	model:SetAttribute("HitCount", 0)
	model:SetAttribute("Boosting", false)
	model:SetAttribute("AbilityActive", false)
	model:SetAttribute("Dead", false)

	local root = model.PrimaryPart :: BasePart
	local attachment = root:FindFirstChild("RootAttachment") :: Attachment

	local lv = Instance.new("LinearVelocity")
	lv.Name = "SharkVelocity"
	lv.Attachment0 = attachment
	lv.RelativeTo = Enum.ActuatorRelativeTo.World
	lv.VelocityConstraintMode = Enum.VelocityConstraintMode.Vector
	lv.VectorVelocity = Vector3.zero
	lv.MaxForce = 60000
	lv.Parent = root

	local yaw = rng:NextNumber(0, math.pi * 2)
	local ao = Instance.new("AlignOrientation")
	ao.Name = "SharkAlign"
	ao.Mode = Enum.OrientationAlignmentMode.OneAttachment
	ao.Attachment0 = attachment
	ao.RigidityEnabled = false
	ao.MaxTorque = 1e6
	ao.MaxAngularVelocity = math.huge
	ao.Responsiveness = 35
	ao.CFrame = CFrame.Angles(0, yaw, 0)
	ao.Parent = root

	local offset = Vector3.new(rng:NextNumber(-18, 18), 0, rng:NextNumber(-18, 18))
	model:PivotTo(CFrame.new(spawnCFrame.Position + offset) * CFrame.Angles(0, yaw, 0))
	CollectionService:AddTag(model, "Shark")
	model.Parent = sharkFolder
	player.Character = model

	local ok, err = pcall(root.SetNetworkOwner, root, player)
	if not ok then
		warn(`[SharkService] SetNetworkOwner failed: {err}`)
	end

	state.model = model
	state.root = root
	state.lv = lv
	state.ao = ao
	state.dead = false
	state.scale = scale
	state.species = species
	state.maxHealth = Progression.maxHealth(scale, species)
	state.health = state.maxHealth
	state.hunger = SharkConfig.Vitals.MaxHunger * 0.85
	state.stamina = SharkConfig.Stamina.Max
	state.boosting = false
	state.boostRequested = false
	state.starveAccum = 0
	state.lastValidPos = nil
	state.strikes = 0
	state.spawnedAt = os.clock()
	pushAttributes(state)

	Remotes.get("SharkEvent"):FireClient(player, "Spawned", {})
	SharkService.SharkSpawned:Fire(player, model)
end

local function kill(state, cause: string)
	if state.dead then
		return
	end
	state.dead = true
	state.health = 0
	local player = state.player
	local model = state.model
	if model then
		model:SetAttribute("Dead", true)
		model:SetAttribute("Boosting", false)
		local root = state.root
		pcall(root.SetNetworkOwner, root, nil) -- server sinks the body
		state.lv.VectorVelocity = Vector3.new(0, -3, 0)
		state.ao.CFrame = root.CFrame.Rotation
	end
	PlayerDataService.applyDeathPenalty(player)
	pushAttributes(state)
	Remotes.get("SharkEvent"):FireClient(player, "Died", { Cause = cause, RespawnIn = GameConfig.RESPAWN_DELAY })
	SharkService.SharkDied:Fire(player, cause)

	task.delay(GameConfig.RESPAWN_DELAY, function()
		if states[player] == state and player.Parent then
			spawnShark(player)
		end
	end)
end

-- Damage entry point (starvation now; PvP / predators later).
function SharkService.applyDamage(player: Player, amount: number, cause: string, flinch: boolean?)
	local state = states[player]
	if not state or state.dead or amount <= 0 then
		return
	end
	state.health = math.max(0, state.health - amount)
	if flinch and state.model then
		state.model:SetAttribute("HitCount", (state.model:GetAttribute("HitCount") or 0) + 1)
		Remotes.get("SharkEvent"):FireClient(player, "Damaged", { Amount = amount, Cause = cause })
	end
	if state.health <= 0 then
		kill(state, cause)
	end
	pushAttributes(state)
end

function SharkService.feed(player: Player, hunger: number)
	local state = states[player]
	if not state or state.dead then
		return
	end
	state.hunger = math.min(SharkConfig.Vitals.MaxHunger, state.hunger + hunger)
	pushAttributes(state)
end

-- Re-reads mass / level and resizes or evolves the live shark.
function SharkService.refreshGrowth(player: Player)
	local state = states[player]
	local profile = PlayerDataService.getProfile(player)
	if not state or state.dead or not state.model or not profile then
		return
	end
	local level = Progression.levelFromXP(profile.XP)
	local species = Progression.speciesForLevel(level).Id
	local scale = Progression.scaleForMass(profile.Mass)

	local changed = false
	if species ~= state.species then
		state.species = species
		SharkRig.applySpecies(state.model, species)
		changed = true
	end
	if math.abs(scale - state.scale) >= SharkConfig.Growth.ScaleStep then
		state.scale = scale
		SharkRig.applyScale(state.model, scale)
		changed = true
	end
	if changed then
		local fraction = state.health / state.maxHealth
		state.maxHealth = Progression.maxHealth(state.scale, state.species)
		state.health = state.maxHealth * fraction
		pushAttributes(state)
	end
end

function SharkService.getState(player: Player)
	return states[player]
end

-- Lightweight list for the fish AI threat checks.
function SharkService.getSharkSnapshots()
	local list = {}
	for player, state in states do
		if not state.dead and state.root and state.root.Parent then
			table.insert(list, {
				player = player,
				position = state.root.Position,
				scale = state.scale,
				boosting = state.boosting,
			})
		end
	end
	return list
end

function SharkService.isAbilityActive(state): boolean
	return os.clock() < state.abilityUntil + 0.25
end

-- Movement validation -----------------------------------------------------------

local function validateMovement(state, now: number)
	-- Drift is measured from the last *validated* position over the time since it
	-- was validated, so a single teleport can never become the new baseline.
	local root = state.root
	local pos = root.Position
	if not state.lastValidPos or now - state.spawnedAt < 1 then
		state.lastValidPos = pos
		state.lastValidAt = now
		return
	end

	local elapsed = math.max(now - state.lastValidAt, 1 / 60)
	local maxSpeed = SharkConfig.maxLegitSpeed(state.scale, state.species)
	local allowed = maxSpeed * elapsed * 1.5 + 5
	local drift = (pos - state.lastValidPos).Magnitude

	local ext = GameConfig.SWIM_HALF_EXTENT + 40
	local outOfBounds = math.abs(pos.X) > ext
		or math.abs(pos.Z) > ext
		or pos.Y > GameConfig.WATER_SURFACE_Y + 6
		or pos.Y < GameConfig.TERRAIN_BOTTOM_Y

	if drift > allowed or outOfBounds then
		-- Two consecutive bad samples (~0.2 s) tolerate a single physics hiccup.
		state.strikes += 1
		if state.strikes >= 2 or outOfBounds then
			warn(
				`[SharkService] Correcting {state.player.Name}: drift {string.format("%.1f", drift)} (allowed {string.format("%.1f", allowed)}), outOfBounds={outOfBounds}`
			)
			state.model:PivotTo(CFrame.new(state.lastValidPos) * root.CFrame.Rotation)
			state.lastValidAt = now
			state.strikes = 0
		end
	else
		state.strikes = 0
		state.lastValidPos = pos
		state.lastValidAt = now
	end
end

-- Server tick -------------------------------------------------------------------

local function tick(dt: number)
	local now = os.clock()
	local V = SharkConfig.Vitals
	for _, state in states do
		if state.dead or not state.root or not state.root.Parent then
			continue
		end

		state.stamina, state.boosting, state.sinceBoostStop =
			SharkConfig.stepStamina(state.stamina, state.boostRequested, state.boosting, state.sinceBoostStop, dt)

		local drain = V.HungerDrainPerSecond * (if state.boosting then V.BoostHungerMultiplier else 1)
		state.hunger = math.max(0, state.hunger - drain * dt)

		if state.hunger <= 0 then
			local damage = V.StarveDamagePerSecond * dt
			state.starveAccum += damage
			local flinch = state.starveAccum >= V.StarveFlinchEvery
			if flinch then
				state.starveAccum = 0
			end
			SharkService.applyDamage(state.player, damage, "Starvation", flinch)
		elseif state.hunger >= V.MaxHunger * V.RegenHungerThreshold then
			state.health = math.min(state.maxHealth, state.health + V.RegenPerSecond * dt)
		end

		if state.model and state.model:GetAttribute("AbilityActive") and now >= state.abilityUntil then
			state.model:SetAttribute("AbilityActive", false)
		end

		if not state.dead then
			validateMovement(state, now)
			pushAttributes(state)
		end
	end
end

function SharkService.init(meta)
	spawnCFrame = meta.spawnCFrame

	pcall(function()
		PhysicsService:RegisterCollisionGroup(SharkRig.COLLISION_GROUP)
	end)
	-- Sharks pass through each other for now (no body-blocking griefing).
	-- PvP contact is resolved by bite range checks, not physics collisions.
	PhysicsService:CollisionGroupSetCollidable(SharkRig.COLLISION_GROUP, SharkRig.COLLISION_GROUP, false)

	sharkFolder = Instance.new("Folder")
	sharkFolder.Name = "Sharks"
	sharkFolder.Parent = workspace

	Remotes.get("SetBoost").OnServerEvent:Connect(function(player, wantsBoost)
		if type(wantsBoost) ~= "boolean" then
			return
		end
		if not RemoteGuard.allow(player, "SetBoost", 12, 12) then
			return
		end
		local state = states[player]
		if state then
			state.boostRequested = wantsBoost
		end
	end)

	Remotes.get("UseAbility").OnServerEvent:Connect(function(player)
		if not RemoteGuard.allow(player, "UseAbility", 2, 2) then
			return
		end
		local state = states[player]
		if not state or state.dead or not state.model then
			return
		end
		local now = os.clock()
		if now < state.abilityReadyAt - 0.2 then -- small tolerance for latency
			return
		end
		local A = SharkConfig.Ability
		state.abilityUntil = now + A.Duration
		state.abilityReadyAt = now + A.Cooldown
		state.model:SetAttribute("AbilityActive", true)
		player:SetAttribute("AbilityReadyAt", workspace:GetServerTimeNow() + A.Cooldown)
	end)

	local function onPlayerAdded(player: Player)
		states[player] = newState(player)
		spawnShark(player)
	end
	Players.PlayerAdded:Connect(onPlayerAdded)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end

	Players.PlayerRemoving:Connect(function(player)
		local state = states[player]
		states[player] = nil
		if state and state.model then
			state.model:Destroy()
		end
	end)

	local interval = 1 / GameConfig.VITALS_TICK_RATE
	local accumulator = 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		if accumulator >= interval then
			local step = accumulator
			accumulator = 0
			tick(step)
		end
	end)
end

return SharkService
