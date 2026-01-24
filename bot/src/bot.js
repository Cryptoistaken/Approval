/**
 * Telegram Bot Handlers
 * 
 * Handles:
 * - /start command
 * - App registration wizard (multi-tenant mode)
 * - Approve/Deny button callbacks
 */

import { Telegraf, Markup } from "telegraf";
import { getRequest, updateStatus, registerApp, getApp } from "./db.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PHASE_TOKEN = process.env.PHASE_TOKEN;
const SIMPLE_MODE = !!process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

// Validate required environment
if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required. Get one from @BotFather on Telegram.");
}

if (SIMPLE_MODE && !PHASE_TOKEN) {
    throw new Error("PHASE_TOKEN is required when running in Simple Mode (TELEGRAM_ADMIN_CHAT_ID is set).");
}

// ============================================================================
// BOT INSTANCE
// ============================================================================

export const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Registration wizard state (for multi-tenant mode)
const registrationSessions = new Map();

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

bot.start((ctx) => {
    if (SIMPLE_MODE) {
        ctx.reply(
            "🛡️ <b>Welcome to Crion Bot!</b>\n\n" +
            "Simple mode is active. All approval requests will be sent here.\n\n" +
            "Your Chat ID: <code>" + ctx.chat.id + "</code>",
            { parse_mode: "HTML" }
        );
    } else {
        ctx.reply(
            "🛡️ <b>Welcome to Crion Bot!</b>\n\n" +
            "Use this bot to approve Phase.dev secret access requests.\n\n" +
            "Click the button below to register your app:",
            {
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                    Markup.button.callback("📝 Register App", "register_start")
                ])
            }
        );
    }
});

// ============================================================================
// REGISTRATION WIZARD (Multi-tenant mode only)
// ============================================================================

bot.action("register_start", async (ctx) => {
    if (SIMPLE_MODE) {
        return ctx.answerCbQuery("Registration is disabled in Simple Mode");
    }

    const chatId = ctx.chat.id;
    registrationSessions.set(chatId, { step: "APP_ID" });

    await ctx.answerCbQuery();
    await ctx.reply(
        "📝 <b>App Registration</b>\n\n" +
        "Step 1/2: Please enter your <b>Phase App ID</b>:\n\n" +
        "<i>You can find this in your Phase.dev dashboard</i>",
        { parse_mode: "HTML" }
    );
});

bot.on("text", async (ctx) => {
    if (SIMPLE_MODE) return;

    const chatId = ctx.chat.id;
    const session = registrationSessions.get(chatId);

    if (!session) return; // Not in registration flow

    if (session.step === "APP_ID") {
        // Store app ID and move to next step
        session.appId = ctx.message.text.trim();
        session.step = "TOKEN";
        registrationSessions.set(chatId, session);

        await ctx.reply(
            "Step 2/2: Please paste your <b>Phase Service Token</b>:\n\n" +
            "⚠️ <i>This message will be automatically deleted for security</i>",
            { parse_mode: "HTML" }
        );

    } else if (session.step === "TOKEN") {
        const token = ctx.message.text.trim();
        const appId = session.appId;

        // Delete the token message for security
        try {
            await ctx.deleteMessage();
        } catch (e) {
            console.log("[WARN] Could not delete token message:", e.message);
        }

        // Register the app
        try {
            registerApp.run(appId, chatId.toString(), token);

            await ctx.reply(
                "✅ <b>Registration Complete!</b>\n\n" +
                `App ID: <code>${appId}</code>\n\n` +
                "You will now receive approval requests in this chat.\n\n" +
                "<b>SDK Configuration:</b>\n" +
                `<code>PHASE_APP_ID=${appId}</code>`,
                { parse_mode: "HTML" }
            );

            console.log(`[INFO] App registered: ${appId} → chat ${chatId}`);

        } catch (error) {
            console.error("[ERROR] Registration failed:", error);
            await ctx.reply("❌ Registration failed. Please try again.");
        }

        // Clear session
        registrationSessions.delete(chatId);
    }
});

// ============================================================================
// APPROVAL HANDLERS
// ============================================================================

bot.action(/^approve_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId);

    if (!request) {
        return ctx.answerCbQuery("Request not found");
    }

    if (request.status !== "pending") {
        return ctx.answerCbQuery("Already processed");
    }

    // Get the Phase token to return
    let phaseToken;
    if (SIMPLE_MODE) {
        phaseToken = PHASE_TOKEN;
    } else {
        const registeredApp = getApp.get(request.app_id);
        if (!registeredApp) {
            return ctx.answerCbQuery("App not registered");
        }
        phaseToken = registeredApp.phase_token;
    }

    // Update request status
    updateStatus.run("approved", phaseToken, Date.now(), requestId);

    await ctx.answerCbQuery("✅ Approved!");
    await ctx.editMessageText(
        `✅ <b>Access Granted</b>\n\n` +
        `<b>App ID:</b> <code>${request.app_id}</code>\n` +
        `<b>Environment:</b> ${request.env_name}` +
        (request.path ? `\n<b>Path:</b> ${request.path}` : ""),
        { parse_mode: "HTML" }
    );

    console.log(`[INFO] Request approved: ${requestId}`);
});

bot.action(/^deny_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId);

    if (!request) {
        return ctx.answerCbQuery("Request not found");
    }

    if (request.status !== "pending") {
        return ctx.answerCbQuery("Already processed");
    }

    // Update request status
    updateStatus.run("denied", null, Date.now(), requestId);

    await ctx.answerCbQuery("❌ Denied");
    await ctx.editMessageText(
        `❌ <b>Access Denied</b>\n\n` +
        `<b>App ID:</b> <code>${request.app_id}</code>\n` +
        `<b>Environment:</b> ${request.env_name}` +
        (request.path ? `\n<b>Path:</b> ${request.path}` : ""),
        { parse_mode: "HTML" }
    );

    console.log(`[INFO] Request denied: ${requestId}`);
});
