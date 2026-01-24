/**
 * Crion Bot - Telegram-based Approval System for Phase.dev
 * Simple, synchronous startup for maximum compatibility
 */

import { Telegraf, Markup } from "telegraf";
import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || "3000");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
const PHASE_TOKEN = process.env.PHASE_TOKEN;
const PHASE_APP_ID = process.env.PHASE_APP_ID?.trim(); // Optional: restrict to specific app
const DATA_DIR = process.env.DATA_DIR || "./data";
const SIMPLE_MODE = !!ADMIN_CHAT_ID;

// Get bot URL for auto-webhook
const BOT_URL = process.env.BOT_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

console.log("╔══════════════════════════════════════╗");
console.log("║        Crion Approval Bot            ║");
console.log("╚══════════════════════════════════════╝");
console.log(`PORT: ${PORT}`);
console.log(`MODE: ${SIMPLE_MODE ? "SIMPLE" : "MULTI-TENANT"}`);
if (PHASE_APP_ID) console.log(`APP_ID: ${PHASE_APP_ID}`);

// ============================================================================
// VALIDATION
// ============================================================================

if (!TELEGRAM_BOT_TOKEN) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is required");
    process.exit(1);
}

if (SIMPLE_MODE && !PHASE_TOKEN) {
    console.error("ERROR: PHASE_TOKEN is required in SIMPLE mode");
    process.exit(1);
}

// ============================================================================
// DATABASE
// ============================================================================

await mkdir(DATA_DIR, { recursive: true });

const db = new Database(`${DATA_DIR}/approvals.db`);

db.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        env_name TEXT NOT NULL,
        path TEXT,
        status TEXT DEFAULT 'pending',
        token TEXT,
        created_at INTEGER,
        resolved_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS apps (
        app_id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        phase_token TEXT NOT NULL
    );
