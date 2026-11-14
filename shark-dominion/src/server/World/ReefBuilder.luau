--[[
	ReefBuilder
	Deterministically generates the tropical reef test area with smooth terrain.

	Composition (seeded, identical on every server):
	  * Central reef plateau (~ -34) with sand and pale limestone rubble patches
	  * Lagoon sand flats (~ -62) with dunes, a seagrass meadow (SW) and kelp forest (NW)
	  * Rock pillars and two natural arches scattered around the lagoon
	  * East drop-off: ledge rim falling into a deep blue trench (~ -146)
	  * Basin rim rising at the map edges so the world never ends in a void

	Terrain is written in 64x64 stud chunks. Only a thin "band" around the floor
	and rock formations is written voxel by voxel; everything below is filled solid
	and everything above is filled with water using native FillBlock calls.
	Voxels are written with WriteVoxelChannels so partial solid voxels still hold
	water (no air pockets at the seabed). Falls back to WriteVoxels if unavailable.
]]

local GameConfig = require(game:GetService("ReplicatedStorage").Shared.Config.GameConfig)

local ReefBuilder = {}

local CELL = 4
local CHUNK = 64
local CELLS_PER_CHUNK = CHUNK // CELL

local Mat = Enum.Material

local function smoothstep(e0, e1, x)
	local t = math.clamp((x - e0) / (e1 - e0), 0, 1)
	return t * t * (3 - 2 * t)
end

local function lerp(a, b, t)
	return a + (b - a) * t
end

local function configureTerrainLook(terrain: Terrain)
	terrain.WaterColor = Color3.fromRGB(18, 138, 160)
	terrain.WaterTransparency = 0.75
	terrain.WaterReflectance = 0.35
	terrain.WaterWaveSize = 0.12
	terrain.WaterWaveSpeed = 9
	terrain.Decoration = false

	terrain:SetMaterialColor(Mat.Sand, Color3.fromRGB(232, 212, 164))
	terrain:SetMaterialColor(Mat.Limestone, Color3.fromRGB(216, 198, 170))
	terrain:SetMaterialColor(Mat.Rock, Color3.fromRGB(118, 116, 124))
	terrain:SetMaterialColor(Mat.Slate, Color3.fromRGB(66, 86, 100))
	terrain:SetMaterialColor(Mat.Basalt, Color3.fromRGB(56, 64, 74))
	terrain:SetMaterialColor(Mat.Ground, Color3.fromRGB(176, 158, 112))
end

