--[[
	SharkController
	Local player's underwater movement. Pure movement logic: it writes target
	velocity / orientation into the root's LinearVelocity and AlignOrientation
	and publishes a `motion` sample. It never touches visuals (SharkAnimator
	reads `motion` for that).

	Model:
	  * Input is camera-relative: W swims toward where the camera looks
	    (partially including camera pitch), A/D steer, S turns you around.
	  * The shark always swims along its nose. Heading changes are rate limited
	    (bigger / faster sharks turn slower), so paths are smooth arcs.
	  * Speed accelerates toward a target and glides down with exponential drag
	    when you let go (momentum without sliding forever).
	  * Pitch follows the desired climb angle; roll banks into turns.
	  * Space / Ctrl ascend / descend: tilts the nose while swimming, hovers in
	    place when idle.
	  * Boost uses the shared stamina integrator (client prediction, server
	    authoritative); the server corrects the prediction if they disagree.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local SharkConfig = require(Shared.Config.SharkConfig)
local SharkRig = require(Shared.SharkRig)
local Remotes = require(Shared.Net.Remotes)
local MathUtil = require(Shared.Util.MathUtil)
local Signal = require(Shared.Util.Signal)

local InputController = require(script.Parent.InputController)
local FishRenderer = require(script.Parent.FishRenderer)

local player = Players.LocalPlayer
local M = SharkConfig.Movement

local SharkController = {}
SharkController.CharacterBound = Signal.new() -- (model)
SharkController.LocalBite = Signal.new()
SharkController.LocalAbility = Signal.new()

SharkController.model = nil :: Model?
SharkController.root = nil :: BasePart?
SharkController.stamina = SharkConfig.Stamina.Max
SharkController.abilityReadyAt = 0
SharkController.abilityUntil = 0

-- Published every frame for the animator, camera and HUD.
SharkController.motion = {
	speed = 0,
	speed01 = 0,
	yawRate = 0,
	pitch = 0,
	roll = 0,
	vertical = 0,
	boosting = false,
	dashing = false,
	moving = false,
}

local lv: LinearVelocity? = nil
local ao: AlignOrientation? = nil
local yaw, pitch, roll, yawRate, speed = 0, 0, 0, 0, 0
local currentVelocity = Vector3.zero
local sinceBoostStop = 0
local boostSent = false
local lastBiteAt = -math.huge
local boundAt = 0

function SharkController.getYaw(): number
	return yaw
end

function SharkController.getScale(): number
	local model = SharkController.model
	return (model and model:GetAttribute("Scale")) or 1
end

function SharkController.isAlive(): boolean
	local model = SharkController.model
	return model ~= nil and model.Parent ~= nil and not model:GetAttribute("Dead")
end

local function bindCharacter(character: Model)
	local root = character:WaitForChild("Root", 15) :: BasePart?
	if not root then
		return
	end
	local velocity = root:WaitForChild("SharkVelocity", 15) :: LinearVelocity?
	local align = root:WaitForChild("SharkAlign", 15) :: AlignOrientation?
	if not velocity or not align or player.Character ~= character then
		return
	end

	lv, ao = velocity, align
	SharkController.model = character
	SharkController.root = root

	local look = root.CFrame.LookVector
	yaw = MathUtil.yawFromVector(look)
	pitch, roll, yawRate, speed = 0, 0, 0, 0
	currentVelocity = Vector3.zero
	SharkController.stamina = SharkConfig.Stamina.Max
	sinceBoostStop = 0
	boundAt = os.clock()
	SharkController.CharacterBound:Fire(character)
end

local function unbind()
	SharkController.model = nil
	SharkController.root = nil
	lv, ao = nil, nil
end

local function applyBounds(position: Vector3, velocity: Vector3, scale: number): Vector3
	local vx, vy, vz = velocity.X, velocity.Y, velocity.Z
	local top = GameConfig.WATER_SURFACE_Y - GameConfig.SURFACE_MARGIN * scale
	if position.Y > top and vy > -1 then
		vy = math.min(vy, (top - position.Y) * 3)
	end
	if position.Y < GameConfig.SWIM_MIN_Y and vy < 0 then
		vy = 0
	end
	local ext = GameConfig.SWIM_HALF_EXTENT
	if position.X > ext and vx > 0 or position.X < -ext and vx < 0 then
		vx = (math.sign(position.X) * ext - position.X) * 2
	end
	if position.Z > ext and vz > 0 or position.Z < -ext and vz < 0 then
		vz = (math.sign(position.Z) * ext - position.Z) * 2
	end
	return Vector3.new(vx, vy, vz)
end

local function update(dt: number)
	local root = SharkController.root
	local motion = SharkController.motion
	if not root or not root.Parent or not lv or not ao then
		return
	end
	local model = SharkController.model :: Model
	if model:GetAttribute("Dead") then
		motion.speed, motion.speed01, motion.moving, motion.boosting = 0, 0, false, false
		if boostSent then
			boostSent = false
			Remotes.get("SetBoost"):FireServer(false)
		end
		return
	end

	dt = math.min(dt, 0.1)
	local now = os.clock()
	local scale = model:GetAttribute("Scale") or 1
	local mv = SharkConfig.getMovement(scale, model:GetAttribute("Species"))

	-- Camera-relative desired direction ------------------------------------------
	local camLook = workspace.CurrentCamera.CFrame.LookVector
	local flatForward = MathUtil.safeUnit(Vector3.new(camLook.X, 0, camLook.Z), Vector3.new(-math.sin(yaw), 0, -math.cos(yaw)))
	local right = Vector3.new(-flatForward.Z, 0, flatForward.X)
	local move = InputController.getMove()
	local vertical = InputController.getVertical()
	local moveAmount = math.min(move.Magnitude, 1)
	local hasMove = moveAmount > 0.08

	local desired = flatForward * move.Y + right * move.X
	if hasMove then
		local camFlat = math.max(Vector3.new(camLook.X, 0, camLook.Z).Magnitude, 0.2)
		local camClimb = camLook.Y / camFlat -- slope the camera is looking along
		desired += Vector3.yAxis * (camClimb * M.CameraPitchInfluence * math.max(move.Y, 0))
		desired += Vector3.yAxis * vertical * 0.9
	end
	local horizontal = Vector3.new(desired.X, 0, desired.Z)

	-- Boost (predicted) ---------------------------------------------------------------
	local wantsBoost = InputController.isBoostHeld() and hasMove
	local boosting
	SharkController.stamina, boosting, sinceBoostStop =
		SharkConfig.stepStamina(SharkController.stamina, wantsBoost, motion.boosting, sinceBoostStop, dt)
	if wantsBoost ~= boostSent then
		boostSent = wantsBoost
		Remotes.get("SetBoost"):FireServer(wantsBoost)
	end
	local dashing = now < SharkController.abilityUntil

	-- Speed with acceleration and drag ---------------------------------------------------
	local targetSpeed = 0
	if hasMove then
		targetSpeed = if boosting then mv.Boost else mv.Cruise * moveAmount
	end
	if dashing then
		targetSpeed = math.max(targetSpeed, mv.Cruise) * SharkConfig.Ability.SpeedMultiplier
	end
	if targetSpeed > speed then
		local accel = if boosting or dashing then mv.BoostAccel else mv.Accel
		speed = math.min(targetSpeed, speed + accel * dt)
	else
		speed = MathUtil.damp(speed, targetSpeed, M.Drag, dt)
	end

	-- Hitting a wall bleeds momentum instead of pushing forever.
	local forwardNow = CFrame.fromEulerAnglesYXZ(pitch, yaw, 0).LookVector
	if now - boundAt > 1 and speed > 6 then
		local along = root.AssemblyLinearVelocity:Dot(forwardNow)
		if along < speed * 0.35 then
			speed = MathUtil.damp(speed, math.max(along, 0), 3, dt)
		end
	end
	local speed01 = math.clamp(speed / mv.Boost, 0, 1)

	-- Heading (yaw) with a turn-rate limit -------------------------------------------------
	local turnRate = mv.TurnRate * MathUtil.lerp(1, M.BoostTurnFactor, speed01)
	local desiredYawRate = 0
	if horizontal.Magnitude > 0.05 then
		local delta = MathUtil.wrapAngle(MathUtil.yawFromVector(horizontal) - yaw)
		desiredYawRate = math.clamp(delta * M.TurnResponsiveness, -turnRate, turnRate)
	end
	yawRate = MathUtil.damp(yawRate, desiredYawRate, M.YawRateSmoothing, dt)
	yaw = MathUtil.wrapAngle(yaw + yawRate * dt)

	-- Pitch -----------------------------------------------------------------------------------
	local targetPitch
	if hasMove then
		targetPitch = math.atan2(desired.Y, math.max(horizontal.Magnitude, 0.35))
	else
		targetPitch = vertical * M.HoverPitch
	end
	targetPitch = math.clamp(targetPitch, -M.PitchLimit, M.PitchLimit)
	local depth = GameConfig.WATER_SURFACE_Y - root.Position.Y
	local softZone = M.SurfaceSoftZone * scale
	if depth < softZone then
		targetPitch = math.min(targetPitch, M.PitchLimit * math.clamp((depth - GameConfig.SURFACE_MARGIN * scale) / softZone, 0, 1))
	end
	pitch = MathUtil.damp(pitch, targetPitch, M.PitchResponsiveness, dt)

	-- Banking ----------------------------------------------------------------------------------
	local targetRoll = math.clamp(yawRate * M.BankPerTurnRate * (0.35 + 0.65 * speed01), -M.BankMax, M.BankMax)
	roll = MathUtil.damp(roll, targetRoll, M.BankResponsiveness, dt)

	-- Velocity -----------------------------------------------------------------------------------
	local forward = CFrame.fromEulerAnglesYXZ(pitch, yaw, 0).LookVector
	local targetVelocity = forward * speed
	local hoverFactor = 1 - math.clamp(speed / mv.Cruise, 0, 1) * 0.6
	targetVelocity += Vector3.yAxis * (vertical * mv.Vertical * hoverFactor)
	if not hasMove and vertical == 0 then
		targetVelocity += Vector3.yAxis * math.sin(now * 1.3) * 0.35 -- gentle idle bob
	end
	currentVelocity = MathUtil.dampVector(currentVelocity, targetVelocity, M.VelocityResponsiveness, dt)
	currentVelocity = applyBounds(root.Position, currentVelocity, scale)

	lv.VectorVelocity = currentVelocity
	ao.CFrame = CFrame.fromEulerAnglesYXZ(pitch, yaw, roll)

	motion.speed = speed
	motion.speed01 = speed01
	motion.yawRate = yawRate
	motion.pitch = pitch
	motion.roll = roll
	motion.vertical = vertical
	motion.boosting = boosting
	motion.dashing = dashing
	motion.moving = hasMove
end

local function onBite()
	local root = SharkController.root
	if not root or not SharkController.isAlive() then
		return
	end
	local now = os.clock()
	if now - lastBiteAt < SharkConfig.Bite.Cooldown then
		return
	end
	lastBiteAt = now

	local scale = SharkController.getScale()
	local mouth = SharkRig.getMouthPosition(root.CFrame, scale)
	local range = SharkConfig.Bite.Range * scale
	if now < SharkController.abilityUntil then
		range *= SharkConfig.Ability.BiteRangeMultiplier
	end
	-- Hint only: the server re-validates against its own fish positions.
	local targetId = FishRenderer.findTarget(mouth, root.CFrame.LookVector, range * 1.6)
	Remotes.get("RequestBite"):FireServer(targetId)

	speed += SharkConfig.Bite.LungeSpeed
	SharkController.LocalBite:Fire()
end

local function onAbility()
	if not SharkController.isAlive() then
		return
	end
	local now = os.clock()
	if now < SharkController.abilityReadyAt then
		return
	end
	local A = SharkConfig.Ability
	SharkController.abilityUntil = now + A.Duration
	SharkController.abilityReadyAt = now + A.Cooldown
	Remotes.get("UseAbility"):FireServer()
	SharkController.LocalAbility:Fire()
end

function SharkController.getBiteCooldown01(): number
	return math.clamp((os.clock() - lastBiteAt) / SharkConfig.Bite.Cooldown, 0, 1)
end

function SharkController.init()
	player.CharacterAdded:Connect(function(character)
		unbind()
		task.spawn(bindCharacter, character)
	end)
	player.CharacterRemoving:Connect(unbind)
	if player.Character then
		task.spawn(bindCharacter, player.Character)
	end

	-- Reconcile predicted stamina with the authoritative server value.
	player:GetAttributeChangedSignal("Stamina"):Connect(function()
		local serverStamina = player:GetAttribute("Stamina")
		if type(serverStamina) == "number" and math.abs(serverStamina - SharkController.stamina) > 12 then
			SharkController.stamina = serverStamina
		end
	end)

	InputController.Bite:Connect(onBite)
	InputController.Ability:Connect(onAbility)

	RunService.PreSimulation:Connect(update)
end

return SharkController
