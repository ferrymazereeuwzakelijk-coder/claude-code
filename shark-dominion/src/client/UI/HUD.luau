--[[
	HUD
	Mobile-responsive game HUD built in code:
	  top-left    species + level badge + XP bar, then Health / Hunger / Boost bars
	  top-centre  mass and size
	  top-right   coins, control hints (PC)
	  bottom      ability slot with cooldown (PC / gamepad; mobile uses its button)
	  centre      reward popups, level-up / evolution banners, toasts
	  overlays    damage vignette, death screen, loading screen
	  world       target ring on the fish your bite would hit (green = edible & in
	              range, white = edible, red = too big for you)
	A UIScale keeps everything proportional from phones to ultrawide monitors.
	All numbers come from server-replicated attributes; boost uses the locally
	predicted stamina so the bar responds instantly.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage.Shared
local SharkConfig = require(Shared.Config.SharkConfig)
local FishConfig = require(Shared.Config.FishConfig)
local SharkRig = require(Shared.SharkRig)

local Controllers = script.Parent.Parent.Controllers
local InputController = require(Controllers.InputController)
local SharkController = require(Controllers.SharkController)
local FishRenderer = require(Controllers.FishRenderer)
local UIKit = require(script.Parent.UIKit)

local player = Players.LocalPlayer
local C = UIKit.Colors
local create, label = UIKit.create, UIKit.label

local HUD = {}

local gui: ScreenGui
local uiScale: UIScale
local refs = {}
local bars = {}
local popupQueue = 0
local displayedCoins = 0
local deathUntil = 0

local function attr(name: string, default: any)
	local v = player:GetAttribute(name)
	if v == nil then
		return default
	end
	return v
end

-- Build ---------------------------------------------------------------------------------

local function buildProfileCard(root: Frame)
	local card = UIKit.panel({
		Name = "ProfileCard",
		Position = UDim2.new(0, 16, 0, 16),
		Size = UDim2.new(0, 320, 0, 158),
		Parent = root,
	})
	UIKit.padding(12).Parent = card

	local badge = create("Frame", {
		Name = "LevelBadge",
		Size = UDim2.new(0, 48, 0, 48),
		BackgroundColor3 = Color3.new(1, 1, 1),
		Parent = card,
	}, { UIKit.corner(UDim.new(1, 0)), UIKit.gradient(C.XP[1], C.XP[2], 45), UIKit.stroke(Color3.new(1, 1, 1), 2, 0.3) })
	refs.level = label({
		Text = "1",
		FontFace = UIKit.FontHeavy,
		TextSize = 22,
		TextXAlignment = Enum.TextXAlignment.Center,
		Size = UDim2.fromScale(1, 1),
		Parent = badge,
	})

	refs.species = label({
		Text = "REEF SHARK",
		FontFace = UIKit.FontHeavy,
		TextSize = 18,
		Position = UDim2.new(0, 60, 0, 2),
		Size = UDim2.new(1, -60, 0, 20),
		Parent = card,
	})
	refs.xpText = label({
		Text = "0 / 40 XP",
		FontFace = UIKit.FontRegular,
		TextColor3 = C.SubText,
		TextSize = 12,
		TextXAlignment = Enum.TextXAlignment.Right,
		Position = UDim2.new(0, 60, 0, 4),
		Size = UDim2.new(1, -60, 0, 16),
		Parent = card,
	})
	local xpTrack = create("Frame", {
		BackgroundColor3 = Color3.fromRGB(4, 14, 24),
		BackgroundTransparency = 0.25,
		BorderSizePixel = 0,
		Position = UDim2.new(0, 60, 0, 28),
		Size = UDim2.new(1, -60, 0, 10),
		ClipsDescendants = true,
		Parent = card,
	}, { UIKit.corner(UDim.new(1, 0)) })
	refs.xpFill = create("Frame", {
		BackgroundColor3 = Color3.new(1, 1, 1),
		BorderSizePixel = 0,
		Size = UDim2.fromScale(0, 1),
		Parent = xpTrack,
	}, { UIKit.corner(UDim.new(1, 0)), UIKit.gradient(C.XP[1], C.XP[2]) })

	local vitals = create("Frame", {
		Name = "Vitals",
		BackgroundTransparency = 1,
		Position = UDim2.new(0, 0, 0, 58),
		Size = UDim2.new(1, 0, 0, 76),
		Parent = card,
	}, { create("UIListLayout", { Padding = UDim.new(0, 5), SortOrder = Enum.SortOrder.LayoutOrder }) })
	bars.health = UIKit.statBar(vitals, "Health", "❤", C.Health, 1)
	bars.hunger = UIKit.statBar(vitals, "Hunger", "🍖", C.Hunger, 2)
	bars.boost = UIKit.statBar(vitals, "Boost", "⚡", C.Boost, 3)
end

local function buildMassPill(root: Frame)
	local pill = UIKit.panel({
		Name = "Mass",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 16),
		Size = UDim2.new(0, 210, 0, 54),
		Parent = root,
	})
	refs.mass = label({
		Text = "20.0 kg",
		FontFace = UIKit.FontHeavy,
		TextSize = 24,
		TextXAlignment = Enum.TextXAlignment.Center,
		Position = UDim2.new(0, 0, 0, 4),
		Size = UDim2.new(1, 0, 0, 28),
		Parent = pill,
	})
	refs.size = label({
		Text = "MASS  ·  SIZE ×1.00",
		FontFace = UIKit.FontRegular,
		TextColor3 = C.SubText,
		TextSize = 12,
		TextXAlignment = Enum.TextXAlignment.Center,
		Position = UDim2.new(0, 0, 0, 32),
		Size = UDim2.new(1, 0, 0, 16),
		Parent = pill,
	})
end

local function buildCoins(root: Frame)
	local pill = UIKit.panel({
		Name = "Coins",
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -16, 0, 16),
		Size = UDim2.new(0, 150, 0, 44),
		Parent = root,
	})
	local coin = create("Frame", {
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 10, 0.5, 0),
		Size = UDim2.new(0, 26, 0, 26),
		BackgroundColor3 = Color3.new(1, 1, 1),
		Parent = pill,
	}, {
		UIKit.corner(UDim.new(1, 0)),
		UIKit.gradient(Color3.fromRGB(255, 236, 140), Color3.fromRGB(230, 160, 30), 45),
		UIKit.stroke(Color3.fromRGB(150, 90, 10), 2, 0),
	})
	label({ Text = "S", FontFace = UIKit.FontHeavy, TextSize = 15, TextColor3 = Color3.fromRGB(140, 80, 10), TextXAlignment = Enum.TextXAlignment.Center, Size = UDim2.fromScale(1, 1), Parent = coin })
	refs.coinPill = pill
	refs.coins = label({
		Text = "0",
		FontFace = UIKit.FontHeavy,
		TextSize = 22,
		TextXAlignment = Enum.TextXAlignment.Right,
		Position = UDim2.new(0, 40, 0, 0),
		Size = UDim2.new(1, -52, 1, 0),
		Parent = pill,
	})
	refs.coinScale = create("UIScale", { Parent = pill })

	refs.hints = label({
		Name = "Hints",
		Text = "WASD swim · Mouse look · Space/Ctrl up/down · Shift boost · LMB bite · E dash · Alt cursor",
		FontFace = UIKit.FontRegular,
		TextColor3 = C.SubText,
		TextTransparency = 0.15,
		TextSize = 12,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Right,
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -16, 0, 66),
		Size = UDim2.new(0, 260, 0, 34),
		Parent = root,
	})
