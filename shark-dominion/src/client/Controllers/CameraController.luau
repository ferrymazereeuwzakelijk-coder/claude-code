--[[
	CameraController
	Free 3D third-person orbit camera: behind and slightly above the shark.

	  * Mouse (locked to centre) / right stick / touch swipe orbit yaw & pitch.
	  * Mouse wheel / pinch adjusts distance; distance also scales with shark size.
	  * Focus point is smoothed so physics jitter never reaches the screen.
	  * Terrain collision: the camera pulls in instantly and eases back out.
	  * Never rises above the water surface.
	  * Optional gentle auto-recenter behind the shark after a few seconds
	    without camera input while swimming.
	  * FOV widens with speed / boost; trauma-based shake for bites and hits.
]]

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local MathUtil = require(Shared.Util.MathUtil)

local InputController = require(script.Parent.InputController)
local SharkController = require(script.Parent.SharkController)

local CameraController = {}

CameraController.MIN_DISTANCE = 9
CameraController.MAX_DISTANCE = 42
CameraController.DEFAULT_DISTANCE = 19
CameraController.ZOOM_STEP = 2.5
CameraController.MIN_PITCH = math.rad(-75)
CameraController.MAX_PITCH = math.rad(55)
CameraController.DEFAULT_PITCH = math.rad(-14) -- slightly above, looking down at the shark
CameraController.FOCUS_HEIGHT = 1.6
CameraController.BASE_FOV = 70
CameraController.BOOST_FOV = 80
CameraController.AUTO_RECENTER = true
CameraController.RECENTER_DELAY = 2.5
CameraController.RECENTER_RATE = 1.4

local yaw = 0
local pitch = CameraController.DEFAULT_PITCH
local targetDistance = CameraController.DEFAULT_DISTANCE
local distance = targetDistance
local focus: Vector3? = nil
local lastCameraInputAt = 0
local fov = CameraController.BASE_FOV
local trauma = 0
local shakeTime = 0

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include
rayParams.IgnoreWater = true

function CameraController.addShake(amount: number)
	trauma = math.min(1, trauma + amount)
end

function CameraController.getYaw(): number
	return yaw
end

local function update(dt: number)
	local camera = workspace.CurrentCamera
	if camera.CameraType ~= Enum.CameraType.Scriptable then
		camera.CameraType = Enum.CameraType.Scriptable
	end

	local root = SharkController.root
	InputController.updateMouseLock(root ~= nil)

	local delta = InputController.consumeCameraDelta(dt)
	if delta.Magnitude > 1e-5 then
		lastCameraInputAt = os.clock()
	end
	yaw = MathUtil.wrapAngle(yaw - delta.X)
	pitch = math.clamp(pitch - delta.Y, CameraController.MIN_PITCH, CameraController.MAX_PITCH)
	local zoom = InputController.consumeZoom()
	if zoom ~= 0 then
		targetDistance = math.clamp(targetDistance - zoom * CameraController.ZOOM_STEP, CameraController.MIN_DISTANCE, CameraController.MAX_DISTANCE)
	end

	if not root or not root.Parent then
		-- Loading / respawning: slow establishing orbit over the reef
		local t = os.clock() * 0.05
		local center = Vector3.new(-10, -30, -10)
		camera.CFrame = CFrame.lookAt(center + Vector3.new(math.cos(t) * 70, 12, math.sin(t) * 70), center)
		focus = nil
		return
	end

	local scale = SharkController.getScale()
	local motion = SharkController.motion

	if
		CameraController.AUTO_RECENTER
		and InputController.mode ~= "KeyboardMouse"
		and os.clock() - lastCameraInputAt > CameraController.RECENTER_DELAY
		and motion.moving
		and motion.speed > 6
	then
		yaw = MathUtil.dampAngle(yaw, SharkController.getYaw(), CameraController.RECENTER_RATE * motion.speed01 + 0.2, dt)
	end

	local focusTarget = root.Position + Vector3.new(0, CameraController.FOCUS_HEIGHT * scale, 0)
	focus = if focus then MathUtil.dampVector(focus, focusTarget, 18, dt) else focusTarget
	local f = focus :: Vector3

	local rotation = CFrame.fromEulerAnglesYXZ(pitch, yaw, 0)
	local back = -rotation.LookVector
	local wanted = targetDistance * (0.55 + 0.45 * scale)

	rayParams.FilterDescendantsInstances = { workspace.Terrain }
	local hit = workspace:Raycast(f, back * wanted, rayParams)
	local allowed = wanted
	if hit then
		allowed = math.max(2.5 * scale, (hit.Position - f).Magnitude - 1.2)
	end
	if allowed < distance then
		distance = allowed -- pull in immediately so terrain never blocks the view
	else
		distance = MathUtil.damp(distance, allowed, 4, dt)
	end

	local position = f + back * distance
	local ceiling = GameConfig.WATER_SURFACE_Y - 1.2
	if position.Y > ceiling then
		position = Vector3.new(position.X, ceiling, position.Z)
	end

	-- Speed sensation
	local targetFov = CameraController.BASE_FOV
		+ (CameraController.BOOST_FOV - CameraController.BASE_FOV) * (if motion.boosting or motion.dashing then 1 else motion.speed01 * 0.4)
	fov = MathUtil.damp(fov, targetFov, 4, dt)

	-- Trauma shake
	local shake = CFrame.identity
	if trauma > 0 then
		shakeTime += dt
		local s = trauma * trauma
		shake = CFrame.Angles(
			math.noise(shakeTime * 25, 1.3) * 0.05 * s,
			math.noise(shakeTime * 25, 7.1) * 0.05 * s,
			math.noise(shakeTime * 25, 4.7) * 0.07 * s
		)
		trauma = math.max(0, trauma - dt * 1.8)
	end

	camera.CFrame = CFrame.lookAt(position, f + rotation.LookVector * 4) * shake
	camera.FieldOfView = fov
end

function CameraController.init()
	SharkController.CharacterBound:Connect(function()
		yaw = SharkController.getYaw()
		pitch = CameraController.DEFAULT_PITCH
		focus = nil
	end)
	RunService:BindToRenderStep("SharkDominionCamera", Enum.RenderPriority.Camera.Value + 1, update)
end

return CameraController
