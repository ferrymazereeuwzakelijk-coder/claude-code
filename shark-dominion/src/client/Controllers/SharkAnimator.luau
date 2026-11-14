--[[
	SharkAnimator
	Procedural animation for EVERY shark (local and remote), fully separated
	from movement logic. Inputs per shark:
	  * local shark  -> SharkController.motion (zero-latency)
	  * remote shark -> replicated physics (AssemblyLinearVelocity / AngularVelocity)
	  * all sharks   -> model attributes (Boosting, BiteCount, HitCount, Dead, Scale)

	States / layers (blended, not exclusive):
	  idle swim     slow, wide tail sweeps, fin flutter, breathing jaw
	  fast swim     tail frequency rises with speed (and boost), amplitude tightens
	  turning       body curves into the turn (head leads, tail trails)
	  banking       comes from root orientation (SharkController / replication)
	  pitching      pectoral fins angle with vertical velocity
	  bite          jaw snap + head lunge (local bites play instantly)
	  damage        body shake + red flash
	  dead          rolls belly-up

	Motor6D.Transform is set in PreSimulation; it is local-only (not replicated),
	which is exactly what we want: every client animates every shark itself.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local CollectionService = game:GetService("CollectionService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local SharkConfig = require(Shared.Config.SharkConfig)
local MathUtil = require(Shared.Util.MathUtil)

local SharkController = require(script.Parent.SharkController)

local SharkAnimator = {}

local IDLE_TAIL_HZ = 0.8
local FAST_TAIL_HZ = 3.4
local ANIMATE_RADIUS = 320
local HIT_DURATION = 0.45
local BUBBLE_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds"

local localPlayer = Players.LocalPlayer
local rigs: { [Model]: any } = {}
local localBiteAt = -math.huge

local function findMotor(model: Model, name: string): Motor6D?
	local m = model:FindFirstChild(name, true)
	if m and m:IsA("Motor6D") then
		return m
	end
	return nil
end

local function flashDamage(model: Model)
	local highlight = Instance.new("Highlight")
	highlight.FillColor = Color3.fromRGB(255, 50, 50)
	highlight.OutlineTransparency = 1
	highlight.FillTransparency = 0.25
	highlight.DepthMode = Enum.HighlightDepthMode.Occluded
	highlight.Adornee = model
	highlight.Parent = model
	local tween = TweenService:Create(highlight, TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { FillTransparency = 1 })
	tween:Play()
	tween.Completed:Once(function()
		highlight:Destroy()
	end)
end

local function makeBubbles(head: BasePart): ParticleEmitter
	local attachment = Instance.new("Attachment")
	attachment.Name = "GillBubbles"
	attachment.Position = Vector3.new(0, 0, 0.8)
	attachment.Parent = head

	local e = Instance.new("ParticleEmitter")
	e.Texture = BUBBLE_TEXTURE
	e.Color = ColorSequence.new(Color3.fromRGB(220, 250, 255))
	e.LightEmission = 0.4
	e.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.15), NumberSequenceKeypoint.new(1, 0.35) })
	e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 1) })
	e.Lifetime = NumberRange.new(0.8, 1.4)
	e.Speed = NumberRange.new(1, 3)
	e.SpreadAngle = Vector2.new(60, 60)
	e.Acceleration = Vector3.new(0, 6, 0)
	e.Drag = 2
	e.Rate = 0
	e.Parent = attachment
	return e
end

local function setupRig(model: Model)
	if rigs[model] then
		return
	end
	local root = model:WaitForChild("Root", 10)
	if not root or not model.Parent then
		return
	end
	local rig = {
		model = model,
		root = root,
		isLocal = model:GetAttribute("OwnerUserId") == localPlayer.UserId,
		torso = findMotor(model, "TorsoJoint"),
		head = findMotor(model, "HeadJoint"),
		jaw = findMotor(model, "JawJoint"),
		tail1 = findMotor(model, "Tail1Joint"),
		tail2 = findMotor(model, "Tail2Joint"),
		caudal = findMotor(model, "CaudalJoint"),
		finL = findMotor(model, "PectoralLJoint"),
		finR = findMotor(model, "PectoralRJoint"),
		phase = math.random() * math.pi * 2,
		seed = math.random() * 100,
		freq = IDLE_TAIL_HZ,
		yawRate = 0,
		biteT = -1,
		hitT = -1,
		deadBlend = 0,
		connections = {},
	}
	local head = model:FindFirstChild("Head")
	if head and head:IsA("BasePart") then
		rig.bubbles = makeBubbles(head)
	end

	table.insert(rig.connections, model:GetAttributeChangedSignal("BiteCount"):Connect(function()
		-- The local shark already played its bite instantly; skip the server echo.
		if rig.isLocal and os.clock() - localBiteAt < 0.45 then
			return
		end
		rig.biteT = 0
	end))
	table.insert(rig.connections, model:GetAttributeChangedSignal("HitCount"):Connect(function()
		rig.hitT = 0
		flashDamage(model)
	end))

	rigs[model] = rig
end

local function teardown(model: Model)
	local rig = rigs[model]
	if rig then
		for _, c in rig.connections do
			c:Disconnect()
		end
		rigs[model] = nil
	end
end

