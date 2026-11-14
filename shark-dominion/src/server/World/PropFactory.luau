--[[
	PropFactory
	Procedural reef dressing built from primitives shaped into stylized organic
	forms (branching coral, brain coral, table coral, sea fans, tube sponges,
	anemones, kelp, seagrass, starfish, pebbles). These are a deliberate stylized
	art pass, not grey placeholder boxes, but docs/ASSETS.md lists the MeshPart
	replacements a final art pass should use.

	Placement is clustered (reef patches, meadow, forest, ledge garden) for
	composition instead of uniform noise. Everything is anchored, non-colliding,
	non-queryable and shadowless for performance. Models that should sway are
	tagged "Sway" and animated on the client (EnvironmentFX).
]]

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage.Shared.Config.GameConfig)
local MathUtil = require(ReplicatedStorage.Shared.Util.MathUtil)

local PropFactory = {}

local Mat = Enum.Material
local rgb = Color3.fromRGB

local CORAL_COLORS = {
	rgb(255, 112, 150),
	rgb(255, 146, 72),
	rgb(168, 96, 226),
	rgb(250, 210, 92),
	rgb(64, 204, 184),
	rgb(240, 84, 96),
}
local FAN_COLORS = { rgb(160, 60, 180), rgb(220, 70, 110), rgb(250, 150, 60) }
local SPONGE_COLORS = { rgb(236, 124, 58), rgb(172, 82, 196), rgb(220, 200, 80) }
local GRASS_COLORS = { rgb(92, 168, 84), rgb(66, 140, 76), rgb(124, 176, 70) }
local KELP_COLORS = { rgb(112, 142, 52), rgb(138, 150, 60), rgb(96, 126, 48) }
local ANEMONE_COLORS = { rgb(255, 168, 210), rgb(190, 240, 140), rgb(255, 214, 150) }

