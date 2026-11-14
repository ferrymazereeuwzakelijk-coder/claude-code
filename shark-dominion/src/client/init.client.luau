--[[
	Shark Dominion - client bootstrap
	Module dependency graph (no cycles):
	  InputController <- MobileControls
	  InputController, FishRenderer <- SharkController <- CameraController, SharkAnimator, HUD
	  HUD, CameraController <- FeedbackFX
	  EnvironmentFX is standalone
]]

local Players = game:GetService("Players")
local StarterGui = game:GetService("StarterGui")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Modules index ReplicatedStorage.Shared directly; make sure it has fully replicated.
if not game:IsLoaded() then
	game.Loaded:Wait()
end
ReplicatedStorage:WaitForChild("Shared")

local player = Players.LocalPlayer
local Controllers = script:WaitForChild("Controllers")
local UI = script:WaitForChild("UI")

-- The shark replaces the default humanoid controls entirely.
task.spawn(function()
	local ok, err = pcall(function()
		local playerModule = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule"))
		playerModule:GetControls():Disable()
	end)
	if not ok then
		warn(`[SharkDominion] Could not disable default controls: {err}`)
	end
end)

-- Reset is not meaningful for a custom character (death is server-driven).
task.spawn(function()
	for _ = 1, 20 do
		if pcall(StarterGui.SetCore, StarterGui, "ResetButtonCallback", false) then
			return
		end
		task.wait(0.5)
	end
end)

local InputController = require(Controllers.InputController)
local FishRenderer = require(Controllers.FishRenderer)
local SharkController = require(Controllers.SharkController)
local CameraController = require(Controllers.CameraController)
local SharkAnimator = require(Controllers.SharkAnimator)
local EnvironmentFX = require(Controllers.EnvironmentFX)
local HUD = require(UI.HUD)
local MobileControls = require(UI.MobileControls)
local FeedbackFX = require(UI.FeedbackFX)

InputController.init()
FishRenderer.init()
SharkController.init()
CameraController.init()
SharkAnimator.init()
EnvironmentFX.init()
HUD.init()
MobileControls.init()
FeedbackFX.init()
