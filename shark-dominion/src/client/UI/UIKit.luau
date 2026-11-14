--[[
	UIKit
	Tiny declarative helpers for building polished UI in code (no image assets
	required): rounded panels, strokes, gradients and animated stat bars.
]]

local UIKit = {}

UIKit.Font = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Bold)
UIKit.FontHeavy = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.ExtraBold)
UIKit.FontRegular = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Medium)

UIKit.Colors = {
	Panel = Color3.fromRGB(8, 28, 44),
	PanelStroke = Color3.fromRGB(120, 220, 240),
	Text = Color3.fromRGB(240, 252, 255),
	SubText = Color3.fromRGB(160, 214, 228),
	Health = { Color3.fromRGB(255, 92, 110), Color3.fromRGB(255, 150, 120) },
	Hunger = { Color3.fromRGB(255, 160, 50), Color3.fromRGB(255, 214, 90) },
	Boost = { Color3.fromRGB(40, 200, 255), Color3.fromRGB(120, 255, 230) },
	XP = { Color3.fromRGB(150, 110, 255), Color3.fromRGB(90, 200, 255) },
	Gold = Color3.fromRGB(255, 206, 64),
}

-- create("Frame", { props }, { children })
function UIKit.create(className: string, props: { [string]: any }?, children: { Instance }?)
	local inst = Instance.new(className)
	local parent = nil
	if props then
		for key, value in props do
			if key == "Parent" then
				parent = value
			else
				(inst :: any)[key] = value
			end
		end
	end
	if children then
		for _, child in children do
			child.Parent = inst
		end
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end

function UIKit.corner(radius: UDim?)
	return UIKit.create("UICorner", { CornerRadius = radius or UDim.new(0, 10) })
end

function UIKit.stroke(color: Color3?, thickness: number?, transparency: number?)
	return UIKit.create("UIStroke", {
		Color = color or UIKit.Colors.PanelStroke,
		Thickness = thickness or 1.5,
		Transparency = transparency or 0.55,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function UIKit.gradient(c0: Color3, c1: Color3, rotation: number?)
	return UIKit.create("UIGradient", {
		Color = ColorSequence.new(c0, c1),
		Rotation = rotation or 0,
	})
end

function UIKit.padding(px: number)
	local u = UDim.new(0, px)
	return UIKit.create("UIPadding", { PaddingLeft = u, PaddingRight = u, PaddingTop = u, PaddingBottom = u })
end

function UIKit.label(props: { [string]: any })
	local defaults = {
		BackgroundTransparency = 1,
		FontFace = UIKit.Font,
		TextColor3 = UIKit.Colors.Text,
		TextScaled = false,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
	}
	for k, v in props do
		defaults[k] = v
	end
	return UIKit.create("TextLabel", defaults)
end

function UIKit.panel(props: { [string]: any })
	local frame = UIKit.create("Frame", {
		BackgroundColor3 = UIKit.Colors.Panel,
		BackgroundTransparency = 0.3,
		BorderSizePixel = 0,
	})
	for k, v in props do
		(frame :: any)[k] = v
	end
	UIKit.corner(UDim.new(0, 14)).Parent = frame
	UIKit.stroke().Parent = frame
	UIKit.gradient(Color3.fromRGB(255, 255, 255), Color3.fromRGB(170, 190, 200), 90).Parent = frame
	return frame
end

-- Horizontal stat bar with icon, smoothed fill, trailing "damage" fill and value text.
function UIKit.statBar(parent: Instance, name: string, icon: string, colors: { Color3 }, layoutOrder: number)
	local holder = UIKit.create("Frame", {
		Name = name,
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 22),
		LayoutOrder = layoutOrder,
		Parent = parent,
	})
	UIKit.label({
		Name = "Icon",
		Text = icon,
		TextSize = 15,
		TextXAlignment = Enum.TextXAlignment.Center,
		Size = UDim2.new(0, 24, 1, 0),
		Parent = holder,
	})
	local track = UIKit.create("Frame", {
		Name = "Track",
		BackgroundColor3 = Color3.fromRGB(4, 14, 24),
		BackgroundTransparency = 0.25,
		BorderSizePixel = 0,
		Position = UDim2.new(0, 30, 0.5, 0),
		AnchorPoint = Vector2.new(0, 0.5),
		Size = UDim2.new(1, -30, 0, 14),
		ClipsDescendants = true,
		Parent = holder,
	}, { UIKit.corner(UDim.new(1, 0)) })
	local trail = UIKit.create("Frame", {
		Name = "Trail",
		BackgroundColor3 = Color3.fromRGB(255, 255, 255),
		BackgroundTransparency = 0.55,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(1, 1),
		Parent = track,
	}, { UIKit.corner(UDim.new(1, 0)) })
	local fill = UIKit.create("Frame", {
		Name = "Fill",
		BackgroundColor3 = Color3.new(1, 1, 1),
		BorderSizePixel = 0,
		Size = UDim2.fromScale(1, 1),
		Parent = track,
	}, { UIKit.corner(UDim.new(1, 0)), UIKit.gradient(colors[1], colors[2]) })
	local value = UIKit.label({
		Name = "Value",
		Text = "",
		TextSize = 12,
		TextXAlignment = Enum.TextXAlignment.Center,
		Size = UDim2.fromScale(1, 1),
		ZIndex = 3,
		Parent = track,
	})
	UIKit.create("UIStroke", { Thickness = 1, Transparency = 0.4, Color = Color3.new(0, 0, 0), Parent = value })

	local shown, trailShown = 1, 1
	local bar = { holder = holder, fill = fill, track = track }
	function bar.set(fraction: number, text: string, dt: number)
		fraction = math.clamp(fraction, 0, 1)
		shown += (fraction - shown) * (1 - math.exp(-14 * dt))
		if fraction < trailShown then
			trailShown += (fraction - trailShown) * (1 - math.exp(-2.5 * dt))
		else
			trailShown = shown
		end
		fill.Size = UDim2.fromScale(shown, 1)
		trail.Size = UDim2.fromScale(trailShown, 1)
		value.Text = text
	end
	return bar
end

function UIKit.formatNumber(n: number): string
	local s = tostring(math.floor(n))
	local formatted = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	if formatted:sub(1, 1) == "," then
		formatted = formatted:sub(2)
	end
	return formatted
end

return UIKit
