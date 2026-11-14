--[[
	MobileControls
	Touch layout (only visible while the last input was touch):
	  left half   floating virtual joystick (appears where the thumb lands)
	  right half  swipe to orbit the camera, pinch to zoom
	  bottom-right arc of buttons: BITE (large), BOOST (hold), DASH (ability),
	               ▲ ascend (hold), ▼ descend (hold)
	Every button tracks its own InputObject, so sliding a finger off a held
	button can never leave it stuck down.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local InputController = require(script.Parent.Parent.Controllers.InputController)
local UIKit = require(script.Parent.UIKit)

local player = Players.LocalPlayer
local create = UIKit.create

local MobileControls = {}

local JOY_RADIUS = 64
local JOY_DEADZONE = 0.12
local BUTTON_CENTER = Vector2.new(-92, -92) -- bite button centre from the bottom-right corner
local ARC_RADIUS = 138

local gui: ScreenGui
local joyBase: Frame
local joyKnob: Frame
local moveTouch: InputObject? = nil
local moveOrigin = Vector2.zero
local camTouch: InputObject? = nil
local camLast = Vector2.zero
local heldInputs: { [InputObject]: (boolean) -> () } = {}

local function roundButton(name: string, text: string, size: number, offset: Vector2, colors: { Color3 }, textSize: number)
	local button = create("TextButton", {
		Name = name,
		Text = text,
		FontFace = UIKit.FontHeavy,
		TextSize = textSize,
		TextColor3 = Color3.new(1, 1, 1),
		AutoButtonColor = false,
		BackgroundColor3 = Color3.new(1, 1, 1),
		BackgroundTransparency = 0.15,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(1, offset.X, 1, offset.Y),
		Size = UDim2.new(0, size, 0, size),
		Parent = gui,
	}, {
		UIKit.corner(UDim.new(1, 0)),
		UIKit.gradient(colors[1], colors[2], 60),
		UIKit.stroke(Color3.new(1, 1, 1), 2.5, 0.35),
	})
	create("UIStroke", { Thickness = 1.5, Transparency = 0.4, Color = Color3.new(0, 0, 0), ApplyStrokeMode = Enum.ApplyStrokeMode.Contextual, Parent = button })
	local scale = create("UIScale", { Parent = button })
	return button, scale
end

local function bindHold(button: GuiButton, scale: UIScale, onChange: (boolean) -> ())
	button.InputBegan:Connect(function(input)
		local t = input.UserInputType
		if t == Enum.UserInputType.Touch or t == Enum.UserInputType.MouseButton1 then
			scale.Scale = 0.9
			heldInputs[input] = function(held)
				scale.Scale = if held then 0.9 else 1
				onChange(held)
			end
			onChange(true)
		end
	end)
end

local function bindTap(button: GuiButton, scale: UIScale, onTap: () -> ())
	bindHold(button, scale, function(held)
		if held then
			onTap()
		end
	end)
end

local function arcOffset(degrees: number): Vector2
	local r = math.rad(degrees)
	return BUTTON_CENTER + Vector2.new(-math.cos(r) * ARC_RADIUS, -math.sin(r) * ARC_RADIUS)
end

local function releaseMove()
	moveTouch = nil
	joyBase.Visible = false
	InputController.setTouchMove(Vector2.zero)
end

function MobileControls.init()
	gui = create("ScreenGui", {
		Name = "SharkMobileControls",
		ResetOnSpawn = false,
		IgnoreGuiInset = false, -- GUI coordinates match InputObject.Position
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = 5,
		Enabled = InputController.mode == "Touch",
		Parent = player:WaitForChild("PlayerGui"),
	})

	joyBase = create("Frame", {
		Name = "JoystickBase",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Size = UDim2.new(0, JOY_RADIUS * 2.3, 0, JOY_RADIUS * 2.3),
		BackgroundColor3 = Color3.fromRGB(8, 28, 44),
		BackgroundTransparency = 0.55,
		Visible = false,
		Parent = gui,
	}, { UIKit.corner(UDim.new(1, 0)), UIKit.stroke(Color3.fromRGB(160, 240, 255), 2, 0.4) })
	joyKnob = create("Frame", {
		Name = "Knob",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.new(0, 58, 0, 58),
		BackgroundColor3 = Color3.fromRGB(220, 250, 255),
		BackgroundTransparency = 0.15,
		Parent = joyBase,
	}, { UIKit.corner(UDim.new(1, 0)) })

	local bite, biteScale = roundButton("Bite", "BITE", 108, BUTTON_CENTER, { Color3.fromRGB(255, 80, 90), Color3.fromRGB(200, 30, 60) }, 24)
	local boost, boostScale = roundButton("Boost", "BOOST", 74, arcOffset(0), { Color3.fromRGB(40, 200, 255), Color3.fromRGB(20, 120, 220) }, 15)
	local dash, dashScale = roundButton("Ability", "DASH", 66, arcOffset(34), { Color3.fromRGB(170, 110, 255), Color3.fromRGB(100, 60, 220) }, 15)
	local down, downScale = roundButton("Descend", "▼", 62, arcOffset(64), { Color3.fromRGB(60, 90, 120), Color3.fromRGB(30, 50, 80) }, 22)
	local up, upScale = roundButton("Ascend", "▲", 62, arcOffset(94), { Color3.fromRGB(60, 90, 120), Color3.fromRGB(30, 50, 80) }, 22)

	bindTap(bite, biteScale, InputController.fireBite)
	bindTap(dash, dashScale, InputController.fireAbility)
	bindHold(boost, boostScale, InputController.setTouchBoost)

	local upHeld, downHeld = false, false
	local function syncVertical()
		InputController.setTouchVertical((if upHeld then 1 else 0) - (if downHeld then 1 else 0))
	end
	bindHold(up, upScale, function(held)
		upHeld = held
		syncVertical()
	end)
	bindHold(down, downScale, function(held)
		downHeld = held
		syncVertical()
	end)

	-- Joystick + camera swipe -------------------------------------------------------
	UserInputService.TouchStarted:Connect(function(touch, processed)
		if processed or InputController.mode ~= "Touch" then
			return
		end
		local pos = Vector2.new(touch.Position.X, touch.Position.Y)
		local viewport = workspace.CurrentCamera.ViewportSize
		if pos.X < viewport.X * 0.45 and not moveTouch then
			moveTouch = touch
			moveOrigin = pos
			joyBase.Position = UDim2.fromOffset(pos.X, pos.Y)
			joyKnob.Position = UDim2.fromScale(0.5, 0.5)
			joyBase.Visible = true
		elseif not camTouch then
			camTouch = touch
			camLast = pos
		end
	end)

	UserInputService.TouchMoved:Connect(function(touch)
		local pos = Vector2.new(touch.Position.X, touch.Position.Y)
		if touch == moveTouch then
			local delta = pos - moveOrigin
			if delta.Magnitude > JOY_RADIUS then
				delta = delta.Unit * JOY_RADIUS
			end
			joyKnob.Position = UDim2.new(0.5, delta.X, 0.5, delta.Y)
			local v = Vector2.new(delta.X, -delta.Y) / JOY_RADIUS
			InputController.setTouchMove(if v.Magnitude < JOY_DEADZONE then Vector2.zero else v)
		elseif touch == camTouch then
			local delta = pos - camLast
			camLast = pos
			InputController.addCameraDelta(delta * InputController.TOUCH_SENSITIVITY)
		end
	end)

	local function onTouchEnded(touch: InputObject)
		local release = heldInputs[touch]
		if release then
			heldInputs[touch] = nil
			release(false)
		end
		if touch == moveTouch then
			releaseMove()
		elseif touch == camTouch then
			camTouch = nil
		end
	end
	UserInputService.TouchEnded:Connect(onTouchEnded)
	UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			onTouchEnded(input)
		end
	end)

	-- Pinch zoom (only when no joystick touch is active)
	UserInputService.TouchPinch:Connect(function(_, scale, velocity, state, processed)
		if processed or moveTouch or state ~= Enum.UserInputState.Change then
			return
		end
		InputController.addZoom(velocity * 0.6)
	end)

	InputController.ModeChanged:Connect(function(mode)
		gui.Enabled = mode == "Touch"
		if mode ~= "Touch" then
			releaseMove()
			camTouch = nil
			InputController.setTouchBoost(false)
			InputController.setTouchVertical(0)
		end
	end)
end

return MobileControls
