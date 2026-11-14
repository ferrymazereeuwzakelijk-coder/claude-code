--[[
	Shark Dominion - server bootstrap
	Order matters: remotes -> lighting -> world -> data -> sharks -> fish -> feeding.
	Players who join while the reef is generating are queued by SharkService.

	Every step runs protected. A failure is logged with its stack trace AND
	published as ReplicatedStorage attribute "ServerError", which the client HUD
	shows on screen (handy when testing on a phone without the console). Later
	steps still run where possible, e.g. a terrain failure falls back to an empty
	open-water world so movement / fish / feeding can still be tested.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local errors = {}

local function step(name: string, fn, ...)
	local results = table.pack(xpcall(fn, debug.traceback, ...))
	if not results[1] then
		local message = `[{name}] {results[2]}`
		warn("[SharkDominion] Step failed: " .. message)
		table.insert(errors, string.sub(message, 1, 300))
		ReplicatedStorage:SetAttribute("ServerError", table.concat(errors, "\n"))
		return false, nil
	end
	return true, results[2]
end

Players.CharacterAutoLoads = false

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared.Net.Remotes)
Remotes.init()

local World = script:WaitForChild("World")
local Services = script:WaitForChild("Services")

step("LightingSetup", function()
	require(World.LightingSetup).apply()
end)

local PlayerDataService
step("PlayerDataService", function()
	PlayerDataService = require(Services.PlayerDataService)
	PlayerDataService.init() -- data loads in parallel with world generation
end)

local _, meta = step("ReefBuilder", function()
	return require(World.ReefBuilder).build()
end)
if not meta then
	-- Fallback: flat seabed in open water so the rest of the game stays testable.
	local GameConfig = require(Shared.Config.GameConfig)
	pcall(function()
		workspace.Terrain:Clear()
		workspace.Terrain:FillBlock(CFrame.new(0, -90, 0), Vector3.new(832, 180, 832), Enum.Material.Water)
		workspace.Terrain:FillBlock(CFrame.new(0, -170, 0), Vector3.new(832, 20, 832), Enum.Material.Sand)
	end)
	local center = Vector3.new(0, 0, 0)
	meta = {
		heightAt = function()
			return -160
		end,
		rocks = {},
		plateauCenter = center,
		pillarBases = {},
		meadow = { Center = center, Radius = 50 },
		kelpForest = { Center = center, Radius = 50 },
		spawnCFrame = CFrame.new(0, -40, 0),
		zones = {
			Open = { { Center = center, Radius = 200 } },
			Rocks = { { Center = center, Radius = 120 } },
			DropOff = { { Center = center, Radius = 200 } },
			Reef = { { Center = center, Radius = 120 } },
		},
		anemones = {},
	}
	meta.surface = GameConfig.WATER_SURFACE_Y
end

step("PropFactory", function()
	require(World.PropFactory).populate(meta)
end)

step("SharkService", function()
	require(Services.SharkService).init(meta)
end)
step("FishService", function()
	require(Services.FishService).init(meta)
end)
step("FeedingService", function()
	require(Services.FeedingService).init()
end)

ReplicatedStorage:SetAttribute("WorldReady", true)
print(`[SharkDominion] Server ready ({#errors} failed steps)`)

if RunService:IsStudio() then
	local dev = script:FindFirstChild("Dev")
	local selfTest = dev and dev:FindFirstChild("SelfTest")
	if selfTest then
		task.spawn(require(selfTest).run, meta)
	end
end