local function pick(rng: Random, list)
	return list[rng:NextInteger(1, #list)]
end

local function newModel(name: string, parent: Instance): Model
	local m = Instance.new("Model")
	m.Name = name
	m.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
	m.Parent = parent
	return m
end

local function part(parent: Instance, size: Vector3, cf: CFrame, color: Color3, material: Enum.Material?): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Mat.SmoothPlastic
	p.Parent = parent
	return p
end

local function ellipsoid(parent, size, cf, color, material)
	local p = part(parent, size, cf, color, material)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere
	mesh.Parent = p
	return p
end

local function ballPart(parent, diameter, position, color, material)
	local p = part(parent, Vector3.one * diameter, CFrame.new(position), color, material)
	p.Shape = Enum.PartType.Ball
	return p
end

local function cylinderBetween(parent, a: Vector3, b: Vector3, radius: number, color, material)
	local length = (b - a).Magnitude
	local p = part(parent, Vector3.new(length, radius * 2, radius * 2), MathUtil.axisCFrame((a + b) / 2, b - a), color, material)
	p.Shape = Enum.PartType.Cylinder
	return p
end

-- Upright cylinder (disc / stem) centred at cf, with height along cf.UpVector.
local function verticalCylinder(parent, cf: CFrame, height: number, radius: number, color, material)
	local p = part(parent, Vector3.new(height, radius * 2, radius * 2), cf * CFrame.Angles(0, 0, math.pi / 2), color, material)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local function markSway(model: Model, base: CFrame, amplitude: number, frequency: number, height: number)
	model:SetAttribute("SwayPivot", base)
	model:SetAttribute("SwayAmplitude", amplitude)
	model:SetAttribute("SwayFrequency", frequency)
	model:SetAttribute("SwayHeight", height)
	CollectionService:AddTag(model, "Sway")
end

-- Builders --------------------------------------------------------------------
-- Each builder receives a ground frame (Y = surface normal-ish) and an rng.

local Builders = {}

function Builders.Staghorn(parent, base: CFrame, rng: Random)
	local model = newModel("StaghornCoral", parent)
	local color = pick(rng, CORAL_COLORS)
	local tipColor = color:Lerp(Color3.new(1, 1, 1), 0.4)
	local size = rng:NextNumber(0.8, 1.35)

	local function grow(origin: Vector3, dir: Vector3, length: number, radius: number, depth: number)
		local tip = origin + dir * length
		cylinderBetween(model, origin, tip, radius, color)
		if depth == 0 then
			ballPart(model, radius * 2.3, tip, tipColor)
			return
		end
		for _ = 1, rng:NextInteger(2, 3) do
			local nd = (dir + MathUtil.randomUnit(rng) * 0.8 + base.UpVector * 0.45).Unit
			grow(tip, nd, length * rng:NextNumber(0.62, 0.82), radius * 0.72, depth - 1)
		end
	end

	for t = 1, rng:NextInteger(3, 4) do
		local dir = base:VectorToWorldSpace((Vector3.yAxis + MathUtil.randomUnit(rng) * 0.65).Unit)
		local depth = if t == 1 and rng:NextNumber() < 0.5 then 2 else 1
		grow(base.Position, dir, rng:NextNumber(1.8, 2.8) * size, 0.4 * size, depth)
	end
	return model
end

function Builders.Brain(parent, base: CFrame, rng: Random)
	local model = newModel("BrainCoral", parent)
	local color = pick(rng, { rgb(214, 186, 92), rgb(150, 190, 110), rgb(196, 120, 150) })
	local d = rng:NextNumber(2.6, 5.2)
	ballPart(model, d, (base * CFrame.new(0, d * 0.22, 0)).Position, color, Mat.Cobblestone)
	if rng:NextNumber() < 0.6 then
		local d2 = d * rng:NextNumber(0.5, 0.7)
		ballPart(model, d2, (base * CFrame.new(d * 0.5, d2 * 0.15, rng:NextNumber(-0.5, 0.5))).Position, color:Lerp(rgb(255, 255, 255), 0.12), Mat.Cobblestone)
	end
	return model
end

function Builders.Table(parent, base: CFrame, rng: Random)
	local model = newModel("TableCoral", parent)
	local color = pick(rng, { rgb(96, 180, 150), rgb(170, 160, 90), rgb(120, 150, 200) })
	local stem = rng:NextNumber(1.4, 2.6)
	local d = rng:NextNumber(5, 9)
	verticalCylinder(model, base * CFrame.new(0, stem / 2, 0), stem, 0.4, color:Lerp(rgb(80, 70, 60), 0.3))
	verticalCylinder(model, base * CFrame.new(0, stem, 0), 0.45, d / 2, color)
	verticalCylinder(model, base * CFrame.new(rng:NextNumber(-0.6, 0.6), stem + 0.4, rng:NextNumber(-0.6, 0.6)), 0.35, d * 0.32, color:Lerp(rgb(255, 255, 255), 0.25))
	return model
end

function Builders.Fan(parent, base: CFrame, rng: Random)
	local model = newModel("SeaFan", parent)
	local color = pick(rng, FAN_COLORS)
	local h = rng:NextNumber(3.5, 6)
	local w = h * rng:NextNumber(0.8, 1.1)
	local frame = base * CFrame.Angles(0, rng:NextNumber(0, math.pi * 2), 0)
	verticalCylinder(model, frame * CFrame.new(0, 0.5, 0), 1, 0.18, color:Lerp(rgb(60, 40, 40), 0.4))
	for i = -1, 1 do
		ellipsoid(
			model,
			Vector3.new(0.12, h * (1 - math.abs(i) * 0.2), w * 0.55),
			frame * CFrame.new(0, h * 0.5 + 0.6, i * w * 0.28) * CFrame.Angles(i * 0.18, 0, 0),
			color:Lerp(rgb(255, 255, 255), math.abs(i) * 0.1)
		)
	end
	markSway(model, frame, 0.05, 0.6, h + 1)
	return model
end

function Builders.Sponge(parent, base: CFrame, rng: Random)
	local model = newModel("TubeSponge", parent)
	local color = pick(rng, SPONGE_COLORS)
	local dark = color:Lerp(rgb(30, 20, 20), 0.6)
	for _ = 1, rng:NextInteger(3, 5) do
		local h = rng:NextNumber(2, 5)
		local r = rng:NextNumber(0.5, 0.85)
		local offset = CFrame.new(rng:NextNumber(-1.4, 1.4), 0, rng:NextNumber(-1.4, 1.4)) * CFrame.Angles(rng:NextNumber(-0.15, 0.15), 0, rng:NextNumber(-0.15, 0.15))
		local cf = base * offset
		verticalCylinder(model, cf * CFrame.new(0, h / 2, 0), h, r, color)
		verticalCylinder(model, cf * CFrame.new(0, h - 0.02, 0), 0.1, r * 0.72, dark)
	end
	return model
end

function Builders.Anemone(parent, base: CFrame, rng: Random)
	local model = newModel("Anemone", parent)
	local color = pick(rng, ANEMONE_COLORS)
	local baseColor = color:Lerp(rgb(150, 60, 90), 0.5)
	verticalCylinder(model, base * CFrame.new(0, 0.4, 0), 0.8, 0.95, baseColor)
	local top = base * CFrame.new(0, 0.8, 0)
	local count = 12
	for i = 1, count do
		local a = (i / count) * math.pi * 2 + rng:NextNumber(-0.2, 0.2)
		local ring = top * CFrame.new(math.cos(a) * 0.6, 0, math.sin(a) * 0.6)
		local dir = top:VectorToWorldSpace(Vector3.new(math.cos(a) * 0.55, 1, math.sin(a) * 0.55).Unit)
		local len = rng:NextNumber(1.4, 2.0)
		cylinderBetween(model, ring.Position, ring.Position + dir * len, 0.13, color)
	end
	markSway(model, base, 0.2, 1.4, 3)
	return model, top.Position + base.UpVector * 1.2
end

function Builders.Seagrass(parent, base: CFrame, rng: Random)
	local model = newModel("Seagrass", parent)
	local maxH = 0
	for _ = 1, rng:NextInteger(5, 7) do
		local h = rng:NextNumber(2.5, 5)
		maxH = math.max(maxH, h)
		local cf = base
			* CFrame.new(rng:NextNumber(-1.2, 1.2), 0, rng:NextNumber(-1.2, 1.2))
			* CFrame.Angles(rng:NextNumber(-0.25, 0.25), rng:NextNumber(0, math.pi), rng:NextNumber(-0.25, 0.25))
		part(model, Vector3.new(0.06, h, 0.32), cf * CFrame.new(0, h / 2, 0), pick(rng, GRASS_COLORS))
	end
	markSway(model, base, 0.22, 0.9, maxH)
	return model
end

function Builders.Kelp(parent, base: CFrame, rng: Random)
	local model = newModel("Kelp", parent)
	local color = pick(rng, KELP_COLORS)
	local maxHeight = (GameConfig.WATER_SURFACE_Y - 6) - base.Position.Y
	local height = math.min(rng:NextNumber(26, 44), maxHeight)
	if height < 8 then
		return model
	end
	local segments = 6
	local segLen = height / segments
	local p = base.Position
	local dir = Vector3.yAxis
	local bend = Vector3.new(rng:NextNumber(-0.12, 0.12), 0, rng:NextNumber(-0.12, 0.12))
	for s = 1, segments do
		dir = (dir + bend).Unit
		local nextP = p + dir * segLen
		cylinderBetween(model, p, nextP, 0.22 * (1 - s * 0.06), color)
		local a = rng:NextNumber(0, math.pi * 2)
		local out = Vector3.new(math.cos(a), -0.35, math.sin(a)).Unit
		local leafCF = CFrame.lookAt(nextP + out * 1.6, nextP + out * 3.2)
		ellipsoid(model, Vector3.new(0.08, 0.9, 3.2), leafCF, color:Lerp(rgb(200, 190, 80), 0.15))
		if s % 3 == 0 then
			ballPart(model, 0.55, nextP, rgb(196, 170, 70))
		end
		p = nextP
	end
	markSway(model, base, 0.07, 0.45, height)
	return model
end

function Builders.Starfish(parent, base: CFrame, rng: Random)
	local model = newModel("Starfish", parent)
	local color = pick(rng, { rgb(250, 120, 60), rgb(220, 60, 80), rgb(150, 90, 210) })
	local s = rng:NextNumber(0.8, 1.4)
	local frame = base * CFrame.Angles(0, rng:NextNumber(0, math.pi * 2), 0) * CFrame.new(0, 0.12 * s, 0)
	ballPart(model, 0.55 * s, frame.Position, color)
	for i = 1, 5 do
		local a = (i / 5) * math.pi * 2
		ellipsoid(model, Vector3.new(0.3 * s, 0.14 * s, 1.1 * s), frame * CFrame.Angles(0, a, 0) * CFrame.new(0, 0, -0.5 * s), color)
	end
	return model
end

function Builders.Pebbles(parent, base: CFrame, rng: Random)
	local model = newModel("Pebbles", parent)
	for _ = 1, rng:NextInteger(3, 5) do
		local d = rng:NextNumber(0.4, 1.3)
		local pos = (base * CFrame.new(rng:NextNumber(-2, 2), d * 0.2, rng:NextNumber(-2, 2))).Position
		ballPart(model, d, pos, pick(rng, { rgb(150, 146, 140), rgb(120, 118, 124), rgb(196, 186, 168) }), Mat.Rock)
	end
	return model
end

-- Placement -------------------------------------------------------------------

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Include
rayParams.IgnoreWater = true

local function surfaceAt(x: number, z: number)
	local origin = Vector3.new(x, GameConfig.WATER_SURFACE_Y + 10, z)
	local result = workspace:Raycast(origin, Vector3.new(0, -240, 0), rayParams)
	if result then
		return result.Position, result.Normal
	end
	return nil, nil
end

local function groundFrame(position: Vector3, normal: Vector3, rng: Random, align: number): CFrame
	local up = Vector3.yAxis:Lerp(normal, align).Unit
	local yaw = rng:NextNumber(0, math.pi * 2)
	local fwd = Vector3.new(math.sin(yaw), 0, math.cos(yaw))
	local right = fwd:Cross(up)
	if right.Magnitude < 1e-3 then
		right = Vector3.xAxis
	end
	return CFrame.fromMatrix(position, right.Unit, up)
end

local function weightedPick(rng: Random, weights)
	local total = 0
	for _, w in weights do
		total += w[2]
	end
	local r = rng:NextNumber(0, total)
	for _, w in weights do
		r -= w[2]
		if r <= 0 then
			return w[1]
		end
	end
	return weights[1][1]
end

local function scatter(rng: Random, center: Vector3, radius: number): (number, number)
	local a = rng:NextNumber(0, math.pi * 2)
	local d = math.sqrt(rng:NextNumber()) * radius
	return center.X + math.cos(a) * d, center.Z + math.sin(a) * d
end

function PropFactory.populate(meta)
	local started = os.clock()
	local rng = Random.new(GameConfig.WORLD_SEED + 101)
	rayParams.FilterDescendantsInstances = { workspace.Terrain }

	local root = workspace:FindFirstChild("Reef")
	if root then
		root:Destroy()
	end
	root = Instance.new("Folder")
	root.Name = "Reef"
	root.Parent = workspace

	local corals = Instance.new("Folder")
	corals.Name = "Corals"
	corals.Parent = root
	local vegetation = Instance.new("Folder")
	vegetation.Name = "Vegetation"
	vegetation.Parent = root
	local decor = Instance.new("Folder")
	decor.Name = "Decor"
	decor.Parent = root

	local anemones = {}
	local patches = {}
	local count = 0

	local function place(builderName: string, folder: Instance, x: number, z: number, minNormalY: number, align: number)
		local pos, normal = surfaceAt(x, z)
		if not pos or normal.Y < minNormalY then
			return nil
		end
		count += 1
		local model, extra = Builders[builderName](folder, groundFrame(pos, normal, rng, align), rng)
		if builderName == "Anemone" and extra then
			table.insert(anemones, extra)
		end
		return model
	end

	-- Reef patches on the plateau (dense, mixed coral gardens)
	local patchWeights = {
		{ "Staghorn", 3 },
		{ "Brain", 2 },
		{ "Table", 1.6 },
		{ "Fan", 2 },
		{ "Sponge", 2 },
		{ "Anemone", 1.1 },
		{ "Seagrass", 1 },
	}
	for _ = 1, 16 do
		local x, z = scatter(rng, meta.plateauCenter, 125)
		local pos, normal = surfaceAt(x, z)
		if pos and normal.Y > 0.6 then
			table.insert(patches, pos)
			place("Anemone", corals, x + rng:NextNumber(-3, 3), z + rng:NextNumber(-3, 3), 0.55, 0.7)
			for _ = 1, rng:NextInteger(6, 9) do
				local px, pz = scatter(rng, pos, 15)
				local name = weightedPick(rng, patchWeights)
				place(name, if name == "Seagrass" then vegetation else corals, px, pz, 0.55, 0.7)
			end
		end
		task.wait() -- yield between patches to keep the server responsive
	end

	-- Seagrass meadow
	for _ = 1, 70 do
		local x, z = scatter(rng, meta.meadow.Center, meta.meadow.Radius)
		place("Seagrass", vegetation, x, z, 0.7, 0.8)
	end
	task.wait()

	-- Kelp forest
	for _ = 1, 24 do
		local x, z = scatter(rng, meta.kelpForest.Center, meta.kelpForest.Radius)
		place("Kelp", vegetation, x, z, 0.75, 0)
	end
	task.wait()

	-- Ledge garden along the drop-off rim
	for _ = 1, 18 do
		local x, z = 150 + rng:NextNumber(0, 40), rng:NextNumber(-300, 300)
		place(if rng:NextNumber() < 0.55 then "Fan" else "Sponge", corals, x, z, 0.5, 0.6)
	end

	-- Lagoon decor
	for _ = 1, 22 do
		local x, z = scatter(rng, meta.plateauCenter, 300)
		place("Starfish", decor, x, z, 0.8, 1)
	end
	for _ = 1, 30 do
		local x, z = scatter(rng, meta.plateauCenter, 310)
		place("Pebbles", decor, x, z, 0.6, 1)
	end
	for _ = 1, 10 do
		local x, z = scatter(rng, meta.plateauCenter, 280)
		place("Brain", corals, x, z, 0.7, 0.8)
	end

	meta.anemones = anemones
	for _, p in patches do
		table.insert(meta.zones.Reef, { Center = Vector3.new(p.X, 0, p.Z), Radius = 22 })
	end
	if #meta.zones.Reef == 0 then
		table.insert(meta.zones.Reef, { Center = meta.plateauCenter, Radius = 100 })
	end

	local parts = 0
	for _, d in root:GetDescendants() do
		if d:IsA("BasePart") then
			parts += 1
		end
	end
	print(`[PropFactory] {count} props ({parts} parts), {#anemones} anemones, {#patches} reef patches in {string.format("%.2f", os.clock() - started)}s`)
end

return PropFactory
