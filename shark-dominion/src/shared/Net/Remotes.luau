--[[
	Remotes
	Single source of truth for every network endpoint. The server creates the
	instances (Remotes.init); clients look them up (Remotes.get), waiting until
	they replicate.

	Client -> Server (all validated + rate limited on the server):
	  RequestBite(targetFishId: number?)  -- hint only; the server picks/validates the target
	  SetBoost(wantsBoost: boolean)
	  UseAbility()
	  ClientReady()                        -- client asks for the fish roster

	Server -> Client:
	  FishRoster(typeIds: {number})        -- fish id -> type id, sent once
	  FishSnapshot(buffer)                 -- unreliable, quantized positions (see FishCodec)
	  FishEaten(fishId, position, typeId, eaterUserId)
	  RewardFeedback(data)                 -- personal reward / rejection feedback
	  SharkEvent(kind, data)               -- Spawned / Damaged / Died / LevelUp / Evolved
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "Remotes"

local Remotes = {}

Remotes.Definitions = {
	RequestBite = "RemoteEvent",
	SetBoost = "RemoteEvent",
	UseAbility = "RemoteEvent",
	ClientReady = "RemoteEvent",
	FishRoster = "RemoteEvent",
	FishSnapshot = "UnreliableRemoteEvent",
	FishEaten = "RemoteEvent",
	RewardFeedback = "RemoteEvent",
	SharkEvent = "RemoteEvent",
}

local cache = {}

function Remotes.init()
	assert(RunService:IsServer(), "Remotes.init is server-only")
	local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
		folder.Parent = ReplicatedStorage
	end
	for name, className in Remotes.Definitions do
		local remote = folder:FindFirstChild(name)
		if not remote then
			remote = Instance.new(className)
			remote.Name = name
			remote.Parent = folder
		end
		cache[name] = remote
	end
end

function Remotes.get(name: string)
	local cached = cache[name]
	if cached then
		return cached
	end
	assert(Remotes.Definitions[name], `Unknown remote '{name}'`)
	local folder = ReplicatedStorage:WaitForChild(FOLDER_NAME)
	local remote = folder:WaitForChild(name)
	cache[name] = remote
	return remote
end

return Remotes
