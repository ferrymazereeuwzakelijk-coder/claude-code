--[[
	FishCodec
	Compact binary snapshot of fish positions for UnreliableRemoteEvent.

	Layout (little endian):
	  f64 serverTime
	  u16 count
	  count x { u16 fishId, i16 x, i16 y, i16 z }   -- positions quantized to 1/4 stud

	8 bytes per fish. Packets are capped well below the unreliable payload limit.
]]

local FishCodec = {}

FishCodec.QUANT = 4
FishCodec.MAX_PER_PACKET = 90 -- 10 + 90*8 = 730 bytes
local HEADER = 10
local STRIDE = 8

local function quantize(v: number): number
	return math.clamp(math.round(v * FishCodec.QUANT), -32768, 32767)
end

function FishCodec.encode(serverTime: number, ids: { number }, positions: { Vector3 }, first: number, last: number): buffer
	local count = last - first + 1
	local b = buffer.create(HEADER + count * STRIDE)
	buffer.writef64(b, 0, serverTime)
	buffer.writeu16(b, 8, count)
	local offset = HEADER
	for i = first, last do
		local p = positions[i]
		buffer.writeu16(b, offset, ids[i])
		buffer.writei16(b, offset + 2, quantize(p.X))
		buffer.writei16(b, offset + 4, quantize(p.Y))
		buffer.writei16(b, offset + 6, quantize(p.Z))
		offset += STRIDE
	end
	return b
end

-- Calls onFish(serverTime, id, position) for each entry. Returns serverTime, or nil if malformed.
function FishCodec.decode(b: any, onFish: (number, number, Vector3) -> ()): number?
	if typeof(b) ~= "buffer" then
		return nil
	end
	local len = buffer.len(b)
	if len < HEADER then
		return nil
	end
	local serverTime = buffer.readf64(b, 0)
	local count = buffer.readu16(b, 8)
	if len < HEADER + count * STRIDE then
		return nil
	end
	local q = FishCodec.QUANT
	for i = 0, count - 1 do
		local o = HEADER + i * STRIDE
		local id = buffer.readu16(b, o)
		local pos = Vector3.new(buffer.readi16(b, o + 2) / q, buffer.readi16(b, o + 4) / q, buffer.readi16(b, o + 6) / q)
		onFish(serverTime, id, pos)
	end
	return serverTime
end

return FishCodec
