--[[
	GameConfig
	World-level constants shared by server and client. Anything a designer is
	likely to tune lives here or in the per-system config modules next to it.
]]

local GameConfig = {
	-- Server / multiplayer
	MAX_PLAYERS = 16,
	PVP_ENABLED = false, -- PvP bite path is implemented server-side; flip to test shark-vs-shark damage.

	-- World layout (studs)
	WORLD_SEED = 7741,
	WATER_SURFACE_Y = 0,
	SURFACE_MARGIN = 3.5, -- shark root is kept at least this far below the surface (scaled by shark size)
	TERRAIN_HALF_EXTENT = 416, -- terrain is generated for x,z in [-416, 416] (must be a multiple of 64)
	TERRAIN_BOTTOM_Y = -176, -- must be a multiple of 4
	SWIM_HALF_EXTENT = 360, -- soft horizontal boundary for sharks
	SWIM_MIN_Y = -168,

	RESPAWN_DELAY = 4,

	-- Fish simulation & replication
	FISH_SIM_RATE = 15, -- server steps per second for fish near players
	FISH_FAR_UPDATE_INTERVAL = 0.6, -- seconds between updates for fish far from every shark
	FISH_NEAR_DISTANCE = 300, -- fish within this distance of any shark run at full rate
	FISH_REPLICATION_RATE = 10, -- snapshots per second per player
	FISH_RELEVANCE_RADIUS = 240, -- only fish within this distance of a player's shark are sent
	FISH_INTERP_DELAY = 0.18, -- client render delay for snapshot interpolation
	FISH_DETAIL_RADIUS = 140, -- client animates fish tails only inside this radius

	-- Persistence
	USE_DATASTORE = true,
	DATASTORE_NAME = "SharkDominion_PlayerData_v1",
	AUTOSAVE_INTERVAL = 150,

	-- Server vitals tick
	VITALS_TICK_RATE = 10,
}

return table.freeze(GameConfig)
