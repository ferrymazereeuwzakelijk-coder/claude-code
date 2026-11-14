--[[
	EnvironmentFX
	Client-only underwater atmosphere:
	  * Marine snow: drifting particulates in a volume that follows the camera.
	  * Light shafts: soft additive beams from the surface, placed on a world grid
	    around the camera (so they have correct parallax) and faded by distance.
	  * Depth grade: colour correction + atmosphere density change with depth.
	  * Sway: animates every model tagged "Sway" (seagrass, kelp, anemones, fans)
	    with height-weighted bending, distance culled and throttled to 30 Hz,
	    moved in one BulkMoveTo call.
	Quality scales down automatically on touch devices.
]]

local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local CollectionService = game:GetService("CollectionService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local MathUtil = require(Shared.Util.MathUtil)

local EnvironmentFX = {}

local LOW_END = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
local SURFACE = GameConfig.WATER_SURFACE_Y
local SNOW_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds"
local SHAFT_COUNT = if LOW_END then 8 else 14
local SHAFT_CELL = 46
local SWAY_RADIUS = if LOW_END then 90 else 150
local SWAY_INTERVAL = 1 / 30

local snowPart: Part
local shaftAnchor: Part
local shafts = {}
local grade: ColorCorrectionEffect
local swayModels: { [Model]: any } = {}
local swayAccum = 0
local shaftAccum = 1
local bulkParts, bulkCFrames = {}, {}

-- Marine snow ---------------------------------------------------------------------

local function createSnow()
	snowPart = Instance.new("Part")
	snowPart.Name = "MarineSnow"
	snowPart.Anchored = true
	snowPart.CanCollide = false
	snowPart.CanQuery = false
	snowPart.CanTouch = false
	snowPart.Transparency = 1
	snowPart.Size = Vector3.new(90, 50, 90)
	snowPart.Parent = workspace

	local e = Instance.new("ParticleEmitter")
	e.Texture = SNOW_TEXTURE
	e.Shape = Enum.ParticleEmitterShape.Box
	e.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
	e.Rate = if LOW_END then 30 else 70
	e.Lifetime = NumberRange.new(6, 10)
	e.Speed = NumberRange.new(0.2, 0.8)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Acceleration = Vector3.new(0, -0.15, 0)
	e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.08), NumberSequenceKeypoint.new(1, 0.16) })
	e.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),
		NumberSequenceKeypoint.new(0.2, 0.45),
		NumberSequenceKeypoint.new(0.8, 0.55),
		NumberSequenceKeypoint.new(1, 1),
	})
	e.Color = ColorSequence.new(Color3.fromRGB(210, 245, 240))
	e.LightEmission = 0.25
	e.LightInfluence = 0.6
	e.RotSpeed = NumberRange.new(-30, 30)
	e.Parent = snowPart
end

-- Light shafts -----------------------------------------------------------------------

local function hash(x: number, z: number, salt: number): number
	local h = math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453
	return h - math.floor(h)
end

local function createShafts()
	shaftAnchor = Instance.new("Part")
	shaftAnchor.Name = "LightShafts"
	shaftAnchor.Anchored = true
	shaftAnchor.CanCollide = false
	shaftAnchor.CanQuery = false
	shaftAnchor.CanTouch = false
	shaftAnchor.Transparency = 1
	shaftAnchor.Size = Vector3.one
	shaftAnchor.CFrame = CFrame.identity
	shaftAnchor.Parent = workspace

	for i = 1, SHAFT_COUNT do
		local a0 = Instance.new("Attachment")
		a0.Parent = shaftAnchor
		local a1 = Instance.new("Attachment")
		a1.Parent = shaftAnchor
		local beam = Instance.new("Beam")
		beam.Attachment0 = a0
		beam.Attachment1 = a1
		beam.FaceCamera = true
		beam.LightEmission = 1
		beam.LightInfluence = 0
		beam.Segments = 1
		beam.Color = ColorSequence.new(Color3.fromRGB(196, 242, 255))
		beam.Enabled = false
		beam.Parent = shaftAnchor
		shafts[i] = { a0 = a0, a1 = a1, beam = beam }
	end
end

local function updateShafts(camPos: Vector3)
	local cx = math.floor(camPos.X / SHAFT_CELL)
	local cz = math.floor(camPos.Z / SHAFT_CELL)
	local candidates = {}
	for dx = -3, 3 do
		for dz = -3, 3 do
			local gx, gz = cx + dx, cz + dz
			if hash(gx, gz, 1) < 0.5 then
				local x = (gx + hash(gx, gz, 2)) * SHAFT_CELL
				local z = (gz + hash(gx, gz, 3)) * SHAFT_CELL
				local d = Vector2.new(x - camPos.X, z - camPos.Z).Magnitude
				table.insert(candidates, { x = x, z = z, d = d, gx = gx, gz = gz })
			end
		end
	end
	table.sort(candidates, function(a, b)
		return a.d < b.d
	end)

	for i, shaft in shafts do
		local c = candidates[i]
		if not c then
			shaft.beam.Enabled = false
			continue
		end
		local length = 70 + hash(c.gx, c.gz, 4) * 50
		local top = Vector3.new(c.x, SURFACE - 0.5, c.z)
		shaft.a0.Position = top
		shaft.a1.Position = top + Vector3.new(length * 0.18, -length, length * 0.1)
		local width = 5 + hash(c.gx, c.gz, 5) * 7
		shaft.beam.Width0 = width
		shaft.beam.Width1 = width * 2.4
		local fade = math.clamp((c.d - 40) / 110, 0, 1) -- far shafts fade out
		local base = 0.78 + fade * 0.22
		shaft.beam.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, math.min(1, base)),
			NumberSequenceKeypoint.new(0.55, math.min(1, base + 0.1)),
			NumberSequenceKeypoint.new(1, 1),
		})
		shaft.beam.Enabled = fade < 1
	end
