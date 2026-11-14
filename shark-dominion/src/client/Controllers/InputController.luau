--[[
	InputController
	Turns raw device input into a device-agnostic "intent" that the movement and
	camera controllers consume. Keyboard/mouse and gamepad are read here;
	MobileControls feeds touch input in through the setters at the bottom.

	PC: WASD / arrows swim & steer, mouse orbits the camera, wheel zooms,
	    Space ascend, Ctrl (or C / Q) descend, Shift boost, LMB (or F) bite,
	    E ability, hold Alt to free the cursor.
	Gamepad: left stick swim, right stick camera, R2/R1 bite, L2 boost,
	    A ascend, B descend, X ability.
]]

local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Signal = require(ReplicatedStorage.Shared.Util.Signal)

local InputController = {}

InputController.Bite = Signal.new()
InputController.Ability = Signal.new()
InputController.ModeChanged = Signal.new()
InputController.mode = "KeyboardMouse" -- "KeyboardMouse" | "Touch" | "Gamepad"

InputController.MOUSE_SENSITIVITY = 0.0045 -- radians per pixel
InputController.TOUCH_SENSITIVITY = 0.0075
InputController.GAMEPAD_LOOK_RATE = 3.0 -- radians per second at full deflection

local STICK_DEADZONE = 0.15
local K = Enum.KeyCode

local cameraDelta = Vector2.zero
local zoomDelta = 0
local touchMove = Vector2.zero
local touchVertical = 0
local touchBoost = false
local padMove = Vector2.zero
local padLook = Vector2.zero
local padBoost, padUp, padDown = false, false, false
local rightMouseHeld = false

local function typing(): boolean
	return UserInputService:GetFocusedTextBox() ~= nil
end

local function down(key: Enum.KeyCode): boolean
	return UserInputService:IsKeyDown(key)
end

local function deadzone(v: Vector2): Vector2
	local m = v.Magnitude
	if m < STICK_DEADZONE then
		return Vector2.zero
	end
	return v.Unit * math.min(1, (m - STICK_DEADZONE) / (1 - STICK_DEADZONE))
end

local function setMode(mode: string)
	if InputController.mode ~= mode then
		InputController.mode = mode
		InputController.ModeChanged:Fire(mode)
	end
end

local function modeFor(inputType: Enum.UserInputType): string?
	if inputType == Enum.UserInputType.Touch then
		return "Touch"
	elseif string.find(inputType.Name, "Gamepad") then
		return "Gamepad"
	elseif
		inputType == Enum.UserInputType.Keyboard
		or inputType == Enum.UserInputType.MouseMovement
		or inputType == Enum.UserInputType.MouseButton1
		or inputType == Enum.UserInputType.MouseButton2
		or inputType == Enum.UserInputType.MouseWheel
	then
		return "KeyboardMouse"
	end
	return nil
end

-- Intent getters -----------------------------------------------------------------

-- x = strafe/steer right, y = forward. Magnitude <= 1.
function InputController.getMove(): Vector2
	local v = touchMove + padMove
	if not typing() then
		local x, y = 0, 0
		if down(K.W) or down(K.Up) then
			y += 1
		end
		if down(K.S) or down(K.Down) then
			y -= 1
		end
		if down(K.D) or down(K.Right) then
			x += 1
		end
		if down(K.A) or down(K.Left) then
			x -= 1
		end
		v += Vector2.new(x, y)
	end
	if v.Magnitude > 1 then
		v = v.Unit
	end
	return v
end

-- +1 ascend, -1 descend.
function InputController.getVertical(): number
	local v = touchVertical
	if padUp then
		v += 1
	end
	if padDown then
		v -= 1
	end
	if not typing() then
		if down(K.Space) then
			v += 1
		end
		if down(K.LeftControl) or down(K.RightControl) or down(K.C) or down(K.Q) then
			v -= 1
		end
	end
	return math.clamp(v, -1, 1)
end

function InputController.isBoostHeld(): boolean
	if touchBoost or padBoost then
		return true
	end
	return not typing() and (down(K.LeftShift) or down(K.RightShift))
