--[[
	FishRenderer
	Client-side visuals for server-simulated fish.

	  * Receives the static roster once (fish id -> type id) and quantized
	    position snapshots ~10x per second (only fish near this player).
	  * Interpolates between the last two snapshots with a small render delay so
	    motion stays smooth despite the network rate.
	  * Visual models are pooled per type: acquired when a fish becomes relevant,
	    released when it is eaten or leaves the relevance radius.
	  * All fish parts are moved with one workspace:BulkMoveTo call per frame.
	  * Tail wag / body wiggle only inside FISH_DETAIL_RADIUS (distance LOD).
]]

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local FishConfig = require(Shared.Config.FishConfig)
local FishCodec = require(Shared.Net.FishCodec)
local Remotes = require(Shared.Net.Remotes)
local Signal = require(Shared.Util.Signal)

local FishRenderer = {}
FishRenderer.FishEaten = Signal.new() -- (fishId, position, typeId, eaterUserId)

local STALE_AFTER = 0.6 -- seconds without a snapshot before a fish is hidden
local SNAP_DISTANCE = 25 -- a jump this large is a respawn, not movement

local fishData = {} -- [id] = record
local templates = {} -- [typeId] = { model, specs }
local pools = {} -- [typeId] = { visual }
local container: Folder
local bulkParts, bulkCFrames = {}, {}
local rng = Random.new()

local function makePart(spec, length: number): BasePart
	local p = Instance.new("Part")
	p.Name = spec.Name
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Size = spec.Size * length
	p.Color = spec.Color
	p.Material = spec.Material or Enum.Material.SmoothPlastic
	p.Reflectance = spec.Reflectance or 0
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if spec.Shape == "Ball" then
		p.Shape = Enum.PartType.Ball
	else
		local mesh = Instance.new("SpecialMesh")
		mesh.MeshType = Enum.MeshType.Sphere
		mesh.Parent = p
	end
	return p
end

local function buildTemplate(typeId: number)
	local cfg = FishConfig.get(typeId)
	local length = cfg.Length
	local model = Instance.new("Model")
	model.Name = cfg.Id
	local specs = {}
	for _, spec in cfg.Visual.Parts do
		makePart(spec, length).Parent = model
		local offset = spec.Offset * length
		local pivot = offset - Vector3.new(0, 0, spec.Size.Z * length * 0.5)
		table.insert(specs, {
			name = spec.Name,
			wag = spec.Wag == true,
			offset = CFrame.new(offset),
			pivot = CFrame.new(pivot),
			fromPivot = CFrame.new(offset - pivot),
		})
	end
	templates[typeId] = { model = model, specs = specs }
	pools[typeId] = {}
end

local function acquire(typeId: number)
	local visual = table.remove(pools[typeId])
	if not visual then
		local template = templates[typeId]
		local model = template.model:Clone()
		local parts = {}
		for i, spec in template.specs do
			parts[i] = model:FindFirstChild(spec.name)
		end
		visual = { model = model, parts = parts, specs = template.specs }
	end
	visual.model.Parent = container
	return visual
end

local function release(f)
	local visual = f.visual
	if visual then
		f.visual = nil
		visual.model.Parent = nil
		table.insert(pools[f.typeId], visual)
	end
end

local function resetTrack(f)
	f.t0, f.t1, f.p0, f.p1 = nil, nil, nil, nil
end

local function onRoster(types)
	if type(types) ~= "table" then
		return
	end
	for _, f in fishData do
		release(f)
	end
	table.clear(fishData)
	for id, typeId in types do
		if type(id) == "number" and FishConfig.get(typeId) then
			fishData[id] = {
				id = id,
				typeId = typeId,
				cfg = FishConfig.get(typeId),
				phase = rng:NextNumber(0, math.pi * 2),
				look = Vector3.new(0, 0, -1),
				lastSeen = 0,
				speed = 0,
			}
		end
	end
end

local function onSnapshot(b)
	local clock = os.clock()
	FishCodec.decode(b, function(serverTime, id, pos)
		local f = fishData[id]
		if not f then
			return
		end
		if not f.t1 or serverTime - f.t1 > 1 or (pos - f.p1).Magnitude > SNAP_DISTANCE then
			f.p0, f.t0 = pos, serverTime - 0.1
			f.p1, f.t1 = pos, serverTime
			f.renderPos = pos
		elseif serverTime > f.t1 then
			f.p0, f.t0 = f.p1, f.t1
			f.p1, f.t1 = pos, serverTime
		end
		f.lastSeen = clock
	end)
end

