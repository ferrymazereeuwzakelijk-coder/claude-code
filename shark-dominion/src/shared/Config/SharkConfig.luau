--[[
	SharkConfig
	Movement feel, vitals, combat and growth tuning plus species definitions.
	Both the client controller (for feel) and the server (for validation) read
	these values, so the two can never drift apart.
]]

local SharkConfig = {}

SharkConfig.Movement = {
	CruiseSpeed = 22, -- studs/s with full stick, no boost
	BoostSpeed = 44,
	Acceleration = 26, -- studs/s^2 toward cruise speed
	BoostAcceleration = 64,
	Drag = 1.4, -- exponential glide decay per second when thrust is released (momentum)
	VerticalSpeed = 12, -- Space / Ctrl hover speed
	TurnRate = math.rad(165), -- max yaw rate (rad/s) at low speed
	BoostTurnFactor = 0.6, -- turn rate multiplier at full boost speed
	TurnResponsiveness = 3.2, -- how aggressively heading error becomes yaw rate
	YawRateSmoothing = 9,
	PitchLimit = math.rad(70),
	HoverPitch = math.rad(28), -- nose tilt when ascending/descending in place
	PitchResponsiveness = 5,
	BankMax = math.rad(40),
	BankPerTurnRate = 0.55, -- roll (rad) per rad/s of yaw rate
	BankResponsiveness = 5,
	VelocityResponsiveness = 7,
	CameraPitchInfluence = 0.85, -- 0 = W always swims level, 1 = W swims exactly where the camera looks
	SizeSpeedBonus = 0.22, -- +22% speed per +1.0 scale
	SizeTurnPenalty = 0.3, -- bigger sharks turn slower
	SurfaceSoftZone = 8, -- studs below the surface where upward pitch is suppressed
}

SharkConfig.Stamina = {
	Max = 100,
	DrainPerSecond = 26,
	RegenPerSecond = 17,
	RegenDelay = 1.0,
	MinToStart = 12, -- need at least this much to start a new boost
}

SharkConfig.Vitals = {
	MaxHealth = 100,
	MaxHunger = 100,
	HungerDrainPerSecond = 0.55,
	BoostHungerMultiplier = 1.8,
	StarveDamagePerSecond = 4,
	StarveFlinchEvery = 5, -- accumulated starvation damage before a visible flinch
	RegenPerSecond = 2.5,
	RegenHungerThreshold = 0.5, -- regenerate health while hunger is above 50%
	HealthPerScale = 0.6, -- +60% max health per +1.0 scale
}

SharkConfig.Bite = {
	Cooldown = 0.5,
	Range = 4.2, -- studs from the mouth at scale 1
	MouthOffset = 4.6, -- mouth distance in front of the root at scale 1
	MouthDrop = 0.45,
	LungeSpeed = 8, -- forward speed added on bite (client)
	LatencyAllowance = 0.22, -- seconds of fish movement the server forgives
	PvPDamage = 18,
	Duration = 0.32, -- animation length
}

SharkConfig.Ability = {
	Name = "Frenzy Dash",
	Key = "E",
	Cooldown = 8,
	Duration = 1.1,
	SpeedMultiplier = 1.55,
	BiteRangeMultiplier = 1.5,
}

SharkConfig.Growth = {
	StartMass = 20,
	MaxMass = 5000,
	MinScale = 1,
	MaxScale = 2.6, -- hard safety cap for model size
	ScaleCurve = 300, -- larger = slower growth
	ScaleStep = 0.015, -- minimum change before the server rescales the model
	DeathMassKeep = 0.65, -- fraction of mass above StartMass kept on death
}