end

local function buildAbility(root: Frame)
	local slot = UIKit.panel({
		Name = "Ability",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -18),
		Size = UDim2.new(0, 210, 0, 50),
		ClipsDescendants = true,
		Parent = root,
	})
	refs.abilityCooldown = create("Frame", {
		BackgroundColor3 = Color3.fromRGB(0, 0, 0),
		BackgroundTransparency = 0.45,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(0, 1),
		ZIndex = 2,
		Parent = slot,
	})
	local key = create("Frame", {
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 10, 0.5, 0),
		Size = UDim2.new(0, 32, 0, 32),
		BackgroundColor3 = Color3.fromRGB(240, 250, 255),
		ZIndex = 3,
		Parent = slot,
	}, { UIKit.corner(UDim.new(0, 8)) })
	refs.abilityKey = label({
		Text = SharkConfig.Ability.Key,
		FontFace = UIKit.FontHeavy,
		TextColor3 = C.Panel,
		TextSize = 18,
		TextXAlignment = Enum.TextXAlignment.Center,
		Size = UDim2.fromScale(1, 1),
		ZIndex = 3,
		Parent = key,
	})
	refs.abilityName = label({
		Text = string.upper(SharkConfig.Ability.Name),
		FontFace = UIKit.FontHeavy,
		TextSize = 16,
		Position = UDim2.new(0, 52, 0, 0),
		Size = UDim2.new(1, -60, 1, 0),
		ZIndex = 3,
		Parent = slot,
	})
	refs.abilitySlot = slot
