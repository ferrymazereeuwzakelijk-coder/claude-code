--[[
	Signal
	Minimal script-side event used for communication between client modules
	(keeps modules decoupled and avoids circular requires).
]]

local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ _handlers = {} }, Signal)
end

function Signal:Connect(handler)
	local handlers = self._handlers
	local entry = { fn = handler }
	table.insert(handlers, entry)

	local connection = { Connected = true }
	function connection.Disconnect(conn)
		if not conn.Connected then
			return
		end
		conn.Connected = false
		local index = table.find(handlers, entry)
		if index then
			table.remove(handlers, index)
		end
	end
	return connection
end

function Signal:Fire(...)
	-- Iterate a snapshot so handlers may disconnect while firing.
	for _, entry in table.clone(self._handlers) do
		task.spawn(entry.fn, ...)
	end
end

function Signal:Once(handler)
	local connection
	connection = self:Connect(function(...)
		connection:Disconnect()
		handler(...)
	end)
	return connection
end

return Signal
