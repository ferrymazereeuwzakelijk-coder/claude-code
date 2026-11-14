--[[
	FeedbackFX
	Connects gameplay events to juice:
	  fish eaten (anyone)  -> pooled particle burst (cloud + bits + bubbles) at the fish
	  my reward            -> HUD popup, coin pulse, small camera kick
	  too big              -> toast
	  my bite              -> tiny camera kick
	  damaged              -> red vignette + shake
	  level up / evolve    -> banner
	  died                 -> death overlay
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local FishConfig = require(Shared.Config.FishConfig)
local Remotes = require(Shared.Net.Remotes)

local Controllers = script.Parent.Parent.Controllers
local CameraController = require(Controllers.CameraController)
local SharkController = require(Controllers.SharkController)
local FishRenderer = require(Controllers.FishRenderer)
local HUD = require(script.Parent.HUD)

local player = Players.LocalPlayer

local FeedbackFX = {}

local POOL_SIZE = 8
local pool = {}
local nextIndex = 1

local function emitter(parent: Attachment, props)
	local e = Instance.new("ParticleEmitter")
	e.Enabled = false
	e.LightInfluence = 0.4
	for k, v in props do
		(e :: any)[k] = v
	end
	e.Parent = parent
	return e
end

local function buildPool()
	local anchor = Instance.new("Part")
	anchor.Name = "FeedbackFX"
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.CanTouch = false
	anchor.Transparency = 1
	anchor.Size = Vector3.one
	anchor.CFrame = CFrame.identity
	anchor.Parent = workspace

	for i = 1, POOL_SIZE do
		local a = Instance.new("Attachment")
		a.Parent = anchor
		pool[i] = {
			attachment = a,
			cloud = emitter(a, {
				Texture = "rbxasset://textures/particles/smoke_main.dds",
				Color = ColorSequence.new(Color3.fromRGB(190, 40, 50), Color3.fromRGB(120, 20, 40)),
				Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 4.5) }),
				Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.55), NumberSequenceKeypoint.new(1, 1) }),
				Lifetime = NumberRange.new(1.2, 1.8),
				Speed = NumberRange.new(1.5, 4),
				SpreadAngle = Vector2.new(180, 180),
				Drag = 3,
				RotSpeed = NumberRange.new(-40, 40),
			}),
			bits = emitter(a, {
				Texture = "rbxasset://textures/particles/sparkles_main.dds",
				Color = ColorSequence.new(Color3.fromRGB(255, 230, 220)),
				Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 0.05) }),
				Lifetime = NumberRange.new(0.5, 0.9),
				Speed = NumberRange.new(6, 12),
				SpreadAngle = Vector2.new(180, 180),
				Drag = 5,
				LightEmission = 0.6,
			}),
			bubbles = emitter(a, {
				Texture = "rbxasset://textures/particles/sparkles_main.dds",
				Color = ColorSequence.new(Color3.fromRGB(220, 250, 255)),
				Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 0.4) }),
				Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) }),
				Lifetime = NumberRange.new(1, 1.8),
				Speed = NumberRange.new(2, 5),
				SpreadAngle = Vector2.new(70, 70),
				Acceleration = Vector3.new(0, 8, 0),
				EmissionDirection = Enum.NormalId.Top,
				Drag = 1.5,
				LightEmission = 0.4,
			}),
		}
	end
end

local function burst(position: Vector3, typeId: number)
	local cfg = FishConfig.get(typeId)
	local size = if cfg then cfg.Length else 1
	local fx = pool[nextIndex]
	nextIndex = nextIndex % POOL_SIZE + 1
	fx.attachment.WorldPosition = position
	fx.cloud:Emit(math.floor(4 + size * 3))
	fx.bits:Emit(math.floor(8 + size * 4))
	fx.bubbles:Emit(math.floor(6 + size * 2))
end

function FeedbackFX.init()
	buildPool()

	FishRenderer.FishEaten:Connect(function(_, position, typeId, eaterUserId)
		local camPos = workspace.CurrentCamera.CFrame.Position
		if (position - camPos).Magnitude < 220 then
			burst(position, typeId)
		end
		if eaterUserId == player.UserId then
			CameraController.addShake(0.18)
		end
	end)

	SharkController.LocalBite:Connect(function()
		CameraController.addShake(0.08)
	end)

	SharkController.LocalAbility:Connect(function()
		CameraController.addShake(0.2)
	end)

	local lastTooBig = 0
	Remotes.get("RewardFeedback").OnClientEvent:Connect(function(data)
		if type(data) ~= "table" then
			return
		end
		if data.Kind == "Eat" then
			HUD.showReward(data)
		elseif data.Kind == "TooBig" and os.clock() - lastTooBig > 1.5 then
			lastTooBig = os.clock()
			local cfg = FishConfig.get(data.FishType)
			HUD.showToast(
				`{if cfg then cfg.DisplayName else "That fish"} is too big — grow to size ×{string.format("%.2f", data.Needed or 0)}`,
				Color3.fromRGB(255, 120, 120)
			)
		end
	end)

	Remotes.get("SharkEvent").OnClientEvent:Connect(function(kind, data)
		data = if type(data) == "table" then data else {}
		if kind == "Damaged" then
			HUD.flashDamage(0.8)
			CameraController.addShake(0.35)
		elseif kind == "Died" then
			HUD.showDeath(data.Cause, data.RespawnIn)
			CameraController.addShake(0.5)
		elseif kind == "LevelUp" then
			HUD.showBanner(`LEVEL {data.Level}`, "Your shark grows stronger", Color3.fromRGB(255, 214, 90))
		elseif kind == "Evolved" then
			task.delay(1.2, function()
				HUD.showBanner("EVOLVED!", `You are now a {data.Name}`, Color3.fromRGB(120, 255, 220))
			end)
		end
	end)
end

return FeedbackFX