end

local function buildOverlays(root: Frame)
	-- Damage vignette: four edge gradients
	local vignette = create("Frame", { Name = "Vignette", BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), ZIndex = 20, Parent = root })
	local edges = {
		{ UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.22), 90 },
		{ UDim2.fromScale(0, 0.78), UDim2.fromScale(1, 0.22), -90 },
		{ UDim2.fromScale(0, 0), UDim2.fromScale(0.16, 1), 0 },
		{ UDim2.fromScale(0.84, 0), UDim2.fromScale(0.16, 1), 180 },
	}
	refs.vignetteEdges = {}
	for _, e in edges do
		local f = create("Frame", {
			BackgroundColor3 = Color3.fromRGB(200, 0, 20),
			BorderSizePixel = 0,
			Position = e[1],
			Size = e[2],
			BackgroundTransparency = 1,
			ZIndex = 20,
			Parent = vignette,
		})
		create("UIGradient", {
			Rotation = e[3],
			Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) }),
			Parent = f,
		})
		table.insert(refs.vignetteEdges, f)
	end
	refs.vignetteAlpha = 0
	refs.starveAlpha = 0

	-- Popups / banners / toasts
	refs.popups = create("Frame", {
		Name = "Popups",
		BackgroundTransparency = 1,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.62),
		Size = UDim2.new(0, 400, 0, 200),
		ZIndex = 10,
		Parent = root,
	})
	refs.banner = label({
		Name = "Banner",
		Text = "",
		FontFace = UIKit.FontHeavy,
		TextSize = 44,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.26),
		Size = UDim2.new(0, 700, 0, 52),
		TextTransparency = 1,
		ZIndex = 12,
		Parent = root,
	})
	refs.bannerStroke = create("UIStroke", { Thickness = 3, Transparency = 1, Color = Color3.fromRGB(10, 30, 60), Parent = refs.banner })
	refs.bannerSub = label({
		Text = "",
		FontFace = UIKit.Font,
		TextSize = 20,
		TextColor3 = C.SubText,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.26),
		Size = UDim2.new(0, 700, 0, 24),
		TextTransparency = 1,
		ZIndex = 12,
		Parent = root,
	})
	refs.bannerSub.Position = UDim2.new(0.5, 0, 0.26, 42)
	refs.toast = label({
		Text = "",
		FontFace = UIKit.Font,
		TextSize = 18,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.74),
		Size = UDim2.new(0, 600, 0, 24),
		TextTransparency = 1,
		ZIndex = 12,
		Parent = root,
	})
	refs.toastStroke = create("UIStroke", { Thickness = 2, Transparency = 1, Parent = refs.toast })

	-- Death / loading screen
	refs.overlay = create("Frame", {
		Name = "Overlay",
		BackgroundColor3 = Color3.fromRGB(2, 16, 28),
		BackgroundTransparency = 0.25,
		Size = UDim2.fromScale(1, 1),
		ZIndex = 30,
		Visible = true,
		Parent = root,
	})
	refs.overlayTitle = label({
		Text = "SHARK DOMINION",
		FontFace = UIKit.FontHeavy,
		TextSize = 48,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.45),
		Size = UDim2.new(1, 0, 0, 56),
		ZIndex = 31,
		Parent = refs.overlay,
	})
	refs.overlaySub = label({
		Text = "Growing the reef…",
		FontFace = UIKit.Font,
		TextColor3 = C.SubText,
		TextSize = 20,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.45, 48),
		Size = UDim2.new(1, 0, 0, 26),
		ZIndex = 31,
		Parent = refs.overlay,
	})
