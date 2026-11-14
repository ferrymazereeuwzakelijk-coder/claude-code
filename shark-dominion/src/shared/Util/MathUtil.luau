--[[
	MathUtil
	Frame-rate independent smoothing and small vector helpers.
]]

local MathUtil = {}

local TAU = math.pi * 2

-- Exponential smoothing that behaves the same at any frame rate.
function MathUtil.damp(a: number, b: number, lambda: number, dt: number): number
	return a + (b - a) * (1 - math.exp(-lambda * dt))
end

function MathUtil.dampVector(a: Vector3, b: Vector3, lambda: number, dt: number): Vector3
	return a:Lerp(b, 1 - math.exp(-lambda * dt))
end

-- Wrap to [-pi, pi)
function MathUtil.wrapAngle(angle: number): number
	return (angle + math.pi) % TAU - math.pi
end

function MathUtil.dampAngle(a: number, b: number, lambda: number, dt: number): number
	return a + MathUtil.wrapAngle(b - a) * (1 - math.exp(-lambda * dt))
end

function MathUtil.lerp(a: number, b: number, t: number): number
	return a + (b - a) * t
end

function MathUtil.smoothstep(edge0: number, edge1: number, x: number): number
	local t = math.clamp((x - edge0) / (edge1 - edge0), 0, 1)
	return t * t * (3 - 2 * t)
end

-- Yaw such that CFrame.Angles(0, yaw, 0).LookVector points along v (horizontal part).
function MathUtil.yawFromVector(v: Vector3): number
	return math.atan2(-v.X, -v.Z)
end

function MathUtil.safeUnit(v: Vector3, fallback: Vector3): Vector3
	local m = v.Magnitude
	if m < 1e-5 then
		return fallback
	end
	return v / m
end

function MathUtil.randomUnit(rng: Random): Vector3
	for _ = 1, 8 do
		local v = Vector3.new(rng:NextNumber(-1, 1), rng:NextNumber(-1, 1), rng:NextNumber(-1, 1))
		local m = v.Magnitude
		if m > 0.05 and m <= 1 then
			return v / m
		end
	end
	return Vector3.xAxis
end

-- CFrame positioned at `position` whose +X axis points along `direction`
-- (Roblox cylinders extend along X).
function MathUtil.axisCFrame(position: Vector3, direction: Vector3): CFrame
	local x = MathUtil.safeUnit(direction, Vector3.xAxis)
	local ref = if math.abs(x.Y) > 0.98 then Vector3.zAxis else Vector3.yAxis
	local y = (ref - x * ref:Dot(x)).Unit
	return CFrame.fromMatrix(position, x, y)
end

return MathUtil
