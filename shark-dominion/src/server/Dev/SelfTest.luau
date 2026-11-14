--[[
	SelfTest (Studio only)
	Automated sanity checks that run every time you press Play in Studio.
	Look for "[SelfTest] PASS" / "[SelfTest] FAIL" in the Output window.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local SharkConfig = require(Shared.Config.SharkConfig)
local FishConfig = require(Shared.Config.FishConfig)
local Progression = require(Shared.Progression)
local FishCodec = require(Shared.Net.FishCodec)
local MathUtil = require(Shared.Util.MathUtil)
local SharkRig = require(Shared.SharkRig)

local SelfTest = {}

function SelfTest.run(meta)
	local passed, failed = 0, 0
	local function check(name: string, ok: boolean, detail: string?)
		if ok then
			passed += 1
		else
			failed += 1
			warn(`[SelfTest] FAIL {name} {detail or ""}`)
		end
	end

	-- Math
	check("wrapAngle", math.abs(MathUtil.wrapAngle(math.pi * 3) - -math.pi) < 1e-6)
	check("yawFromVector", math.abs(MathUtil.yawFromVector(Vector3.new(0, 0, -1))) < 1e-6)
	local yaw = MathUtil.yawFromVector(Vector3.new(-1, 0, 0))
	check("yaw round trip", (CFrame.Angles(0, yaw, 0).LookVector - Vector3.new(-1, 0, 0)).Magnitude < 1e-4)

	-- Codec round trip
	local ids = { 1, 2, 300 }
	local positions = { Vector3.new(1.25, -30.5, 99.75), Vector3.new(-250, -140.25, 0), Vector3.new(355.5, -2, -355.5) }
	local b = FishCodec.encode(123.5, ids, positions, 1, 3)
	local decoded = {}
	local t = FishCodec.decode(b, function(_, id, pos)
		decoded[id] = pos
	end)
	check("codec time", t == 123.5)
	for i, id in ids do
		check(`codec fish {id}`, decoded[id] ~= nil and (decoded[id] - positions[i]).Magnitude < 0.2)
	end
	check("codec packet size", buffer.len(FishCodec.encode(0, table.create(90, 1), table.create(90, Vector3.zero), 1, 90)) < 900)
	check("codec rejects junk", FishCodec.decode("nope", function() end) == nil)

	-- Progression
	local prevScale = 0
	for mass = SharkConfig.Growth.StartMass, SharkConfig.Growth.MaxMass, 50 do
		local s = Progression.scaleForMass(mass)
		check("scale monotonic", s >= prevScale)
		check("scale within limits", s >= SharkConfig.Growth.MinScale and s <= SharkConfig.Growth.MaxScale)
		prevScale = s
	end
	local level, into, need = Progression.levelFromXP(Progression.xpToNext(1))
	check("level 2 at threshold", level == 2 and into == 0 and need == Progression.xpToNext(2))
	check("species level 1", Progression.speciesForLevel(1).Id == "ReefShark")
	check("species level 5", Progression.speciesForLevel(5).Id == "BlacktipShark")

	-- Config sanity
	check("five fish types", #FishConfig.Types == 5)
	for _, cfg in FishConfig.Types do
		check(`{cfg.Id} body first`, cfg.Visual.Parts[1].Name == "Body")
		check(`{cfg.Id} flee faster`, cfg.FleeSpeed > cfg.Speed)
	end
	check("stamina drains", (SharkConfig.stepStamina(100, true, false, 0, 1)) < 100)

	-- Rig
	local rig = SharkRig.build("ReefShark")
	SharkRig.applyScale(rig, 2)
	local torso = rig:FindFirstChild("Torso") :: BasePart
	check("rig scales", torso and (torso.Size - Vector3.new(5, 4.8, 8.8)).Magnitude < 1e-3)
	SharkRig.applyScale(rig, 1)
	check("rig rescales without drift", torso and (torso.Size - Vector3.new(2.5, 2.4, 4.4)).Magnitude < 1e-3)
	for _, name in { "HeadJoint", "JawJoint", "Tail1Joint", "Tail2Joint", "CaudalJoint", "PectoralLJoint", "PectoralRJoint" } do
		check(`rig has {name}`, rig:FindFirstChild(name, true) ~= nil)
	end
	rig:Destroy()

	-- World
	if meta then
		local spawnPos = meta.spawnCFrame.Position
		check("spawn underwater", spawnPos.Y < GameConfig.WATER_SURFACE_Y - 5)
		check("spawn above floor", spawnPos.Y > meta.heightAt(spawnPos.X, spawnPos.Z))
		check("anemones placed", meta.anemones and #meta.anemones > 0)
		local reef = workspace:FindFirstChild("Reef")
		check("reef props exist", reef ~= nil and #reef:GetDescendants() > 200)
		local region = Region3.new(spawnPos - Vector3.new(2, 2, 2), spawnPos + Vector3.new(2, 2, 2)):ExpandToGrid(4)
		local ok, channels = pcall(function()
			return workspace.Terrain:ReadVoxelChannels(region, 4, { "LiquidOccupancy" })
		end)
		local isWater
		if ok and channels and channels.LiquidOccupancy then
			isWater = channels.LiquidOccupancy[1][1][1] > 0.5
		else
			local material = workspace.Terrain:ReadVoxels(region, 4)
			isWater = material[1][1][1] == Enum.Material.Water
		end
		check("water at spawn", isWater)
	end

	if failed == 0 then
		print(`[SelfTest] PASS ({passed} checks)`)
	else
		warn(`[SelfTest] FAIL ({failed} failed, {passed} passed)`)
	end
end

return SelfTest
