--[[
	LightingSetup
	Server-side baseline grade for the underwater reef. The client layers a
	depth-dependent grade on top (client/Controllers/EnvironmentFX).
	Lighting.Technology = Future is set in default.project.json (not scriptable).
]]

local Lighting = game:GetService("Lighting")

local LightingSetup = {}

local function ensure(className: string, name: string)
	local existing = Lighting:FindFirstChild(name)
	if existing and existing.ClassName == className then
		return existing
	end
	if existing then
		existing:Destroy()
	end
	local inst = Instance.new(className)
	inst.Name = name
	inst.Parent = Lighting
	return inst
end

function LightingSetup.apply()
	Lighting.Ambient = Color3.fromRGB(46, 78, 96)
	Lighting.OutdoorAmbient = Color3.fromRGB(84, 134, 152)
	Lighting.Brightness = 2.4
	Lighting.ClockTime = 12.6
	Lighting.GeographicLatitude = 18
	Lighting.EnvironmentDiffuseScale = 0.5
	Lighting.EnvironmentSpecularScale = 0.6
	Lighting.GlobalShadows = true
	Lighting.ShadowSoftness = 0.35
	Lighting.ExposureCompensation = 0.15

	-- Remove stray default post effects so the grade below is the only one.
	for _, child in Lighting:GetChildren() do
		if
			(child:IsA("PostEffect") or child:IsA("Atmosphere"))
			and not string.find(child.Name, "^Reef")
		then
			child:Destroy()
		end
	end

	local atmosphere = ensure("Atmosphere", "ReefAtmosphere")
	atmosphere.Density = 0.42
	atmosphere.Offset = 0.15
	atmosphere.Color = Color3.fromRGB(70, 160, 186)
	atmosphere.Decay = Color3.fromRGB(22, 78, 104)
	atmosphere.Glare = 0
	atmosphere.Haze = 2.2

	local grade = ensure("ColorCorrectionEffect", "ReefGrade")
	grade.Brightness = 0.02
	grade.Contrast = 0.1
	grade.Saturation = 0.12
	grade.TintColor = Color3.fromRGB(222, 244, 248)

	local bloom = ensure("BloomEffect", "ReefBloom")
	bloom.Intensity = 0.55
	bloom.Size = 28
	bloom.Threshold = 1.4

	local rays = ensure("SunRaysEffect", "ReefSunRays")
	rays.Intensity = 0.05
	rays.Spread = 0.6
end

return LightingSetup
