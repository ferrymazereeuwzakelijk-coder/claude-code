--[[
	RemoteGuard
	Per-player, per-remote token bucket rate limiting plus small argument
	validators. Every OnServerEvent handler runs its input through here first.
]]

local Players = game:GetService("Players")

local RemoteGuard = {}

local buckets: { [Player]: { [string]: { tokens: number, last: number } } } = {}
local violations: { [Player]: number } = {}

-- Returns true if the call is allowed. `rate` tokens/second, up to `burst`.
function RemoteGuard.allow(player: Player, key: string, rate: number, burst: number): boolean
	local perPlayer = buckets[player]
	if not perPlayer then
		perPlayer = {}
		buckets[player] = perPlayer
	end
	local now = os.clock()
	local bucket = perPlayer[key]
	if not bucket then
		bucket = { tokens = burst, last = now }
		perPlayer[key] = bucket
	end
	bucket.tokens = math.min(burst, bucket.tokens + (now - bucket.last) * rate)
	bucket.last = now
	if bucket.tokens < 1 then
		violations[player] = (violations[player] or 0) + 1
		if violations[player] % 50 == 1 then
			warn(`[RemoteGuard] {player.Name} is exceeding the rate limit on {key}`)
		end
		return false
	end
	bucket.tokens -= 1
	return true
end

function RemoteGuard.isFiniteNumber(v: any): boolean
	return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

function RemoteGuard.isInteger(v: any, min: number, max: number): boolean
	return RemoteGuard.isFiniteNumber(v) and v % 1 == 0 and v >= min and v <= max
end

Players.PlayerRemoving:Connect(function(player)
	buckets[player] = nil
	violations[player] = nil
end)

return RemoteGuard