end

local function buildTargetRing()
	local billboard = create("BillboardGui", {
		Name = "BiteTarget",
		AlwaysOnTop = true,
		LightInfluence = 0,
		Size = UDim2.fromScale(3, 3),
		ResetOnSpawn = false,
		Enabled = false,
		Parent = player:WaitForChild("PlayerGui"),
	})
	local ring = create("Frame", {
		BackgroundTransparency = 1,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromScale(1, 1),
		Parent = billboard,
	}, { UIKit.corner(UDim.new(1, 0)) })
	refs.targetStroke = create("UIStroke", { Thickness = 3, Color = Color3.new(1, 1, 1), Transparency = 0.1, Parent = ring })
	refs.target = billboard
	refs.targetRing = ring
end

-- Public feedback API -------------------------------------------------------------------

function HUD.showReward(data)
	local container = refs.popups
	local fish = FishConfig.get(data.FishType)
	local text = `+{data.Mass} MASS   +{data.XP} XP   +{data.Coins} COINS`
	local slot = popupQueue % 4
	popupQueue += 1

	local popup = label({
		Text = text,
		FontFace = UIKit.FontHeavy,
		TextSize = 20,
		TextXAlignment = Enum.TextXAlignment.Center,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, slot * 6),
		Size = UDim2.new(1, 0, 0, 24),
		ZIndex = 10,
		Parent = container,
	})
	local stroke = create("UIStroke", { Thickness = 2, Color = Color3.fromRGB(4, 30, 50), Parent = popup })
	local name = label({
		Text = if fish then string.upper(fish.DisplayName) else "",
		FontFace = UIKit.Font,
		TextColor3 = C.Gold,
		TextSize = 14,
		TextXAlignment = Enum.TextXAlignment.Center,
		Position = UDim2.new(0, 0, 0, -18),
		Size = UDim2.new(1, 0, 0, 16),
		ZIndex = 10,
		Parent = popup,
	})
	local scale = create("UIScale", { Scale = 0.6, Parent = popup })

	TweenService:Create(scale, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
	local rise = TweenService:Create(popup, TweenInfo.new(1.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.5, 0, 0.5, slot * 6 - 70),
		TextTransparency = 1,
	})
	TweenService:Create(stroke, TweenInfo.new(1.4), { Transparency = 1 }):Play()
	TweenService:Create(name, TweenInfo.new(1.4), { TextTransparency = 1 }):Play()
	rise:Play()
	rise.Completed:Once(function()
		popup:Destroy()
	end)

	if refs.coinScale then
		refs.coinScale.Scale = 1.15
		TweenService:Create(refs.coinScale, TweenInfo.new(0.3, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	end
end

function HUD.showBanner(title: string, subtitle: string?, color: Color3?)
	local banner, sub, stroke = refs.banner, refs.bannerSub, refs.bannerStroke
	banner.Text = title
	banner.TextColor3 = color or C.Gold
	sub.Text = subtitle or ""
	banner.TextTransparency, sub.TextTransparency, stroke.Transparency = 0, 0, 0.2
	local scale = banner:FindFirstChildOfClass("UIScale") or create("UIScale", { Parent = banner })
	scale.Scale = 1.4
	TweenService:Create(scale, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
	task.delay(2.2, function()
		if banner.Text == title then
			local info = TweenInfo.new(0.6)
			TweenService:Create(banner, info, { TextTransparency = 1 }):Play()
			TweenService:Create(sub, info, { TextTransparency = 1 }):Play()
			TweenService:Create(stroke, info, { Transparency = 1 }):Play()
		end
	end)
end

function HUD.showToast(text: string, color: Color3?)
	local toast, stroke = refs.toast, refs.toastStroke
	toast.Text = text
	toast.TextColor3 = color or C.Text
	toast.TextTransparency, stroke.Transparency = 0, 0.3
	local stamp = os.clock()
	refs.toastStamp = stamp
	task.delay(1.6, function()
		if refs.toastStamp == stamp then
			TweenService:Create(toast, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
			TweenService:Create(stroke, TweenInfo.new(0.5), { Transparency = 1 }):Play()
		end
	end)
end

function HUD.flashDamage(intensity: number)
	refs.vignetteAlpha = math.min(1, refs.vignetteAlpha + intensity)
end

function HUD.showDeath(cause: string?, respawnIn: number?)
	deathUntil = os.clock() + (respawnIn or 4)
	refs.overlayTitle.Text = if cause == "Starvation" then "YOU STARVED" else "YOU WERE DEFEATED"
	refs.overlay.Visible = true
end

-- Update ----------------------------------------------------------------------------------

local function updateScale()
	local viewport = workspace.CurrentCamera.ViewportSize
	local s = math.min(viewport.X / 1366, viewport.Y / 768)
	if InputController.mode == "Touch" then
		s *= 1.1
	end
	uiScale.Scale = math.clamp(s, 0.55, 1.25)
end

local function updateTarget()
	local root = SharkController.root
	if not root or not SharkController.isAlive() then
		refs.target.Enabled = false
		return
	end
	local scale = SharkController.getScale()
	local mouth = SharkRig.getMouthPosition(root.CFrame, scale)
	local range = SharkConfig.Bite.Range * scale
	local id, _, typeId, dist = FishRenderer.findTarget(mouth, root.CFrame.LookVector, range * 3)
	local part = id and FishRenderer.getBodyPart(id)
	if not part then
		refs.target.Enabled = false
		return
	end
	local cfg = FishConfig.get(typeId)
	local edible = scale >= cfg.MinScale
	refs.target.Adornee = part
	refs.target.Size = UDim2.fromScale(cfg.Length * 1.6, cfg.Length * 1.6)
	refs.target.Enabled = true
	if not edible then
		refs.targetStroke.Color = Color3.fromRGB(255, 70, 80)
	elseif dist <= range * 1.4 then
		refs.targetStroke.Color = Color3.fromRGB(90, 255, 140)
	else
		refs.targetStroke.Color = Color3.fromRGB(235, 250, 255)
	end
	refs.targetRing.Rotation = (os.clock() * 90) % 360
end

local function update(dt: number)
	updateScale()

	local alive = SharkController.isAlive()
	local now = os.clock()

	-- Overlay (loading / death)
	if not alive then
		refs.overlay.Visible = true
		if deathUntil > now then
			refs.overlaySub.Text = string.format("Respawning in %d…", math.ceil(deathUntil - now))
		elseif SharkController.model == nil then
			refs.overlayTitle.Text = "SHARK DOMINION"
			refs.overlaySub.Text = "Growing the reef…"
		end
	else
		refs.overlay.Visible = false
		deathUntil = 0
	end

	-- Profile
	local species = attr("SpeciesName", "Reef Shark")
	refs.species.Text = string.upper(species)
	refs.level.Text = tostring(attr("Level", 1))
	local levelXP, needed = attr("LevelXP", 0), attr("LevelXPNeeded", 40)
	refs.xpText.Text = if needed > 0 then `{math.floor(levelXP)} / {needed} XP` else "MAX LEVEL"
	local xpFrac = if needed > 0 then math.clamp(levelXP / needed, 0, 1) else 1
	local current = refs.xpFill.Size.X.Scale
	refs.xpFill.Size = UDim2.fromScale(current + (xpFrac - current) * (1 - math.exp(-10 * dt)), 1)

	-- Vitals
	local health, maxHealth = attr("Health", 100), attr("MaxHealth", 100)
	bars.health.set(health / math.max(maxHealth, 1), `{math.ceil(health)} / {maxHealth}`, dt)
	local hunger, maxHunger = attr("Hunger", 100), attr("MaxHunger", 100)
	local hungerFrac = hunger / math.max(maxHunger, 1)
	bars.hunger.set(hungerFrac, if hungerFrac <= 0 then "STARVING" else `{math.floor(hungerFrac * 100)}%`, dt)
	local stamina = SharkController.stamina
	bars.boost.set(stamina / SharkConfig.Stamina.Max, `{math.floor(stamina)}%`, dt)

	-- Low hunger pulse + starvation vignette
	local pulse = if hungerFrac < 0.25 then 0.5 + 0.5 * math.sin(now * 8) else 0
	bars.hunger.track.BackgroundColor3 = Color3.fromRGB(4, 14, 24):Lerp(Color3.fromRGB(140, 20, 20), pulse)
	refs.starveAlpha = if hungerFrac <= 0 and alive then 0.25 + 0.15 * math.sin(now * 4) else 0

	-- Mass / size
	local mass = attr("Mass", SharkConfig.Growth.StartMass)
	refs.mass.Text = string.format("%.1f kg", mass)
	refs.size.Text = string.format("MASS  ·  SIZE ×%.2f", SharkController.getScale())

	-- Coins count-up
	local coins = attr("Coins", 0)
	displayedCoins += (coins - displayedCoins) * (1 - math.exp(-10 * dt))
	if math.abs(coins - displayedCoins) < 0.5 then
		displayedCoins = coins
	end
	refs.coins.Text = UIKit.formatNumber(displayedCoins + 0.5)

	-- Ability slot
	local touch = InputController.mode == "Touch"
	refs.abilitySlot.Visible = not touch
	refs.hints.Visible = InputController.mode == "KeyboardMouse"
	refs.abilityKey.Text = if InputController.mode == "Gamepad" then "X" else SharkConfig.Ability.Key
	local remaining = SharkController.abilityReadyAt - now
	local cd = math.clamp(remaining / SharkConfig.Ability.Cooldown, 0, 1)
	refs.abilityCooldown.Size = UDim2.fromScale(cd, 1)
	refs.abilityName.Text = if remaining > 0
		then string.format("%s  %.1fs", string.upper(SharkConfig.Ability.Name), remaining)
		else string.upper(SharkConfig.Ability.Name)

	-- Vignette
	refs.vignetteAlpha = math.max(0, refs.vignetteAlpha - dt * 1.6)
	local alpha = math.max(refs.vignetteAlpha, refs.starveAlpha)
	for _, edge in refs.vignetteEdges do
		edge.BackgroundTransparency = 1 - alpha * 0.7
	end

	updateTarget()
end

function HUD.init()
	gui = create("ScreenGui", {
		Name = "SharkHUD",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = 1,
		Parent = player:WaitForChild("PlayerGui"),
	})
	local root = create("Frame", {
		Name = "Root",
		BackgroundTransparency = 1,
		Size = UDim2.fromScale(1, 1),
		Parent = gui,
	})
	-- Safe-area padding for notches and the Roblox top bar
	create("UIPadding", {
		PaddingTop = UDim.new(0, 44),
		PaddingLeft = UDim.new(0, 8),
		PaddingRight = UDim.new(0, 8),
		PaddingBottom = UDim.new(0, 8),
		Parent = root,
	})
	uiScale = create("UIScale", { Parent = root })

	buildProfileCard(root)
	buildMassPill(root)
	buildCoins(root)
	buildAbility(root)
	buildOverlays(root)
	buildTargetRing()

	displayedCoins = attr("Coins", 0)
	RunService.RenderStepped:Connect(update)
end

return HUD
