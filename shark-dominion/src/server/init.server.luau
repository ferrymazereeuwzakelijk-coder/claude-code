--[[
	Shark Dominion - server bootstrap
	Order matters: remotes -> lighting -> world -> data -> sharks -> fish -> feeding.
	Players who join while the reef is generating are queued by SharkService.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared.Net.Remotes)

local World = script:WaitForChild("World")
local Services = script:WaitForChild("Services")

local LightingSetup = require(World.LightingSetup)
local ReefBuilder = require(World.ReefBuilder)
local PropFactory = require(World.PropFactory)

local PlayerDataService = require(Services.PlayerDataService)
local SharkService = require(Services.SharkService)
local FishService = require(Services.FishService)
local FeedingService = require(Services.FeedingService)

Players.CharacterAutoLoads = false

Remotes.init()
LightingSetup.apply()

-- Data loads in parallel with world generation.
PlayerDataService.init()

local meta = ReefBuilder.build()
PropFactory.populate(meta)

SharkService.init(meta)
FishService.init(meta)
FeedingService.init()

ReplicatedStorage:SetAttribute("WorldReady", true)
print("[SharkDominion] Server ready")

if RunService:IsStudio() then
	local selfTest = script:FindFirstChild("Dev") and script.Dev:FindFirstChild("SelfTest")
	if selfTest then
		task.spawn(require(selfTest).run, meta)
	end
end
