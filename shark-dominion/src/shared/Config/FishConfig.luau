--[[
	FishConfig
	Five fish species with distinct size, speed, behavior and reward.
	Type ids are the array indices and are sent over the network, so append new
	types at the end instead of reordering.

	Behaviors (implemented in server/Services/FishService):
	  School  - boids (separation / cohesion / alignment) around a roaming school target
	  Home    - stays close to an anemone; flees INTO its home instead of away
	  Bottom  - solitary, hugs the floor, wanders between rest stops
	  Cruiser - fast small groups patrolling a wide loop in open water

	Visual parts are in units of Length (the client multiplies by Length).
	The first part must be the body. Parts flagged Wag pivot at their front edge.
]]

local WHITE = Color3.fromRGB(245, 245, 240)
local BLACK = Color3.fromRGB(16, 16, 20)

local FishConfig = {}

FishConfig.Types = {
	-- 1
	{
		Id = "Sardine",
		DisplayName = "Sardine",
		Length = 1.2,
		Speed = 11,
		FleeSpeed = 24,
		TurnRate = 4.5,
		FleeRadius = 24,
		Behavior = "School",
		Zone = "Open",
		SchoolCount = 7,
		SchoolSize = { 10, 14 },
		HeightAboveFloor = { 8, 30 },
		Separation = 1.6,
		SeparationDistance = 2.2,
		Cohesion = 1.0,
		Alignment = 1.3,
		Seek = 0.6,
		Mass = 1,
		XP = 2,
		Coins = 1,
		Hunger = 4,
		MinScale = 0,
		RespawnTime = 8,
		WagFrequency = 3.2,
		WagAmplitude = 0.45,
		Visual = {
			Parts = {
				{ Name = "Body", Size = Vector3.new(0.24, 0.3, 1), Offset = Vector3.zero, Color = Color3.fromRGB(204, 216, 226), Reflectance = 0.3 },
				{ Name = "Back", Size = Vector3.new(0.2, 0.14, 0.88), Offset = Vector3.new(0, 0.08, 0.02), Color = Color3.fromRGB(58, 98, 150) },
				{ Name = "Tail", Size = Vector3.new(0.04, 0.42, 0.32), Offset = Vector3.new(0, 0, 0.6), Color = Color3.fromRGB(150, 172, 192), Wag = true },
			},
		},
	},
	-- 2
	{
		Id = "Clownfish",
		DisplayName = "Clownfish",
		Length = 1.0,
		Speed = 5,
		FleeSpeed = 14,
		TurnRate = 6,
		FleeRadius = 16,
		Behavior = "Home",
		Zone = "Reef",
		PerHome = 2,
		MaxHomes = 16,
		HomeRadius = 7,
		HeightAboveFloor = { 0.8, 6 },
		Mass = 2,
		XP = 4,
		Coins = 2,
		Hunger = 6,
		MinScale = 0,
		RespawnTime = 12,
		WagFrequency = 4,
		WagAmplitude = 0.5,
		Visual = {
			Parts = {
				{ Name = "Body", Size = Vector3.new(0.4, 0.55, 1), Offset = Vector3.zero, Color = Color3.fromRGB(255, 122, 32) },
				{ Name = "Band1", Size = Vector3.new(0.43, 0.6, 0.13), Offset = Vector3.new(0, 0, -0.2), Color = WHITE },
				{ Name = "Band2", Size = Vector3.new(0.36, 0.5, 0.12), Offset = Vector3.new(0, 0, 0.22), Color = WHITE },
				{ Name = "Dorsal", Size = Vector3.new(0.06, 0.3, 0.6), Offset = Vector3.new(0, 0.28, 0.05), Color = Color3.fromRGB(240, 104, 24) },
				{ Name = "Tail", Size = Vector3.new(0.05, 0.42, 0.3), Offset = Vector3.new(0, 0, 0.58), Color = Color3.fromRGB(240, 104, 24), Wag = true },
				{ Name = "EyeL", Shape = "Ball", Size = Vector3.new(0.09, 0.09, 0.09), Offset = Vector3.new(-0.17, 0.08, -0.3), Color = BLACK },
				{ Name = "EyeR", Shape = "Ball", Size = Vector3.new(0.09, 0.09, 0.09), Offset = Vector3.new(0.17, 0.08, -0.3), Color = BLACK },
			},
		},
	},
	-- 3
	{
		Id = "BlueTang",
		DisplayName = "Blue Tang",
		Length = 1.6,
		Speed = 8,
		FleeSpeed = 18,
		TurnRate = 4,
		FleeRadius = 20,
		Behavior = "School",
		Zone = "Reef",
		SchoolCount = 6,
		SchoolSize = { 5, 7 },
		HeightAboveFloor = { 3, 14 },
		Separation = 1.4,
		SeparationDistance = 3.2,
		Cohesion = 0.7,
		Alignment = 0.9,
		Seek = 0.7,
		Mass = 3,
		XP = 7,
		Coins = 3,
		Hunger = 10,
		MinScale = 0,
		RespawnTime = 14,
		WagFrequency = 2.6,
		WagAmplitude = 0.4,
		Visual = {
			Parts = {
				{ Name = "Body", Size = Vector3.new(0.28, 0.7, 1), Offset = Vector3.zero, Color = Color3.fromRGB(36, 86, 222) },
				{ Name = "Mark", Size = Vector3.new(0.3, 0.32, 0.62), Offset = Vector3.new(0, 0.12, 0.05), Color = Color3.fromRGB(18, 26, 60) },
				{ Name = "Dorsal", Size = Vector3.new(0.05, 0.25, 0.7), Offset = Vector3.new(0, 0.36, 0.05), Color = Color3.fromRGB(30, 60, 180) },
				{ Name = "Tail", Size = Vector3.new(0.05, 0.5, 0.32), Offset = Vector3.new(0, 0, 0.58), Color = Color3.fromRGB(255, 212, 40), Wag = true },
				{ Name = "EyeL", Shape = "Ball", Size = Vector3.new(0.07, 0.07, 0.07), Offset = Vector3.new(-0.13, 0.14, -0.33), Color = BLACK },
				{ Name = "EyeR", Shape = "Ball", Size = Vector3.new(0.07, 0.07, 0.07), Offset = Vector3.new(0.13, 0.14, -0.33), Color = BLACK },
			},
		},
	},
	-- 4
	{
		Id = "Grouper",
		DisplayName = "Grouper",
		Length = 4.2,
		Speed = 5,
		FleeSpeed = 11,
		TurnRate = 2.2,
		FleeRadius = 14,
		Behavior = "Bottom",
		Zone = "Rocks",
		Count = 10,
		HeightAboveFloor = { 1.5, 7 },
		Mass = 14,
		XP = 20,
		Coins = 8,
		Hunger = 30,
		MinScale = 1.3, -- must grow before you can eat one
		RespawnTime = 25,
		WagFrequency = 1.4,
		WagAmplitude = 0.3,
		Visual = {
			Parts = {
				{ Name = "Body", Size = Vector3.new(0.52, 0.5, 1), Offset = Vector3.zero, Color = Color3.fromRGB(128, 98, 72) },
				{ Name = "Belly", Size = Vector3.new(0.46, 0.3, 0.8), Offset = Vector3.new(0, -0.12, 0), Color = Color3.fromRGB(186, 160, 128) },
				{ Name = "Spots", Size = Vector3.new(0.54, 0.2, 0.32), Offset = Vector3.new(0, 0.1, -0.12), Color = Color3.fromRGB(94, 70, 52) },
				{ Name = "Lip", Size = Vector3.new(0.34, 0.14, 0.22), Offset = Vector3.new(0, -0.08, -0.47), Color = Color3.fromRGB(150, 118, 90) },
				{ Name = "Dorsal", Size = Vector3.new(0.05, 0.2, 0.55), Offset = Vector3.new(0, 0.27, 0.1), Color = Color3.fromRGB(100, 76, 56) },
				{ Name = "Tail", Size = Vector3.new(0.05, 0.38, 0.24), Offset = Vector3.new(0, 0, 0.6), Color = Color3.fromRGB(100, 76, 56), Wag = true },
				{ Name = "EyeL", Shape = "Ball", Size = Vector3.new(0.06, 0.06, 0.06), Offset = Vector3.new(-0.17, 0.1, -0.32), Color = BLACK },
				{ Name = "EyeR", Shape = "Ball", Size = Vector3.new(0.06, 0.06, 0.06), Offset = Vector3.new(0.17, 0.1, -0.32), Color = BLACK },
			},
		},
	},
	-- 5
	{
		Id = "Tuna",
		DisplayName = "Yellowfin Tuna",
		Length = 3.4,
		Speed = 20,
		FleeSpeed = 34,
		TurnRate = 2.6,
		FleeRadius = 30,
		Behavior = "Cruiser",
		Zone = "DropOff",
		SchoolCount = 4,
		SchoolSize = { 2, 4 },
		HeightAboveFloor = { 14, 70 },
		Separation = 1.2,
		SeparationDistance = 6,
		Cohesion = 0.8,
		Alignment = 1.1,
		Seek = 1.0,
		Mass = 9,
		XP = 14,
		Coins = 6,
		Hunger = 22,
		MinScale = 1.15,
		RespawnTime = 20,
		WagFrequency = 3.4,
		WagAmplitude = 0.3,
		Visual = {
			Parts = {
				{ Name = "Body", Size = Vector3.new(0.3, 0.34, 1), Offset = Vector3.zero, Color = Color3.fromRGB(38, 60, 110), Reflectance = 0.2 },
				{ Name = "Belly", Size = Vector3.new(0.26, 0.2, 0.86), Offset = Vector3.new(0, -0.08, 0), Color = Color3.fromRGB(204, 212, 222), Reflectance = 0.3 },
				{ Name = "Stripe", Size = Vector3.new(0.31, 0.05, 0.5), Offset = Vector3.new(0, 0, -0.05), Color = Color3.fromRGB(240, 200, 60) },
				{ Name = "Dorsal", Size = Vector3.new(0.04, 0.22, 0.22), Offset = Vector3.new(0, 0.2, -0.05), Color = Color3.fromRGB(240, 200, 60) },
				{ Name = "Tail", Size = Vector3.new(0.04, 0.55, 0.18), Offset = Vector3.new(0, 0, 0.6), Color = Color3.fromRGB(30, 50, 95), Wag = true },
				{ Name = "EyeL", Shape = "Ball", Size = Vector3.new(0.05, 0.05, 0.05), Offset = Vector3.new(-0.11, 0.04, -0.36), Color = BLACK },
				{ Name = "EyeR", Shape = "Ball", Size = Vector3.new(0.05, 0.05, 0.05), Offset = Vector3.new(0.11, 0.04, -0.36), Color = BLACK },
			},
		},
	},
}

function FishConfig.get(typeId: number)
	return FishConfig.Types[typeId]
end

return FishConfig
