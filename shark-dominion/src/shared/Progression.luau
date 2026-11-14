--[[
	Progression
	Pure functions for levels, size scaling and species evolution.
	Shared so the HUD can display exactly what the server computes.
]]

local SharkConfig = require(script.Parent.Config.SharkConfig)

local Progression = {}

Progression.MAX_LEVEL = 60

-- XP required to go from `level` to `level + 1`.
function Progression.xpToNext(level: number): number
	return math.floor(40 * level ^ 1.45 + 0.5)
end

-- Returns level, xp into the current level, xp needed for the next level.
function Progression.levelFromXP(totalXP: number): (number, number, number)
	local level = 1
	local remaining = math.max(0, totalXP)
	while level < Progression.MAX_LEVEL do
		local need = Progression.xpToNext(level)
		if remaining < need then
			return level, remaining, need
		end
		remaining -= need
		level += 1
	end
	return Progression.MAX_LEVEL, remaining, 0
end

-- Smooth, saturating growth curve with hard safety limits.
function Progression.scaleForMass(mass: number): number
	local g = SharkConfig.Growth
	local t = 1 - math.exp(-math.max(mass - g.StartMass, 0) / g.ScaleCurve)
	return math.clamp(g.MinScale + (g.MaxScale - g.MinScale) * t, g.MinScale, g.MaxScale)
end

function Progression.speciesForLevel(level: number)
	local best = SharkConfig.Species[1]
	for _, species in SharkConfig.Species do
		if level >= species.MinLevel and species.MinLevel >= best.MinLevel then
			best = species
		end
	end
	return best
end

function Progression.maxHealth(scale: number, speciesId: string?): number
	local V = SharkConfig.Vitals
	local species = SharkConfig.getSpecies(speciesId)
	return math.floor(V.MaxHealth * species.HealthMult * (1 + (scale - 1) * V.HealthPerScale) + 0.5)
end

return Progression
