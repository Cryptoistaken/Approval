import { Telegraf, Markup } from "telegraf";
import { getRequest, updateStatus, registerApp, getApp } from "./db.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PHASE_TOKEN = process.env.PHASE_TOKEN;
const SIMPLE_MODE = !!process.env.TELEGRAM_ADMIN_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN required");
if (SIMPLE_MODE && !PHASE_TOKEN) throw new Error("PHASE_TOKEN required in simple mode");

export const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const sessions = new Map();

bot.start((ctx) => {
    if (SIMPLE_MODE) {
        ctx.reply("Welcome to Crion Bot! 🛡️\n\nSimple mode active. You will receive approval requests here.");
    } else {
        ctx.reply(
            "Welcome to Crion Bot! 🛡️\n\nUse this bot to approve Phase secret access requests.",
            Markup.inlineKeyboard([
                Markup.button.callback("Register App", "register_start")
            ])
        );
    }
});

bot.action("register_start", (ctx) => {
    if (SIMPLE_MODE) {
        return ctx.answerCbQuery("Registration disabled in simple mode");
    }
    const chatId = ctx.chat.id;
    sessions.set(chatId, { step: "APP_ID" });
    ctx.reply("Please enter your **Phase App ID**:");
    ctx.answerCbQuery();
});

bot.on("text", async (ctx) => {
    if (SIMPLE_MODE) return;

    const chatId = ctx.chat.id;
    const session = sessions.get(chatId);

    if (!session) return;

    if (session.step === "APP_ID") {
        session.appId = ctx.message.text.trim();
        session.step = "TOKEN";
        sessions.set(chatId, session);
        await ctx.reply("Please paste your **Phase Service Token**:\n(This message will be deleted automatically)");
    } else if (session.step === "TOKEN") {
        const token = ctx.message.text.trim();
        const appId = session.appId;

        try {
            await ctx.deleteMessage();
        } catch (e) {
            console.error("Failed to delete token message", e);
        }

        try {
            registerApp.run(appId, chatId.toString(), token);
            await ctx.reply(`✅ App \`${appId}\` registered successfully!`, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Registration error:", error);
            await ctx.reply("❌ Registration failed.");
        }

        sessions.delete(chatId);
    }
});

bot.action(/^approve_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId);

    if (!request) {
        await ctx.answerCbQuery("Request not found");
        return;
    }

    if (request.status !== "pending") {
        await ctx.answerCbQuery("Already processed");
        return;
    }

    let phaseToken;
    if (SIMPLE_MODE) {
        phaseToken = PHASE_TOKEN;
    } else {
        const app = getApp.get(request.app_id);
        if (!app) {
            await ctx.answerCbQuery("App not registered");
            return;
        }
        phaseToken = app.phase_token;
    }

    updateStatus.run("approved", phaseToken, Date.now(), requestId);

    await ctx.answerCbQuery("Approved");
    await ctx.editMessageText(
        `Access Granted\n\n` +
        `App ID: ${request.app_id}\n` +
        `Environment: ${request.env_name}\n` +
        (request.path ? `Path: ${request.path}` : ""),
        { parse_mode: "HTML" }
    );
});

bot.action(/^deny_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId);

    if (!request) {
        await ctx.answerCbQuery("Request not found");
        return;
    }

    if (request.status !== "pending") {
        await ctx.answerCbQuery("Already processed");
        return;
    }

    updateStatus.run("denied", null, Date.now(), requestId);

    await ctx.answerCbQuery("Denied");
    await ctx.editMessageText(
        `Access Denied\n\n` +
        `App ID: ${request.app_id}\n` +
        `Environment: ${request.env_name}\n` +
        (request.path ? `Path: ${request.path}` : ""),
        { parse_mode: "HTML" }
    );
});