-- Species evolve automatically by level. Colors drive the procedural rig.
SharkConfig.Species = {
	{
		Id = "ReefShark",
		DisplayName = "Reef Shark",
		MinLevel = 1,
		SpeedMult = 1,
		TurnMult = 1,
		HealthMult = 1,
		BiteMult = 1,
		Colors = {
			Body = Color3.fromRGB(104, 128, 148),
			Fin = Color3.fromRGB(86, 108, 128),
			FinTip = Color3.fromRGB(86, 108, 128),
			Belly = Color3.fromRGB(236, 236, 228),
		},
	},
	{
		Id = "BlacktipShark",
		DisplayName = "Blacktip Shark",
		MinLevel = 5,
		SpeedMult = 1.05,
		TurnMult = 1.05,
		HealthMult = 1.15,
		BiteMult = 1.1,
		Colors = {
			Body = Color3.fromRGB(126, 136, 144),
			Fin = Color3.fromRGB(108, 118, 128),
			FinTip = Color3.fromRGB(26, 28, 32),
			Belly = Color3.fromRGB(240, 238, 230),
		},
	},
	{
		Id = "TigerShark",
		DisplayName = "Tiger Shark",
		MinLevel = 12,
		SpeedMult = 1.08,
		TurnMult = 0.95,
		HealthMult = 1.4,
		BiteMult = 1.3,
		Colors = {
			Body = Color3.fromRGB(132, 126, 96),
			Fin = Color3.fromRGB(108, 102, 78),
			FinTip = Color3.fromRGB(70, 64, 50),
			Belly = Color3.fromRGB(232, 226, 204),
		},
	},
	{
		Id = "GreatWhite",
		DisplayName = "Great White",
		MinLevel = 25,
		SpeedMult = 1.12,
		TurnMult = 0.9,
		HealthMult = 1.8,
		BiteMult = 1.6,
		Colors = {
			Body = Color3.fromRGB(92, 104, 118),
			Fin = Color3.fromRGB(78, 90, 104),
			FinTip = Color3.fromRGB(60, 68, 80),
			Belly = Color3.fromRGB(246, 246, 242),
		},
	},
}

local speciesById = {}
for _, species in SharkConfig.Species do
	speciesById[species.Id] = species
end

function SharkConfig.getSpecies(id: string?)
	return (id and speciesById[id]) or SharkConfig.Species[1]
end

-- Derived movement numbers for a given size and species.
function SharkConfig.getMovement(scale: number, speciesId: string?)
	local M = SharkConfig.Movement
	local species = SharkConfig.getSpecies(speciesId)
	local sizeMult = 1 + (scale - 1) * M.SizeSpeedBonus
	local speedMult = sizeMult * species.SpeedMult
	return {
		Cruise = M.CruiseSpeed * speedMult,
		Boost = M.BoostSpeed * speedMult,
		Accel = M.Acceleration * speedMult,
		BoostAccel = M.BoostAcceleration * speedMult,
		Vertical = M.VerticalSpeed * sizeMult,
		TurnRate = M.TurnRate * species.TurnMult / (1 + (scale - 1) * M.SizeTurnPenalty),
	}
end

-- Fastest speed a legitimate client can reach (used by server movement validation).
function SharkConfig.maxLegitSpeed(scale: number, speciesId: string?): number
	local mv = SharkConfig.getMovement(scale, speciesId)
	return mv.Boost * SharkConfig.Ability.SpeedMultiplier + SharkConfig.Bite.LungeSpeed + mv.Vertical
end

-- Shared stamina integrator: client predicts with it, server is authoritative with it.
function SharkConfig.stepStamina(
	stamina: number,
	wantsBoost: boolean,
	wasBoosting: boolean,
	sinceStop: number,
	dt: number
): (number, boolean, number)
	local S = SharkConfig.Stamina
	local boosting = wantsBoost and ((wasBoosting and stamina > 0) or stamina >= S.MinToStart)
	if boosting then
		stamina = math.max(0, stamina - S.DrainPerSecond * dt)
		sinceStop = 0
		if stamina <= 0 then
			boosting = false
		end
	else
		sinceStop += dt
		if sinceStop >= S.RegenDelay then
			stamina = math.min(S.Max, stamina + S.RegenPerSecond * dt)
		end
	end
	return stamina, boosting, sinceStop
end

return SharkConfig
