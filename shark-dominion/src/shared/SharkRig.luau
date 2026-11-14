--[[
	SharkRig
	Builds the TEMPORARY procedural shark rig used until a skinned shark MeshPart
	is available (see docs/ASSETS.md for the exact replacement spec).

	Structure (shark faces -Z, all visual parts massless / non-colliding):

	  Root (invisible physics root, owns LinearVelocity + AlignOrientation)
	   ├─ ColliderFront / ColliderBack   (invisible spheres: smooth sliding collisions)
	   └─ Torso ─┬─ Head ─┬─ Jaw            <- animated joints are Motor6Ds named *Joint
	             │        └─ Snout, eyes, gills, mouth (static)
	             ├─ PectoralL / PectoralR
	             ├─ Dorsal
	             └─ Tail1 ── Tail2 ── CaudalBase ── CaudalUpper / CaudalLower

	Every part stores BaseSize, every Motor6D BaseC0/BaseC1 and every Attachment
	BasePosition so applyScale() can resize the rig any number of times without
	drift. Parts tagged with a ColorRole attribute are recoloured per species.
]]

local SharkConfig = require(script.Parent.Config.SharkConfig)

local SharkRig = {}

SharkRig.COLLISION_GROUP = "Sharks"

local NO_FRICTION = PhysicalProperties.new(1, 0, 0, 100, 100)

local function basePart(name: string, size: Vector3, role: string?, className: string?): BasePart
	local p = Instance.new(className or "Part") :: BasePart
	p.Name = name
	p.Size = size
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Anchored = false
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Massless = true
	p.CastShadow = false
	p:SetAttribute("BaseSize", size)
	if role then
		p:SetAttribute("ColorRole", role)
	end
	return p
end

local function ellipsoid(name: string, size: Vector3, role: string?): BasePart
	local p = basePart(name, size, role)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere -- fills the part's box, so scaling Size scales the mesh
	mesh.Parent = p
	return p
end

local function wedge(name: string, size: Vector3, role: string?): BasePart
	return basePart(name, size, role, "WedgePart")
end

local function ball(name: string, diameter: number, role: string?): BasePart
	local p = basePart(name, Vector3.one * diameter, role)
	p.Shape = Enum.PartType.Ball
	return p
end

-- Creates a Motor6D and places part1 so the rig is already assembled before
-- it is parented to Workspace.
local function joint(name: string, part0: BasePart, part1: BasePart, c0: CFrame, c1: CFrame?): Motor6D
	local m = Instance.new("Motor6D")
	m.Name = name
	m.Part0 = part0
	m.Part1 = part1
	m.C0 = c0
	m.C1 = c1 or CFrame.identity
	m:SetAttribute("BaseC0", m.C0)
	m:SetAttribute("BaseC1", m.C1)
	part1.CFrame = part0.CFrame * m.C0 * m.C1:Inverse()
	m.Parent = part0
	return m
end