local function animate(rig, dt: number, now: number, camPos: Vector3)
	local model, root = rig.model, rig.root
	if (root.Position - camPos).Magnitude > ANIMATE_RADIUS then
		return
	end

	local scale = model:GetAttribute("Scale") or 1
	local mv = SharkConfig.getMovement(scale, model:GetAttribute("Species"))

	local speed, yawRate, vertical, boosting
	if rig.isLocal then
		local m = SharkController.motion
		speed, yawRate = m.speed, m.yawRate
		boosting = m.boosting or m.dashing
	else
		speed = root.AssemblyLinearVelocity.Magnitude
		yawRate = root.AssemblyAngularVelocity.Y
		boosting = model:GetAttribute("Boosting") or model:GetAttribute("AbilityActive")
	end
	vertical = root.AssemblyLinearVelocity.Y

	rig.yawRate = MathUtil.damp(rig.yawRate, yawRate, 8, dt)
	local speed01 = math.clamp(speed / mv.Boost, 0, 1)

	-- Tail beat frequency follows speed; bigger sharks beat slower.
	local freq = MathUtil.lerp(IDLE_TAIL_HZ, FAST_TAIL_HZ, speed01) * (if boosting then 1.2 else 1) / (0.8 + 0.2 * scale)
	rig.freq = MathUtil.damp(rig.freq, freq, 3, dt) -- smooth so the phase never jumps
	rig.phase += rig.freq * math.pi * 2 * dt
	local ph = rig.phase
	local amp = MathUtil.lerp(0.3, 0.22, speed01) + (if boosting then 0.06 else 0)
	local bend = math.clamp(rig.yawRate * 0.11, -0.34, 0.34)

	-- Bite
	local bite = 0
	if rig.biteT >= 0 then
		rig.biteT += dt
		local u = rig.biteT / SharkConfig.Bite.Duration
		if u >= 1 then
			rig.biteT = -1
		elseif u < 0.3 then
			bite = u / 0.3
		else
			bite = (1 - (u - 0.3) / 0.7) ^ 2
		end
	end

	-- Damage
	local hitYaw, hitRoll = 0, 0
	if rig.hitT >= 0 then
		rig.hitT += dt
		local u = rig.hitT / HIT_DURATION
		if u >= 1 then
			rig.hitT = -1
		else
			local decay = 1 - u
			hitYaw = math.sin(rig.hitT * 55) * 0.16 * decay
			hitRoll = math.sin(rig.hitT * 40) * 0.12 * decay
		end
	end

	rig.deadBlend = MathUtil.damp(rig.deadBlend, if model:GetAttribute("Dead") then 1 else 0, 1.5, dt)
	local deadFactor = 1 - rig.deadBlend
	amp *= deadFactor
	bend *= deadFactor

	local breathe = 0.035 + 0.025 * math.sin(now * 1.7 + rig.seed)

	if rig.torso then
		rig.torso.Transform = CFrame.Angles(0, math.sin(ph) * amp * 0.12 + bend * 0.15 + hitYaw, rig.deadBlend * math.pi + hitRoll)
	end
	if rig.head then
		rig.head.Transform = CFrame.new(0, 0, -0.35 * bite * scale)
			* CFrame.Angles(0.12 * bite, -math.sin(ph + 0.4) * amp * 0.18 + bend * 0.45, 0)
	end
	if rig.jaw then
		rig.jaw.Transform = CFrame.Angles(-(breathe + 0.65 * bite), 0, 0)
	end
	if rig.tail1 then
		rig.tail1.Transform = CFrame.Angles(0, math.sin(ph - 0.9) * amp * 0.55 - bend * 0.45, 0)
	end
	if rig.tail2 then
		rig.tail2.Transform = CFrame.Angles(0, math.sin(ph - 1.7) * amp * 0.85 - bend * 0.55, 0)
	end
	if rig.caudal then
		rig.caudal.Transform = CFrame.Angles(0, math.sin(ph - 2.5) * amp * 1.05 - bend * 0.35, 0)
	end

	-- Pectoral fins: angle of attack follows climb/dive, flutter when slow.
	local attack = math.clamp(-vertical * 0.03, -0.4, 0.4) * deadFactor
	local flap = (math.sin(now * 2.2 + rig.seed) * 0.08 * (1 - speed01) + speed01 * 0.12) * deadFactor
	if rig.finL then
		rig.finL.Transform = CFrame.Angles(0, attack, -flap)
	end
	if rig.finR then
		rig.finR.Transform = CFrame.Angles(0, -attack, flap)
	end

	if rig.bubbles then
		rig.bubbles.Rate = if rig.deadBlend > 0.5 then 2 elseif boosting then 28 else speed01 * 4
	end
end

local function step(dt: number)
	local now = os.clock()
	local camPos = workspace.CurrentCamera.CFrame.Position
	for model, rig in rigs do
		if not model.Parent or not rig.root.Parent then
			teardown(model)
		else
			animate(rig, dt, now, camPos)
		end
	end
end

function SharkAnimator.init()
	CollectionService:GetInstanceAddedSignal("Shark"):Connect(function(model)
		task.spawn(setupRig, model)
	end)
	CollectionService:GetInstanceRemovedSignal("Shark"):Connect(teardown)
	for _, model in CollectionService:GetTagged("Shark") do
		task.spawn(setupRig, model)
	end

	SharkController.LocalBite:Connect(function()
		localBiteAt = os.clock()
		local model = SharkController.model
		local rig = model and rigs[model]
		if rig then
			rig.biteT = 0
		end
	end)

	RunService.PreSimulation:Connect(step)
end

return SharkAnimator