function ReefBuilder.build()
	local started = os.clock()
	local terrain = workspace.Terrain
	local seed = GameConfig.WORLD_SEED
	local rng = Random.new(seed)
	local SURFACE = GameConfig.WATER_SURFACE_Y
	local EXT = GameConfig.TERRAIN_HALF_EXTENT
	local BOTTOM = GameConfig.TERRAIN_BOTTOM_Y
	local nOff = (seed % 997) * 0.731 + 0.37 -- non-integer noise offset (math.noise is 0 on lattice points)

	terrain:Clear()
	configureTerrainLook(terrain)

	local plateauCenter = Vector3.new(-10, 0, -10)
	local meadow = { Center = Vector3.new(-190, 0, 170), Radius = 90 }
	local kelpForest = { Center = Vector3.new(-205, 0, -175), Radius = 75 }

	-- Floor height (ignores rock formations) ---------------------------------------
	local function heightAt(x: number, z: number): number
		local n1 = math.noise(x / 130, z / 130, nOff)
		local n2 = math.noise(x / 42, z / 42, nOff + 11.3)
		local n3 = math.noise(x / 13, z / 13, nOff + 23.7)

		local lagoon = -62 + n1 * 12 + n2 * 3.5 + n3 * 0.8
		local dx, dz = x - plateauCenter.X, z - plateauCenter.Z
		local d = math.sqrt(dx * dx + dz * dz) + n1 * 45
		local plateauMask = 1 - smoothstep(105, 165, d)
		local plateau = -34 + n2 * 5 + n3 * 1.6
		local h = lerp(lagoon, plateau, plateauMask)

		local dropMask = smoothstep(165, 265, x + n1 * 50)
		h = lerp(h, -146 + n2 * 9 + n3 * 1.2, dropMask)

		local edge = math.max(math.abs(x), math.abs(z))
		local rim = smoothstep(322, 405, edge + n2 * 20)
		h = lerp(h, -24 + n2 * 6, rim)

		return math.min(h, SURFACE - 8)
	end

	local function floorMaterial(x: number, z: number, h: number): Enum.Material
		local sx = heightAt(x + 2, z) - heightAt(x - 2, z)
		local sz = heightAt(x, z + 2) - heightAt(x, z - 2)
		local slope = math.sqrt(sx * sx + sz * sz) / 4
		if slope > 1.1 then
			return Mat.Rock
		elseif h < -100 then
			return if math.noise(x / 24, z / 24, nOff + 3.1) > 0.2 then Mat.Basalt else Mat.Slate
		elseif slope > 0.7 then
			return Mat.Limestone
		elseif h > -46 then
			return if math.noise(x / 30, z / 30, nOff + 5.9) > 0.22 then Mat.Limestone else Mat.Sand
		end
		local mdx, mdz = x - meadow.Center.X, z - meadow.Center.Z
		if mdx * mdx + mdz * mdz < (meadow.Radius * 1.1) ^ 2 then
			return Mat.Ground
		end
		return Mat.Sand
	end

	-- Rock formations as signed-distance spheres --------------------------------
	local rocks = {}
	local function addRock(c: Vector3, r: number, material: Enum.Material)
		if c.Y + r > SURFACE - 7 then
			return false
		end
		table.insert(rocks, { C = c, R = r, Mat = material })
		return true
	end

	local pillarBases = {}
	for _ = 1, 14 do
		local x, z
		for _ = 1, 12 do
			local a = rng:NextNumber(0, math.pi * 2)
			local d = rng:NextNumber(175, 310)
			x, z = plateauCenter.X + math.cos(a) * d, plateauCenter.Z + math.sin(a) * d
			if x < 140 and math.abs(x) < 340 and math.abs(z) < 340 then
				break
			end
		end
		local h = heightAt(x, z)
		local r = rng:NextNumber(7, 11)
		local y = h - r * 0.3
		for _ = 1, rng:NextInteger(3, 5) do
			if not addRock(Vector3.new(x + rng:NextNumber(-2, 2), y, z + rng:NextNumber(-2, 2)), r, Mat.Rock) then
				break
			end
			y += r * 1.15
			r *= 0.8
		end
		table.insert(pillarBases, Vector3.new(x, h, z))
	end

	-- Two natural arches
	for _, arch in { { Vector3.new(-120, 0, 235), 0.6 }, { Vector3.new(70, 0, -265), 2.1 } } do
		local center, angle = arch[1], arch[2]
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local a = center + dir * 18
		local b = center - dir * 18
		local tops = {}
		for i, base in { a, b } do
			local h = heightAt(base.X, base.Z)
			local y = h
			for _ = 1, 3 do
				addRock(Vector3.new(base.X, y, base.Z), 6.5, Mat.Rock)
				y += 6
			end
			tops[i] = Vector3.new(base.X, y - 3, base.Z)
		end
		for i = 0, 10 do
			local t = i / 10
			local p = tops[1]:Lerp(tops[2], t) + Vector3.new(0, math.sin(math.pi * t) * 12, 0)
			addRock(p, 5.2, Mat.Rock)
		end
		table.insert(pillarBases, Vector3.new(center.X, heightAt(center.X, center.Z), center.Z))
	end

	-- Limestone boulders on the plateau edge
	for _ = 1, 24 do
		local a = rng:NextNumber(0, math.pi * 2)
		local d = rng:NextNumber(60, 150)
		local x, z = plateauCenter.X + math.cos(a) * d, plateauCenter.Z + math.sin(a) * d
		local r = rng:NextNumber(4, 9)
		addRock(Vector3.new(x, heightAt(x, z) - r * 0.35, z), r, Mat.Limestone)
	end

	-- Drop-off ledge rim and overhangs
	for z = -330, 330, 26 do
		local x = 172 + math.noise(z / 60, nOff, 0.5) * 28
		addRock(Vector3.new(x, heightAt(x, z) - 2, z + rng:NextNumber(-6, 6)), rng:NextNumber(8, 13), Mat.Slate)
		if rng:NextNumber() < 0.45 then
			local ox = x + rng:NextNumber(24, 34)
			addRock(Vector3.new(ox, rng:NextNumber(-95, -70), z + rng:NextNumber(-8, 8)), rng:NextNumber(7, 10), Mat.Basalt)
		end
	end

	-- Chunked voxel write -------------------------------------------------------
	local useChannels = true
	local cellsWritten = 0

	local function buildChunk(x0: number, z0: number)
		local heights, mats = table.create(CELLS_PER_CHUNK), table.create(CELLS_PER_CHUNK)
		local minH, maxTop = math.huge, -math.huge
		for i = 1, CELLS_PER_CHUNK do
			local hRow, mRow = table.create(CELLS_PER_CHUNK), table.create(CELLS_PER_CHUNK)
			local x = x0 + (i - 0.5) * CELL
			for k = 1, CELLS_PER_CHUNK do
				local z = z0 + (k - 0.5) * CELL
				local h = heightAt(x, z)
				hRow[k] = h
				mRow[k] = floorMaterial(x, z, h)
				minH = math.min(minH, h)
				maxTop = math.max(maxTop, h)
			end
			heights[i], mats[i] = hRow, mRow
		end

		local chunkRocks = {}
		for _, rock in rocks do
			local reach = rock.R + 4
			if
				rock.C.X + reach >= x0
				and rock.C.X - reach <= x0 + CHUNK
				and rock.C.Z + reach >= z0
				and rock.C.Z - reach <= z0 + CHUNK
			then
				table.insert(chunkRocks, rock)
				maxTop = math.max(maxTop, rock.C.Y + reach)
			end
		end

		local bandBottom = math.max(BOTTOM, math.floor((minH - 8) / CELL) * CELL)
		local bandTop = math.min(SURFACE, math.ceil((maxTop + 8) / CELL) * CELL)
		local cx, cz = x0 + CHUNK / 2, z0 + CHUNK / 2

		if bandBottom > BOTTOM then
			terrain:FillBlock(
				CFrame.new(cx, (BOTTOM + bandBottom) / 2, cz),
				Vector3.new(CHUNK, bandBottom - BOTTOM, CHUNK),
				Mat.Rock
			)
		end
		if bandTop < SURFACE then
			terrain:FillBlock(
				CFrame.new(cx, (bandTop + SURFACE) / 2, cz),
				Vector3.new(CHUNK, SURFACE - bandTop, CHUNK),
				Mat.Water
			)
		end

		local ny = (bandTop - bandBottom) // CELL
		if ny <= 0 then
			return
		end

		local materials = table.create(CELLS_PER_CHUNK)
		local occupancy = table.create(CELLS_PER_CHUNK)
		local liquid = table.create(CELLS_PER_CHUNK)

		for i = 1, CELLS_PER_CHUNK do
			local x = x0 + (i - 0.5) * CELL
			local mX, oX, lX = table.create(ny), table.create(ny), table.create(ny)
			for j = 1, ny do
				local y = bandBottom + (j - 0.5) * CELL
				local mY, oY, lY = table.create(CELLS_PER_CHUNK), table.create(CELLS_PER_CHUNK), table.create(CELLS_PER_CHUNK)
				for k = 1, CELLS_PER_CHUNK do
					local z = z0 + (k - 0.5) * CELL
					local occ = math.clamp((heights[i][k] - (y - CELL / 2)) / CELL, 0, 1)
					local mat = mats[i][k]

					for _, rock in chunkRocks do
						local dx, dy, dz = x - rock.C.X, y - rock.C.Y, z - rock.C.Z
						local reach = rock.R + 4
						local d2 = dx * dx + dy * dy + dz * dz
						if d2 < reach * reach then
							local bump = math.noise(x * 0.09, y * 0.09, z * 0.09 + nOff) * rock.R * 0.28
							local o = math.clamp(0.5 - (math.sqrt(d2) - rock.R - bump) / CELL, 0, 1)
							if o > occ then
								occ = o
								mat = rock.Mat
							end
						end
					end

					local underwater = (y - CELL / 2) < SURFACE
					if useChannels then
						mY[k] = if occ > 0 then mat else Mat.Air
						oY[k] = occ
						lY[k] = if underwater and occ < 1 then 1 else 0
					else
						-- Legacy fallback: a voxel is either solid or water.
						if occ > 0.02 then
							mY[k], oY[k] = mat, occ
						elseif underwater then
							mY[k], oY[k] = Mat.Water, 1
						else
							mY[k], oY[k] = Mat.Air, 0
						end
					end
				end
				mX[j], oX[j], lX[j] = mY, oY, lY
			end
			materials[i], occupancy[i], liquid[i] = mX, oX, lX
		end

		local region = Region3.new(Vector3.new(x0, bandBottom, z0), Vector3.new(x0 + CHUNK, bandTop, z0 + CHUNK))
		cellsWritten += CELLS_PER_CHUNK * ny * CELLS_PER_CHUNK

		if useChannels then
			local ok, err = pcall(function()
				terrain:WriteVoxelChannels(region, CELL, {
					SolidMaterial = materials,
					SolidOccupancy = occupancy,
					LiquidOccupancy = liquid,
				})
			end)
			if ok then
				return
			end
			warn(`[ReefBuilder] WriteVoxelChannels unavailable ({err}); falling back to WriteVoxels`)
			useChannels = false
			buildChunk(x0, z0) -- rebuild this chunk in fallback format
			return
		end
		terrain:WriteVoxels(region, CELL, materials, occupancy)
	end

	local chunkCount = 0
	for x0 = -EXT, EXT - CHUNK, CHUNK do
		for z0 = -EXT, EXT - CHUNK, CHUNK do
			buildChunk(x0, z0)
			chunkCount += 1
			if chunkCount % 6 == 0 then
				task.wait() -- keep the server responsive while generating
			end
		end
	end

	-- Fish zones (consumed by FishService) ---------------------------------------
	local rockZones = {}
	for _, base in pillarBases do
		table.insert(rockZones, { Center = Vector3.new(base.X, 0, base.Z), Radius = 26 })
	end

	local spawnGround = heightAt(plateauCenter.X, plateauCenter.Z + 40)
	local meta = {
		heightAt = heightAt,
		rocks = rocks,
		plateauCenter = plateauCenter,
		pillarBases = pillarBases,
		meadow = meadow,
		kelpForest = kelpForest,
		spawnCFrame = CFrame.new(plateauCenter.X, math.min(spawnGround + 16, SURFACE - 10), plateauCenter.Z + 40),
		zones = {
			Open = { { Center = plateauCenter, Radius = 230 } },
			Rocks = rockZones,
			DropOff = {
				{ Center = Vector3.new(262, 0, 0), Radius = 95 },
				{ Center = Vector3.new(250, 0, -190), Radius = 70 },
				{ Center = Vector3.new(250, 0, 190), Radius = 70 },
			},
			Reef = {}, -- filled by PropFactory with coral patch centers
		},
	}

	print(
		`[ReefBuilder] Terrain ready: {chunkCount} chunks, {cellsWritten} voxels, {#rocks} rock blobs, `
			.. `{if useChannels then "liquid channels" else "legacy voxels"} in {string.format("%.2f", os.clock() - started)}s`
	)
	return meta
end

return ReefBuilder