function SharkRig.build(speciesId: string?): Model
	local model = Instance.new("Model")
	model.Name = "Shark"

	-- Physics root ------------------------------------------------------------
	local root = basePart("Root", Vector3.new(1.6, 1.6, 1.6))
	root.Transparency = 1
	root.Massless = false
	root.CustomPhysicalProperties = NO_FRICTION
	root.RootPriority = 127
	root.CollisionGroup = SharkRig.COLLISION_GROUP
	root.CFrame = CFrame.identity
	root.Parent = model
	model.PrimaryPart = root

	local rootAttachment = Instance.new("Attachment")
	rootAttachment.Name = "RootAttachment"
	rootAttachment:SetAttribute("BasePosition", Vector3.zero)
	rootAttachment.Parent = root

	local function collider(name: string, diameter: number, z: number)
		local c = ball(name, diameter)
		c.Transparency = 1
		c.CanCollide = true
		c.CanQuery = true -- lets server-side queries (future PvP hit checks) find sharks
		c.CustomPhysicalProperties = NO_FRICTION
		c.CollisionGroup = SharkRig.COLLISION_GROUP
		c.Parent = model
		joint(name .. "Joint", root, c, CFrame.new(0, 0, z))
	end
	collider("ColliderFront", 2.4, -2.0)
	collider("ColliderBack", 2.0, 1.9)

	local function add(part: BasePart)
		part.Parent = model
		return part
	end

	-- Body ----------------------------------------------------------------------
	local torso = add(ellipsoid("Torso", Vector3.new(2.5, 2.4, 4.4), "Body"))
	torso.CastShadow = true
	joint("TorsoJoint", root, torso, CFrame.identity)

	local belly = add(ellipsoid("Belly", Vector3.new(2.2, 1.7, 4.1), "Belly"))
	joint("BellyJoint", torso, belly, CFrame.new(0, -0.42, 0.05))

	local dorsal = add(wedge("Dorsal", Vector3.new(0.22, 2.0, 2.0), "Fin"))
	joint("DorsalJoint", torso, dorsal, CFrame.new(0, 1.05, 0.25) * CFrame.Angles(math.rad(12), 0, 0), CFrame.new(0, -1.0, 0))
	local dorsalTip = add(wedge("DorsalTip", Vector3.new(0.24, 0.6, 0.6), "FinTip"))
	joint("DorsalTipJoint", dorsal, dorsalTip, CFrame.new(0, 0.72, 0.7))

	-- Pectoral fins: thin wedges laid out sideways, swept back
	local finL = add(wedge("PectoralL", Vector3.new(0.16, 1.9, 1.7), "Fin"))
	joint("PectoralLJoint", torso, finL, CFrame.new(-1.0, -0.65, -0.9) * CFrame.Angles(0, 0, math.rad(100)), CFrame.new(0, -0.95, 0))
	local finR = add(wedge("PectoralR", Vector3.new(0.16, 1.9, 1.7), "Fin"))
	joint("PectoralRJoint", torso, finR, CFrame.new(1.0, -0.65, -0.9) * CFrame.Angles(0, 0, math.rad(-100)), CFrame.new(0, -0.95, 0))

	-- Head ----------------------------------------------------------------------
	local head = add(ellipsoid("Head", Vector3.new(2.1, 1.85, 3.2), "Body"))
	joint("HeadJoint", torso, head, CFrame.new(0, 0.02, -1.75), CFrame.new(0, 0, 1.35))

	local headBelly = add(ellipsoid("HeadBelly", Vector3.new(1.8, 1.2, 2.8), "Belly"))
	joint("HeadBellyJoint", head, headBelly, CFrame.new(0, -0.42, 0.05))

	local snout = add(ellipsoid("Snout", Vector3.new(1.45, 1.05, 1.9), "Body"))
	joint("SnoutJoint", head, snout, CFrame.new(0, -0.12, -1.35) * CFrame.Angles(math.rad(-5), 0, 0))
	local snoutBelly = add(ellipsoid("SnoutBelly", Vector3.new(1.2, 0.6, 1.6), "Belly"))
	joint("SnoutBellyJoint", snout, snoutBelly, CFrame.new(0, -0.28, 0.05))

	local mouth = add(ellipsoid("Mouth", Vector3.new(1.35, 0.35, 1.8)))
	mouth.Color = Color3.fromRGB(122, 30, 42)
	joint("MouthJoint", head, mouth, CFrame.new(0, -0.6, -0.75))

	local upperTeeth = add(basePart("UpperTeeth", Vector3.new(1.15, 0.12, 1.3)))
	upperTeeth.Color = Color3.fromRGB(250, 250, 244)
	joint("UpperTeethJoint", head, upperTeeth, CFrame.new(0, -0.66, -0.95))

	local jaw = add(ellipsoid("Jaw", Vector3.new(1.55, 0.55, 2.1), "Belly"))
	joint("JawJoint", head, jaw, CFrame.new(0, -0.62, 0.35), CFrame.new(0, 0, 1.0))
	local lowerTeeth = add(basePart("LowerTeeth", Vector3.new(1.2, 0.12, 1.4)))
	lowerTeeth.Color = Color3.fromRGB(250, 250, 244)
	joint("LowerTeethJoint", jaw, lowerTeeth, CFrame.new(0, 0.22, -0.15))

	for _, side in { -1, 1 } do
		local eye = add(ball(if side < 0 then "EyeL" else "EyeR", 0.34))
		eye.Color = Color3.fromRGB(12, 12, 16)
		eye.Reflectance = 0.35
		joint(eye.Name .. "Joint", head, eye, CFrame.new(0.86 * side, 0.28, -0.75))

		for i = 0, 2 do
			local gill = add(basePart(`Gill{side}{i}`, Vector3.new(0.06, 0.75, 0.08), "Fin"))
			joint(gill.Name .. "Joint", head, gill, CFrame.new(0.9 * side, -0.05, 0.45 + i * 0.32) * CFrame.Angles(0, 0, math.rad(8 * side)))
		end
	end

	-- Tail chain ----------------------------------------------------------------
	local tail1 = add(ellipsoid("Tail1", Vector3.new(1.95, 1.9, 3.2), "Body"))
	joint("Tail1Joint", torso, tail1, CFrame.new(0, 0.05, 2.0), CFrame.new(0, 0, -1.45))
	local tailBelly = add(ellipsoid("TailBelly", Vector3.new(1.6, 1.2, 2.9), "Belly"))
	joint("TailBellyJoint", tail1, tailBelly, CFrame.new(0, -0.38, -0.1))

	local dorsal2 = add(wedge("Dorsal2", Vector3.new(0.16, 0.65, 0.7), "Fin"))
	joint("Dorsal2Joint", tail1, dorsal2, CFrame.new(0, 0.85, 0.8), CFrame.new(0, -0.32, 0))
	local anal = add(wedge("AnalFin", Vector3.new(0.14, 0.55, 0.6), "Fin"))
	joint("AnalFinJoint", tail1, anal, CFrame.new(0, -0.8, 0.9) * CFrame.Angles(0, 0, math.pi), CFrame.new(0, -0.27, 0))

	local tail2 = add(ellipsoid("Tail2", Vector3.new(1.1, 1.15, 2.6), "Body"))
	joint("Tail2Joint", tail1, tail2, CFrame.new(0, 0.05, 1.45), CFrame.new(0, 0, -1.15))

	local caudalBase = add(basePart("CaudalBase", Vector3.new(0.2, 0.2, 0.2)))
	caudalBase.Transparency = 1
	joint("CaudalJoint", tail2, caudalBase, CFrame.new(0, 0.1, 1.1))

	local upper = add(wedge("CaudalUpper", Vector3.new(0.16, 3.0, 1.5), "Fin"))
	joint("CaudalUpperJoint", caudalBase, upper, CFrame.fromMatrix(Vector3.zero, Vector3.xAxis, Vector3.new(0, 0.82, 0.57)), CFrame.new(0, -1.5, 0))
	local lower = add(wedge("CaudalLower", Vector3.new(0.16, 1.9, 1.2), "FinTip"))
	joint("CaudalLowerJoint", caudalBase, lower, CFrame.fromMatrix(Vector3.zero, Vector3.new(-1, 0, 0), Vector3.new(0, -0.8, 0.6)), CFrame.new(0, -0.95, 0))

	SharkRig.applySpecies(model, speciesId)
	return model