local function onEaten(id, position, typeId, eaterUserId)
	local f = fishData[id]
	if f then
		resetTrack(f)
		release(f)
	end
	if typeof(position) == "Vector3" then
		FishRenderer.FishEaten:Fire(id, position, typeId, eaterUserId)
	end
end

local function render(dt: number)
	local camera = workspace.CurrentCamera
	local camPos = camera.CFrame.Position
	local renderTime = workspace:GetServerTimeNow() - GameConfig.FISH_INTERP_DELAY
	local clock = os.clock()
	local detailRadius = GameConfig.FISH_DETAIL_RADIUS
	local lookAlpha = 1 - math.exp(-8 * dt)

	table.clear(bulkParts)
	table.clear(bulkCFrames)
	local n = 0

	for _, f in fishData do
		if not f.t1 then
			continue
		end
		if clock - f.lastSeen > STALE_AFTER then
			resetTrack(f)
			release(f)
			continue
		end

		local span = f.t1 - f.t0
		local pos
		if span > 1e-4 then
			local alpha = math.clamp((renderTime - f.t0) / span, 0, 1.35)
			pos = f.p0:Lerp(f.p1, alpha)
		else
			pos = f.p1
		end
		f.renderPos = pos

		local travel = f.p1 - f.p0
		f.speed = if span > 1e-4 then travel.Magnitude / span else 0
		if travel.Magnitude > 0.05 then
			local target = travel.Unit
			target = Vector3.new(target.X, math.clamp(target.Y, -0.6, 0.6), target.Z)
			local blended = f.look:Lerp(target, lookAlpha)
			if blended.Magnitude > 1e-3 then
				f.look = blended.Unit
			end
		end

		local visual = f.visual
		if not visual then
			visual = acquire(f.typeId)
			f.visual = visual
		end

		local cfg = f.cfg
		local detailed = (pos - camPos).Magnitude < detailRadius
		local wag = 0
		if detailed then
			local speedFactor = math.clamp(f.speed / cfg.Speed, 0.35, 2.2)
			f.phase += dt * cfg.WagFrequency * speedFactor * math.pi * 2
			wag = math.sin(f.phase) * cfg.WagAmplitude
		end

		local body = CFrame.lookAt(pos, pos + f.look) * CFrame.Angles(0, -wag * 0.2, 0)
		for i, spec in visual.specs do
			n += 1
			bulkParts[n] = visual.parts[i]
			if spec.wag then
				bulkCFrames[n] = body * spec.pivot * CFrame.Angles(0, wag, 0) * spec.fromPivot
			else
				bulkCFrames[n] = body * spec.offset
			end
		end
	end

	if n > 0 then
		workspace:BulkMoveTo(bulkParts, bulkCFrames, Enum.BulkMoveMode.FireCFrameChanged)
	end
end

-- Queries ----------------------------------------------------------------------------

-- Best visible fish in front of `origin` within `maxRange`. Returns id, position, typeId, distance.
function FishRenderer.findTarget(origin: Vector3, look: Vector3, maxRange: number)
	local bestId, bestPos, bestType, bestScore = nil, nil, nil, math.huge
	for id, f in fishData do
		local pos = f.visual and f.renderPos
		if pos then
			local offset = pos - origin
			local dist = offset.Magnitude
			if dist <= maxRange then
				local facing = if dist > 1e-3 then offset:Dot(look) / dist else 1
				if facing > -0.15 then
					local score = dist * (1.6 - facing * 0.6) -- prefer fish straight ahead
					if score < bestScore then
						bestId, bestPos, bestType, bestScore = id, pos, f.typeId, score
					end
				end
			end
		end
	end
	if bestId then
		return bestId, bestPos, bestType, (bestPos - origin).Magnitude
	end
	return nil
end

function FishRenderer.getBodyPart(id: number): BasePart?
	local f = fishData[id]
	return f and f.visual and f.visual.parts[1]
end

function FishRenderer.init()
	container = Instance.new("Folder")
	container.Name = "ClientFish"
	container.Parent = workspace

	for typeId in FishConfig.Types do
		buildTemplate(typeId)
	end

	Remotes.get("FishRoster").OnClientEvent:Connect(onRoster)
	Remotes.get("FishSnapshot").OnClientEvent:Connect(onSnapshot)
	Remotes.get("FishEaten").OnClientEvent:Connect(onEaten)

	task.spawn(function()
		while not ReplicatedStorage:GetAttribute("WorldReady") do
			ReplicatedStorage:GetAttributeChangedSignal("WorldReady"):Wait()
		end
		Remotes.get("ClientReady"):FireServer()
	end)

	RunService.RenderStepped:Connect(render)
end

return FishRenderer