end

-- Accumulated camera rotation in radians since the last call (x = yaw, y = pitch).
function InputController.consumeCameraDelta(dt: number): Vector2
	local d = cameraDelta + Vector2.new(padLook.X, -padLook.Y) * InputController.GAMEPAD_LOOK_RATE * dt
	cameraDelta = Vector2.zero
	return d
end

function InputController.consumeZoom(): number
	local z = zoomDelta
	zoomDelta = 0
	return z
end

-- Locks the mouse to the screen centre while playing on PC (hold Alt to free it).
function InputController.updateMouseLock(active: boolean)
	if InputController.mode == "Touch" then
		return
	end
	local free = not active or down(K.LeftAlt) or down(K.RightAlt)
	if free then
		UserInputService.MouseBehavior = Enum.MouseBehavior.Default
		UserInputService.MouseIconEnabled = true
	else
		UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
		UserInputService.MouseIconEnabled = false
	end
end

-- Touch setters (MobileControls) --------------------------------------------------

function InputController.setTouchMove(v: Vector2)
	touchMove = v
end

function InputController.setTouchVertical(v: number)
	touchVertical = v
end

function InputController.setTouchBoost(held: boolean)
	touchBoost = held
end

function InputController.addCameraDelta(radians: Vector2)
	cameraDelta += radians
end

function InputController.addZoom(steps: number)
	zoomDelta += steps
end

function InputController.fireBite()
	InputController.Bite:Fire()
end

function InputController.fireAbility()
	InputController.Ability:Fire()
end

-- Wiring -------------------------------------------------------------------------

function InputController.init()
	if UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled then
		setMode("Touch")
	elseif UserInputService.GamepadEnabled and not UserInputService.KeyboardEnabled then
		setMode("Gamepad")
	end

	UserInputService.LastInputTypeChanged:Connect(function(inputType)
		local mode = modeFor(inputType)
		if mode then
			setMode(mode)
		end
	end)

	UserInputService.InputBegan:Connect(function(input, processed)
		local t = input.UserInputType
		local key = input.KeyCode
		if t == Enum.UserInputType.MouseButton2 then
			rightMouseHeld = true
		end
		if processed then
			return
		end
		if t == Enum.UserInputType.MouseButton1 or key == K.F or key == K.ButtonR2 or key == K.ButtonR1 then
			InputController.Bite:Fire()
		elseif key == K.E or key == K.ButtonX then
			InputController.Ability:Fire()
		elseif key == K.ButtonL2 then
			padBoost = true
		elseif key == K.ButtonA then
			padUp = true
		elseif key == K.ButtonB then
			padDown = true
		end
	end)

	UserInputService.InputEnded:Connect(function(input)
		local key = input.KeyCode
		if input.UserInputType == Enum.UserInputType.MouseButton2 then
			rightMouseHeld = false
		elseif key == K.ButtonL2 then
			padBoost = false
		elseif key == K.ButtonA then
			padUp = false
		elseif key == K.ButtonB then
			padDown = false
		elseif key == K.Thumbstick1 then
			padMove = Vector2.zero
		elseif key == K.Thumbstick2 then
			padLook = Vector2.zero
		end
	end)

	UserInputService.InputChanged:Connect(function(input, processed)
		local t = input.UserInputType
		if t == Enum.UserInputType.MouseMovement then
			if UserInputService.MouseBehavior == Enum.MouseBehavior.LockCenter or rightMouseHeld then
				cameraDelta += Vector2.new(input.Delta.X, input.Delta.Y) * InputController.MOUSE_SENSITIVITY
			end
		elseif t == Enum.UserInputType.MouseWheel then
			if not processed then
				zoomDelta += input.Position.Z
			end
		elseif input.KeyCode == K.Thumbstick1 then
			padMove = deadzone(Vector2.new(input.Position.X, input.Position.Y))
		elseif input.KeyCode == K.Thumbstick2 then
			padLook = deadzone(Vector2.new(input.Position.X, input.Position.Y))
		end
	end)
end

return InputController