end

function SharkRig.applySpecies(model: Model, speciesId: string?)
	local colors = SharkConfig.getSpecies(speciesId).Colors
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			local role = d:GetAttribute("ColorRole")
			if role and colors[role] then
				d.Color = colors[role]
			end
		end
	end
	model:SetAttribute("Species", SharkConfig.getSpecies(speciesId).Id)
end

-- Uniformly rescales the rig around its root. Safe to call repeatedly.
function SharkRig.applyScale(model: Model, scale: number)
	local g = SharkConfig.Growth
	scale = math.clamp(scale, g.MinScale, g.MaxScale)

	-- Resizing never moves the root (the pivot), so a client-owned assembly is not
	-- teleported; joints re-solve the rest of the rig around it.
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			local baseSize = d:GetAttribute("BaseSize")
			if baseSize then
				d.Size = baseSize * scale
			end
		elseif d:IsA("Motor6D") then
			local c0: CFrame? = d:GetAttribute("BaseC0")
			local c1: CFrame? = d:GetAttribute("BaseC1")
			if c0 and c1 then
				d.C0 = CFrame.new(c0.Position * scale) * c0.Rotation
				d.C1 = CFrame.new(c1.Position * scale) * c1.Rotation
			end
		elseif d:IsA("Attachment") then
			local basePosition = d:GetAttribute("BasePosition")
			if basePosition then
				d.Position = basePosition * scale
			end
		end
	end

	model:SetAttribute("Scale", scale)
end

-- World-space mouth position (used by both the client hint and server validation).
function SharkRig.getMouthPosition(rootCFrame: CFrame, scale: number): Vector3
	local B = SharkConfig.Bite
	return (rootCFrame * CFrame.new(0, -B.MouthDrop * scale, -B.MouthOffset * scale)).Position
end

return SharkRig