end

-- Depth grade ----------------------------------------------------------------------------

local function createGrade()
	grade = Instance.new("ColorCorrectionEffect")
	grade.Name = "DepthGrade"
	grade.Parent = Lighting
end

local function updateGrade(camPos: Vector3, dt: number)
	local depth01 = math.clamp((SURFACE - camPos.Y) / 150, 0, 1)
	grade.Brightness = MathUtil.damp(grade.Brightness, -0.02 - depth01 * 0.1, 3, dt)
	grade.Saturation = MathUtil.damp(grade.Saturation, 0.05 - depth01 * 0.25, 3, dt)
	grade.TintColor = Color3.new(1, 1, 1):Lerp(Color3.fromRGB(160, 205, 235), depth01)
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere then
		atmosphere.Density = MathUtil.damp(atmosphere.Density, 0.38 + depth01 * 0.14, 2, dt)
	end
end

-- Sway -----------------------------------------------------------------------------------------

local function registerSway(model: Model)
	if swayModels[model] then
		return
	end
	local pivot = model:GetAttribute("SwayPivot")
	if typeof(pivot) ~= "CFrame" then
		return
	end
	local height = math.max(model:GetAttribute("SwayHeight") or 4, 0.5)
	local entry = {
		pivot = pivot,
		pivotInv = pivot:Inverse(),
		amplitude = model:GetAttribute("SwayAmplitude") or 0.15,
		frequency = model:GetAttribute("SwayFrequency") or 1,
		phase = (pivot.Position.X * 0.13 + pivot.Position.Z * 0.07) % (math.pi * 2), -- coherent "current" wave
		parts = {},
		bases = {},
		weights = {},
	}
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			table.insert(entry.parts, d)
			table.insert(entry.bases, d.CFrame)
			local h = pivot:PointToObjectSpace(d.Position).Y
			table.insert(entry.weights, math.clamp(h / height, 0, 1) ^ 1.3)
		end
	end
	swayModels[model] = entry
end

local function updateSway(camPos: Vector3, t: number)
	table.clear(bulkParts)
	table.clear(bulkCFrames)
	local n = 0
	local radius2 = SWAY_RADIUS * SWAY_RADIUS
	for model, e in swayModels do
		if not model.Parent then
			swayModels[model] = nil
			continue
		end
		local offset = e.pivot.Position - camPos
		if offset:Dot(offset) > radius2 then
			continue
		end
		local wave = t * e.frequency * math.pi * 2 + e.phase
		for i, part in e.parts do
			local w = e.weights[i]
			local angleX = math.sin(wave + w * 1.2) * e.amplitude * w
			local angleZ = math.cos(wave * 0.7 + w) * e.amplitude * 0.5 * w
			n += 1
			bulkParts[n] = part
			bulkCFrames[n] = e.pivot * CFrame.Angles(angleX, 0, angleZ) * e.pivotInv * e.bases[i]
		end
	end
	if n > 0 then
		workspace:BulkMoveTo(bulkParts, bulkCFrames, Enum.BulkMoveMode.FireCFrameChanged)
	end
end

-- Loop ----------------------------------------------------------------------------------------------

local function step(dt: number)
	local camPos = workspace.CurrentCamera.CFrame.Position
	snowPart.CFrame = CFrame.new(camPos)

	shaftAccum += dt
	if shaftAccum > 0.3 then
		shaftAccum = 0
		updateShafts(camPos)
	end

	updateGrade(camPos, dt)

	swayAccum += dt
	if swayAccum >= SWAY_INTERVAL then
		swayAccum = 0
		updateSway(camPos, os.clock())
	end
end

function EnvironmentFX.init()
	createSnow()
	createShafts()
	createGrade()

	CollectionService:GetInstanceAddedSignal("Sway"):Connect(function(model)
		task.defer(registerSway, model) -- wait for streamed descendants
	end)
	CollectionService:GetInstanceRemovedSignal("Sway"):Connect(function(model)
		swayModels[model] = nil
	end)
	for _, model in CollectionService:GetTagged("Sway") do
		registerSway(model)
	end

	RunService.RenderStepped:Connect(step)
end

return EnvironmentFX
