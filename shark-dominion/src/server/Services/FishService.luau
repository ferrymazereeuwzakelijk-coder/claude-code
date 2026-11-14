--[[
	FishService
	Server-authoritative fish simulation. Fish are pure data on the server (no
	Instances, no physics), which keeps hundreds of fish cheap and makes bite
	validation exact. Clients render pooled visuals from quantized snapshots.

	Performance:
	  * Fixed-rate simulation (GameConfig.FISH_SIM_RATE).
	  * Distance LOD: fish farther than FISH_NEAR_DISTANCE from every shark only
	    update every FISH_FAR_UPDATE_INTERVAL seconds and skip separation.
	  * Boids neighbour work is limited to a fish's own school.
	  * Rock avoidance uses a coarse spatial grid.
	  * Replication is per player, relevance-filtered (FISH_RELEVANCE_RADIUS),
	    8 bytes per fish over an UnreliableRemoteEvent.
	  * Fish ids are permanent slots: eaten fish are pooled and respawn in place
	    of themselves, so the client roster never changes.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local GameConfig = require(Shared.Config.GameConfig)
local FishConfig = require(Shared.Config.FishConfig)
local SharkConfig = require(Shared.Config.SharkConfig)
local Remotes = require(Shared.Net.Remotes)
local FishCodec = require(Shared.Net.FishCodec)
local MathUtil = require(Shared.Util.MathUtil)

local SharkService = require(script.Parent.SharkService)
local RemoteGuard = require(script.Parent.RemoteGuard)

local FishService = {}

local SURFACE = GameConfig.WATER_SURFACE_Y
local ROCK_GRID = 32

local fishList = {} -- array indexed by fish id
local schools = {}
local rosterTypes = {} -- [id] = typeId
local rockGrid = {}
local heightAt: (number, number) -> number
local zones
local rng = Random.new(GameConfig.WORLD_SEED + 202)

local function gridKey(cx: number, cz: number): number
	return cx * 4096 + cz
end

local function buildRockGrid(rocks)
	for _, rock in rocks do
		local reach = rock.R + 4
		for cx = math.floor((rock.C.X - reach) / ROCK_GRID), math.floor((rock.C.X + reach) / ROCK_GRID) do
			for cz = math.floor((rock.C.Z - reach) / ROCK_GRID), math.floor((rock.C.Z + reach) / ROCK_GRID) do
				local key = gridKey(cx, cz)
				local cell = rockGrid[key]
				if not cell then
					cell = {}
					rockGrid[key] = cell
				end
				table.insert(cell, rock)
			end
		end
	end
end

local function randomPointInZone(zone, cfg): Vector3
	local a = rng:NextNumber(0, math.pi * 2)
	local d = math.sqrt(rng:NextNumber()) * zone.Radius
	local x = zone.Center.X + math.cos(a) * d
	local z = zone.Center.Z + math.sin(a) * d
	local ground = heightAt(x, z)
	local band = cfg.HeightAboveFloor
	local y = math.min(ground + rng:NextNumber(band[1], band[2]), SURFACE - 4)
	return Vector3.new(x, y, z)
end

local function newFish(typeId: number, cfg, position: Vector3)
	local id = #fishList + 1
	local fish = {
		id = id,
		typeId = typeId,
		cfg = cfg,
		pos = position,
		vel = MathUtil.randomUnit(rng) * cfg.Speed * 0.5,
		alive = true,
		respawnAt = 0,
		school = nil,
		zone = nil,
		home = nil,
		wanderTarget = position,
		nextWanderAt = 0,
		restUntil = 0,
		fleeUntil = 0,
		lodAccum = rng:NextNumber(0, GameConfig.FISH_FAR_UPDATE_INTERVAL),
	}
	fishList[id] = fish
	rosterTypes[id] = typeId
	return fish
end

local function spawnPopulation(anemones)
	for typeId, cfg in FishConfig.Types do
		local zoneList = zones[cfg.Zone] or zones.Open
		if cfg.Behavior == "School" or cfg.Behavior == "Cruiser" then
			for _ = 1, cfg.SchoolCount do
				local zone = zoneList[rng:NextInteger(1, #zoneList)]
				local target = randomPointInZone(zone, cfg)
				local school = {
					typeId = typeId,
					cfg = cfg,
					zone = zone,
					members = {},
					target = target,
					nextRetarget = 0,
					centroid = target,
					avgVel = Vector3.zero,
					patrolAngle = rng:NextNumber(0, math.pi * 2),
					patrolDir = if rng:NextNumber() < 0.5 then -1 else 1,
				}
				table.insert(schools, school)
				for _ = 1, rng:NextInteger(cfg.SchoolSize[1], cfg.SchoolSize[2]) do
					local fish = newFish(typeId, cfg, target + MathUtil.randomUnit(rng) * rng:NextNumber(1, 6))
					fish.school = school
					fish.zone = zone
					table.insert(school.members, fish)
				end
			end
		elseif cfg.Behavior == "Home" then
			local homes = math.min(#anemones, cfg.MaxHomes)
			for h = 1, homes do
				local home = anemones[h]
				for _ = 1, cfg.PerHome do
					local fish = newFish(typeId, cfg, home + MathUtil.randomUnit(rng) * 2)
					fish.home = home
				end
			end
		elseif cfg.Behavior == "Bottom" then
			for _ = 1, cfg.Count do
				local zone = zoneList[rng:NextInteger(1, #zoneList)]
				local fish = newFish(typeId, cfg, randomPointInZone(zone, cfg))
				fish.zone = zone
			end
		end
	end
end

-- Simulation ----------------------------------------------------------------------

local function updateSchools(dt: number, now: number)
	for _, school in schools do
		local sum, vsum, n = Vector3.zero, Vector3.zero, 0
		for _, m in school.members do
			if m.alive then
				sum += m.pos
				vsum += m.vel
				n += 1
			end
		end
		if n > 0 then
			school.centroid = sum / n
			school.avgVel = vsum / n
		end

		local cfg = school.cfg
		if cfg.Behavior == "Cruiser" then
			-- Patrol a wide loop around the zone
			school.patrolAngle += school.patrolDir * dt * cfg.Speed / (school.zone.Radius * 0.7)
			local c = school.zone.Center
			local r = school.zone.Radius * 0.7
			local x = c.X + math.cos(school.patrolAngle) * r
			local z = c.Z + math.sin(school.patrolAngle) * r
			local ground = heightAt(x, z)
			local mid = (cfg.HeightAboveFloor[1] + cfg.HeightAboveFloor[2]) / 2
			school.target = Vector3.new(x, math.min(ground + mid, SURFACE - 6), z)
		elseif now >= school.nextRetarget or (school.centroid - school.target).Magnitude < 10 then
			school.target = randomPointInZone(school.zone, cfg)
			school.nextRetarget = now + rng:NextNumber(8, 16)
		end
	end
end

local function steerEnvironment(f, pos: Vector3, desired: Vector3): Vector3
	local cfg = f.cfg
	local ground = heightAt(pos.X, pos.Z)
	local minY = ground + cfg.HeightAboveFloor[1]
	if pos.Y < ground + 1.2 then
		desired += Vector3.yAxis * 3
	elseif pos.Y < minY then
		desired += Vector3.yAxis * ((minY - pos.Y) / 4)
	end
	if pos.Y > SURFACE - 3 then
		desired -= Vector3.yAxis * 2
	end

	local cell = rockGrid[gridKey(math.floor(pos.X / ROCK_GRID), math.floor(pos.Z / ROCK_GRID))]
	if cell then
		for _, rock in cell do
			local d = pos - rock.C
			local dist = d.Magnitude
			local clearance = rock.R + 3
			if dist < clearance and dist > 1e-3 then
				desired += (d / dist) * ((clearance - dist) / 3) * 2
			end
		end
	end
	return desired
end

local function stepFish(f, dt: number, now: number, sharks, detailed: boolean)
	local cfg = f.cfg
	local pos = f.pos

	-- Threats
	local flee = Vector3.zero
	for _, s in sharks do
		local d = pos - s.position
		local dist = d.Magnitude
		local radius = cfg.FleeRadius * (0.75 + 0.25 * s.scale) * (if s.boosting then 1.3 else 1)
		if dist < radius and dist > 1e-3 then
			flee += (d / dist) * (1 - dist / radius)
		end
	end
	if flee.Magnitude > 0 then
		f.fleeUntil = now + 0.9
	end
	local fleeing = now < f.fleeUntil
	local fleeDir = MathUtil.safeUnit(flee, Vector3.zero) -- zero once the threat is gone but the panic timer runs
	local speed = if fleeing then cfg.FleeSpeed else cfg.Speed
	local desired = Vector3.zero
	local behavior = cfg.Behavior

	if behavior == "School" or behavior == "Cruiser" then
		local school = f.school
		desired += (school.centroid - pos) * (cfg.Cohesion / 8)
		if school.avgVel.Magnitude > 0.1 then
			desired += school.avgVel.Unit * cfg.Alignment
		end
		desired += MathUtil.safeUnit(school.target - pos, Vector3.zero) * cfg.Seek
		if detailed then
			local sepDist = cfg.SeparationDistance
			for _, m in school.members do
				if m ~= f and m.alive then
					local d = pos - m.pos
					local dist = d.Magnitude
					if dist < sepDist and dist > 1e-3 then
						desired += (d / dist) * ((sepDist - dist) / sepDist) * cfg.Separation * 2
					end
				end
			end
		end
		if fleeing then
			desired += fleeDir * 4
		end
	elseif behavior == "Home" then
		local toHome = f.home - pos
		if fleeing then
			-- Clownfish dart INTO their anemone instead of away from the shark
			desired += MathUtil.safeUnit(toHome, Vector3.yAxis) * 3
			speed = if toHome.Magnitude < 1.5 then 1 else cfg.FleeSpeed
		else
			if now >= f.nextWanderAt or (f.wanderTarget - pos).Magnitude < 1 then
				f.wanderTarget = f.home + MathUtil.randomUnit(rng) * rng:NextNumber(1, cfg.HomeRadius)
				f.nextWanderAt = now + rng:NextNumber(2, 5)
			end
			desired += MathUtil.safeUnit(f.wanderTarget - pos, Vector3.zero)
			if toHome.Magnitude > cfg.HomeRadius then
				desired += toHome.Unit * 1.5
			end
		end
	elseif behavior == "Bottom" then
		if fleeing then
			desired += fleeDir * 3 + Vector3.yAxis * 0.2
		elseif now < f.restUntil then
			speed = 0.6
			desired += f.vel * 0.1
		else
			if (f.wanderTarget - pos).Magnitude < 3 or now >= f.nextWanderAt then
				f.wanderTarget = randomPointInZone(f.zone, cfg)
				f.nextWanderAt = now + rng:NextNumber(10, 18)
				f.restUntil = now + rng:NextNumber(2, 5)
			end
			desired += MathUtil.safeUnit(f.wanderTarget - pos, Vector3.zero)
		end
	end

	desired = steerEnvironment(f, pos, desired)

	local dir = MathUtil.safeUnit(desired, MathUtil.safeUnit(f.vel, Vector3.zAxis))
	f.vel = f.vel:Lerp(dir * speed, math.min(1, cfg.TurnRate * dt))
	local newPos = pos + f.vel * dt

	-- Hard constraints
	local ground = heightAt(newPos.X, newPos.Z)
	local ext = GameConfig.SWIM_HALF_EXTENT
	f.pos = Vector3.new(
		math.clamp(newPos.X, -ext, ext),
		math.clamp(newPos.Y, ground + 0.8, SURFACE - 1.5),
		math.clamp(newPos.Z, -ext, ext)
	)
end

local function respawn(f, now: number, sharks)
	local cfg = f.cfg
	local candidate
	if f.home then
		candidate = f.home + MathUtil.randomUnit(rng) * 2
	elseif f.school then
		candidate = randomPointInZone(f.school.zone, cfg)
	else
		candidate = randomPointInZone(f.zone or zones.Open[1], cfg)
	end
	for _, s in sharks do
		if (s.position - candidate).Magnitude < 40 then
			f.respawnAt = now + 2 -- don't pop into existence in front of a player; retry soon
			return
		end
	end
	f.pos = candidate
	f.vel = MathUtil.randomUnit(rng) * cfg.Speed * 0.5
	f.alive = true
	f.fleeUntil = 0
	if f.school then
		-- Rejoin the school
		local school = f.school
		if (school.centroid - candidate).Magnitude > 60 then
			f.pos = school.centroid + MathUtil.randomUnit(rng) * 4
		end
	end
end

local function simulate(dt: number)
	local now = os.clock()
	local sharks = SharkService.getSharkSnapshots()
	updateSchools(dt, now)

	local nearDist = GameConfig.FISH_NEAR_DISTANCE
	local farInterval = GameConfig.FISH_FAR_UPDATE_INTERVAL
	for _, f in fishList do
		if not f.alive then
			if now >= f.respawnAt then
				respawn(f, now, sharks)
			end
			continue
		end

		local nearest = math.huge
		for _, s in sharks do
			local d = (s.position - f.pos).Magnitude
			if d < nearest then
				nearest = d
			end
		end

		if nearest <= nearDist then
			f.lodAccum = 0
			stepFish(f, dt, now, sharks, true)
		else
			f.lodAccum += dt
			if f.lodAccum >= farInterval then
				local step = math.min(f.lodAccum, 1)
				f.lodAccum = 0
				stepFish(f, step, now, sharks, false)
			end
		end
	end
end

-- Replication ---------------------------------------------------------------------

local snapshotRemote
local idsScratch, posScratch = {}, {}

local function replicate()
	local serverTime = workspace:GetServerTimeNow()
	local radius = GameConfig.FISH_RELEVANCE_RADIUS
	local perPacket = FishCodec.MAX_PER_PACKET
	for _, player in Players:GetPlayers() do
		local state = SharkService.getState(player)
		local root = state and state.root
		if not root or not root.Parent then
			continue
		end
		local center = root.Position
		table.clear(idsScratch)
		table.clear(posScratch)
		local n = 0
		for id, f in fishList do
			if f.alive and (f.pos - center).Magnitude <= radius then
				n += 1
				idsScratch[n] = id
				posScratch[n] = f.pos
			end
		end
		local first = 1
		while first <= n do
			local last = math.min(n, first + perPacket - 1)
			snapshotRemote:FireClient(player, FishCodec.encode(serverTime, idsScratch, posScratch, first, last))
			first = last + 1
		end
	end
end

-- Public API -----------------------------------------------------------------------

function FishService.getFish(id: number)
	return fishList[id]
end

function FishService.count(): number
	return #fishList
end

-- Validation used by FeedingService. Generous by the distance the fish could have
-- moved during the client's interpolation delay + latency.
function FishService.isBiteValid(f, mouth: Vector3, look: Vector3, sharkPos: Vector3, range: number): boolean
	if not f or not f.alive then
		return false
	end
	local cfg = f.cfg
	local slack = cfg.Length * 0.5 + cfg.FleeSpeed * SharkConfig.Bite.LatencyAllowance
	if (f.pos - mouth).Magnitude > range + slack then
		return false
	end
	return (f.pos - sharkPos):Dot(look) > 0
end

function FishService.findBiteTarget(mouth: Vector3, look: Vector3, sharkPos: Vector3, range: number)
	local best, bestDist = nil, math.huge
	for _, f in fishList do
		if f.alive then
			local dist = (f.pos - mouth).Magnitude
			if dist < bestDist and FishService.isBiteValid(f, mouth, look, sharkPos, range) then
				best, bestDist = f, dist
			end
		end
	end
	return best
end

function FishService.consume(id: number, eater: Player?): boolean
	local f = fishList[id]
	if not f or not f.alive then
		return false
	end
	f.alive = false
	f.respawnAt = os.clock() + f.cfg.RespawnTime
	Remotes.get("FishEaten"):FireAllClients(id, f.pos, f.typeId, if eater then eater.UserId else 0)
	return true
end

function FishService.init(meta)
	heightAt = meta.heightAt
	zones = meta.zones
	buildRockGrid(meta.rocks)
	spawnPopulation(meta.anemones or {})

	local counts = {}
	for _, f in fishList do
		counts[f.cfg.Id] = (counts[f.cfg.Id] or 0) + 1
	end
	local summary = {}
	for name, c in counts do
		table.insert(summary, `{name}={c}`)
	end
	print(`[FishService] {#fishList} fish in {#schools} schools: {table.concat(summary, ", ")}`)

	snapshotRemote = Remotes.get("FishSnapshot")
	local rosterRemote = Remotes.get("FishRoster")
	Remotes.get("ClientReady").OnServerEvent:Connect(function(player)
		if not RemoteGuard.allow(player, "ClientReady", 0.2, 2) then
			return
		end
		rosterRemote:FireClient(player, rosterTypes)
	end)

	local simInterval = 1 / GameConfig.FISH_SIM_RATE
	local repInterval = 1 / GameConfig.FISH_REPLICATION_RATE
	local simAccum, repAccum = 0, 0
	RunService.Heartbeat:Connect(function(dt)
		simAccum += dt
		repAccum += dt
		if simAccum >= simInterval then
			simulate(math.min(simAccum, 0.25))
			simAccum = 0
		end
		if repAccum >= repInterval then
			repAccum = 0
			replicate()
		end
	end)
end

return FishService
