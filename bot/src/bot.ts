import { Telegraf, Markup } from "telegraf";
import { getRequest, updateStatus, type ApprovalRequest } from "./db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const PHASE_TOKEN = process.env.PHASE_TOKEN!;

if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN required");
if (!PHASE_TOKEN) throw new Error("PHASE_TOKEN required");

export const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Handle Approve button click
bot.action(/^approve_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId) as ApprovalRequest | null;

    if (!request) {
        await ctx.answerCbQuery("Request not found");
        return;
    }

    if (request.status !== "pending") {
        await ctx.answerCbQuery("Already processed");
        return;
    }

    // Approve and store token
    updateStatus.run("approved", PHASE_TOKEN, Date.now(), requestId);

    await ctx.answerCbQuery("Approved");
    await ctx.editMessageText(
        `✅ <b>APPROVED</b>\n\n` +
        `📦 <b>Resource:</b> <code>${request.resource}</code>\n` +
        `🆔 <code>${requestId}</code>`,
        { parse_mode: "HTML" }
    );
});

// Handle Deny button click
bot.action(/^deny_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId) as ApprovalRequest | null;

    if (!request) {
        await ctx.answerCbQuery("Request not found");
        return;
    }

    if (request.status !== "pending") {
        await ctx.answerCbQuery("Already processed");
        return;
    }

    // Deny request
    updateStatus.run("denied", null, Date.now(), requestId);

    await ctx.answerCbQuery("Denied");
    await ctx.editMessageText(
        `❌ <b>DENIED</b>\n\n` +
        `📦 <b>Resource:</b> <code>${request.resource}</code>\n` +
        `🆔 <code>${requestId}</code>`,
        { parse_mode: "HTML" }
    );
});
