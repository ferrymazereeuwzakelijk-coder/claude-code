--[[
	FeedingService
	Server-validated biting. The client sends only "I bit" plus an optional fish
	id hint (the fish it was aiming at). The server:
	  1. validates argument types and rate-limits the remote,
	  2. enforces the bite cooldown and that the shark is alive,
	  3. computes the mouth position from the SERVER's view of the shark,
	  4. accepts the hinted fish only if it is genuinely in range and in front,
	     otherwise searches for the best valid fish itself,
	  5. enforces size gating (MinScale), consumes the fish, grants rewards,
	     restores hunger and grows the shark,
	  6. (PvP, behind GameConfig.PVP_ENABLED) damages another shark in range.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local SharkConfig = require(Shared.Config.SharkConfig)
local SharkRig = require(Shared.SharkRig)
local Remotes = require(Shared.Net.Remotes)

local RemoteGuard = require(script.Parent.RemoteGuard)
local SharkService = require(script.Parent.SharkService)
local FishService = require(script.Parent.FishService)
local PlayerDataService = require(script.Parent.PlayerDataService)

local FeedingService = {}

local rewardRemote

local function tryPvP(attacker: Player, state, mouth: Vector3, range: number): boolean
	local species = SharkConfig.getSpecies(state.species)
	for _, other in SharkService.getSharkSnapshots() do
		if other.player ~= attacker then
			local reach = range + 1.3 * other.scale -- victim body radius
			if (other.position - mouth).Magnitude <= reach then
				local damage = SharkConfig.Bite.PvPDamage * species.BiteMult * math.sqrt(state.scale / other.scale)
				SharkService.applyDamage(other.player, damage, "Bitten by " .. attacker.DisplayName, true)
				return true
			end
		end
	end
	return false
end

local function onBite(player: Player, targetId: any)
	if targetId ~= nil and not RemoteGuard.isInteger(targetId, 1, 65535) then
		return
	end
	if not RemoteGuard.allow(player, "RequestBite", 6, 4) then
		return
	end

	local state = SharkService.getState(player)
	if not state or state.dead or not state.root or not state.root.Parent then
		return
	end

	local now = os.clock()
	local B = SharkConfig.Bite
	if now - state.lastBiteAt < B.Cooldown * 0.85 then
		return
	end
	state.lastBiteAt = now
	state.model:SetAttribute("BiteCount", (state.model:GetAttribute("BiteCount") or 0) + 1)

	local root = state.root
	local cf = root.CFrame
	local look = cf.LookVector
	-- Lead the mouth by a fraction of the velocity to compensate replication delay.
	local mouth = SharkRig.getMouthPosition(cf, state.scale) + root.AssemblyLinearVelocity * 0.08
	local range = B.Range * state.scale
	if SharkService.isAbilityActive(state) then
		range *= SharkConfig.Ability.BiteRangeMultiplier
	end

	local fish = nil
	if targetId then
		local hinted = FishService.getFish(targetId)
		if FishService.isBiteValid(hinted, mouth, look, cf.Position, range) then
			fish = hinted
		end
	end
	if not fish then
		fish = FishService.findBiteTarget(mouth, look, cf.Position, range)
	end

	if fish then
		local cfg = fish.cfg
		if state.scale < cfg.MinScale then
			rewardRemote:FireClient(player, { Kind = "TooBig", FishType = fish.typeId, Needed = cfg.MinScale })
			return
		end
		local position = fish.pos
		if not FishService.consume(fish.id, player) then
			return
		end
		local result = PlayerDataService.addRewards(player, cfg.Mass, cfg.XP, cfg.Coins) or {}
		SharkService.feed(player, cfg.Hunger)
		SharkService.refreshGrowth(player)
		rewardRemote:FireClient(player, {
			Kind = "Eat",
			FishType = fish.typeId,
			Mass = cfg.Mass,
			XP = cfg.XP,
			Coins = cfg.Coins,
			Position = position,
			LevelUp = result.LevelUp,
			Evolved = result.Evolved,
		})
		if result.LevelUp then
			Remotes.get("SharkEvent"):FireClient(player, "LevelUp", { Level = result.LevelUp })
		end
		if result.Evolved then
			Remotes.get("SharkEvent"):FireClient(player, "Evolved", {
				Species = result.Evolved,
				Name = SharkConfig.getSpecies(result.Evolved).DisplayName,
			})
		end
		return
	end

	if GameConfig.PVP_ENABLED then
		tryPvP(player, state, mouth, range)
	end
end

function FeedingService.init()
	rewardRemote = Remotes.get("RewardFeedback")
	Remotes.get("RequestBite").OnServerEvent:Connect(onBite)
end

return FeedingService