`);

const insertRequest = db.prepare("INSERT INTO approvals (id, app_id, env_name, path, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)");
const getRequest = db.prepare("SELECT * FROM approvals WHERE id = ?");
const updateStatus = db.prepare("UPDATE approvals SET status = ?, token = ?, resolved_at = ? WHERE id = ?");
const clearToken = db.prepare("UPDATE approvals SET token = NULL WHERE id = ?");
const registerApp = db.prepare("INSERT OR REPLACE INTO apps (app_id, chat_id, phase_token) VALUES (?, ?, ?)");
const getApp = db.prepare("SELECT * FROM apps WHERE app_id = ?");

// ============================================================================
// TELEGRAM BOT
// ============================================================================

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const sessions = new Map();

bot.start((ctx) => {
    if (SIMPLE_MODE) {
        ctx.reply(`🛡️ Crion Bot (Simple Mode)\n\nYour Chat ID: ${ctx.chat.id}`);
    } else {
        ctx.reply("🛡️ Welcome to Crion!\n\nClick below to register:", {
            ...Markup.inlineKeyboard([Markup.button.callback("📝 Register App", "register")])
        });
    }
});

bot.action("register", async (ctx) => {
    if (SIMPLE_MODE) return ctx.answerCbQuery("Disabled in Simple Mode");
    sessions.set(ctx.chat.id, { step: "APP_ID" });
    await ctx.answerCbQuery();
    ctx.reply("Enter your Phase App ID:");
});

bot.on("text", async (ctx) => {
    if (SIMPLE_MODE) return;
    const session = sessions.get(ctx.chat.id);
    if (!session) return;

    if (session.step === "APP_ID") {
        session.appId = ctx.message.text.trim();
        session.step = "TOKEN";
        sessions.set(ctx.chat.id, session);
        ctx.reply("Now paste your Phase Service Token:");
    } else if (session.step === "TOKEN") {
        const token = ctx.message.text.trim();
        try { await ctx.deleteMessage(); } catch { }
        registerApp.run(session.appId, ctx.chat.id.toString(), token);
        ctx.reply(`✅ Registered!\nApp ID: ${session.appId}`);
        sessions.delete(ctx.chat.id);
    }
});

bot.action(/^approve_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const req = getRequest.get(id);
    if (!req || req.status !== "pending") return ctx.answerCbQuery("Already processed");

    const token = SIMPLE_MODE ? PHASE_TOKEN : getApp.get(req.app_id)?.phase_token;
    if (!token) return ctx.answerCbQuery("App not found");

    updateStatus.run("approved", token, Date.now(), id);
    await ctx.answerCbQuery("✅ Approved");
    ctx.editMessageText(`✅ APPROVED\nApp: ${req.app_id}\nEnv: ${req.env_name}`);
});

bot.action(/^deny_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const req = getRequest.get(id);
    if (!req || req.status !== "pending") return ctx.answerCbQuery("Already processed");

    updateStatus.run("denied", null, Date.now(), id);
    await ctx.answerCbQuery("❌ Denied");
    ctx.editMessageText(`❌ DENIED\nApp: ${req.app_id}\nEnv: ${req.env_name}`);
});

// ============================================================================
// HTTP SERVER
// ============================================================================

function generateId() {
    return `req_${crypto.randomUUID()}`; // Full UUID for security
}

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        // Health check
        if (path === "/health") {
            return new Response("OK");
        }

        // Create request
        if (path === "/request" && req.method === "POST") {
            try {
                const body = await req.json();
                if (!body.appId || !body.envName) {
                    return Response.json({ error: "appId and envName required" }, { status: 400 });
                }

                // In Simple Mode with PHASE_APP_ID set, validate the app ID
                if (SIMPLE_MODE && PHASE_APP_ID && body.appId !== PHASE_APP_ID) {
                    return Response.json({ error: "Invalid app ID" }, { status: 403 });
                }

                const chatId = SIMPLE_MODE ? ADMIN_CHAT_ID : getApp.get(body.appId)?.chat_id;
                if (!chatId) {
                    return Response.json({ error: "App not registered" }, { status: 403 });
                }

                const id = generateId();
                insertRequest.run(id, body.appId, body.envName, body.path || "", Date.now());

                await bot.telegram.sendMessage(chatId,
                    `🔐 <b>Access Request</b>\n\nApp: <code>${body.appId}</code>\nEnv: ${body.envName}${body.path ? `\nPath: ${body.path}` : ""}`,
                    {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback("✅ Approve", `approve_${id}`),
                            Markup.button.callback("❌ Deny", `deny_${id}`)]
                        ])
                    }
                );

                return Response.json({ requestId: id });
            } catch (e) {
                console.error("Request error:", e);
                return Response.json({ error: "Failed" }, { status: 500 });
            }
        }

        // Check status
        if (path.startsWith("/status/")) {
            const id = path.slice(8);
            const req = getRequest.get(id);
            if (!req) return Response.json({ error: "Not found" }, { status: 404 });

            // Check if request expired (5 min timeout)
            if (req.status === "pending" && Date.now() - req.created_at > 5 * 60 * 1000) {
                return Response.json({ status: "expired" });
            }

            if (req.status === "approved" && req.token) {
                // Clear token after first fetch (one-time use)
                clearToken.run(id);
                return Response.json({ status: "approved", phaseToken: req.token });
            }

            if (req.status === "approved" && !req.token) {
                return Response.json({ status: "consumed" }); // Already fetched
            }

            return Response.json({ status: req.status });
        }

        // Webhook
        if (path === "/webhook" && req.method === "POST") {
            try {
                const update = await req.json();
                await bot.handleUpdate(update);
                return new Response("OK");
            } catch (e) {
                return new Response("Error", { status: 500 });
            }
        }

        return Response.json({ error: "Not found" }, { status: 404 });
    }
});

console.log(`Server ready on port ${server.port}`);

// Auto-configure webhook
if (BOT_URL) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(BOT_URL + "/webhook")}`, { method: "POST" });
        const data = await res.json();
        console.log(data.ok ? `✓ Webhook: ${BOT_URL}/webhook` : `✗ Webhook failed: ${data.description}`);
    } catch (e) {
        console.error("Webhook error:", e.message);
    }
}
