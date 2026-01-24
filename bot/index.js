/**
 * Crion Bot - Simple Mode Only
 * Personal approval bot for Phase.dev secrets
 * 
 * Required Environment Variables:
 *   TELEGRAM_BOT_TOKEN    - From @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID - Your Telegram chat ID
 *   PHASE_TOKEN           - Your Phase service token
 *   PHASE_APP_ID          - Your Phase app ID (optional, for validation)
 */

import { Telegraf, Markup } from "telegraf";
import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || "3000");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
const PHASE_TOKEN = process.env.PHASE_TOKEN;
const PHASE_APP_ID = process.env.PHASE_APP_ID?.trim();
const DATA_DIR = process.env.DATA_DIR || "./data";
const BOT_URL = process.env.BOT_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

console.log("╔══════════════════════════════════════╗");
console.log("║        Crion Approval Bot            ║");
console.log("╚══════════════════════════════════════╝");

// ============================================================================
// VALIDATION
// ============================================================================

if (!BOT_TOKEN) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN required");
    process.exit(1);
}
if (!CHAT_ID) {
    console.error("ERROR: TELEGRAM_ADMIN_CHAT_ID required");
    process.exit(1);
}
if (!PHASE_TOKEN) {
    console.error("ERROR: PHASE_TOKEN required");
    process.exit(1);
}

console.log(`Chat ID: ${CHAT_ID}`);
if (PHASE_APP_ID) console.log(`App ID: ${PHASE_APP_ID}`);

// ============================================================================
// DATABASE
// ============================================================================

await mkdir(DATA_DIR, { recursive: true });
const db = new Database(`${DATA_DIR}/approvals.db`);

db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        app_id TEXT,
        env TEXT,
        path TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER
    );
`);

const insert = db.prepare("INSERT INTO requests (id, app_id, env, path, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)");
const get = db.prepare("SELECT * FROM requests WHERE id = ?");
const update = db.prepare("UPDATE requests SET status = ? WHERE id = ?");

// ============================================================================
// TELEGRAM BOT
// ============================================================================

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(`🛡️ Crion Bot\n\nYour Chat ID: ${ctx.chat.id}\n\nThis bot handles approval requests for Phase.dev secrets.`);
});

bot.action(/^approve_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const req = get.get(id);
    if (!req || req.status !== "pending") {
        return ctx.answerCbQuery("Already processed");
    }
    update.run("approved", id);
    await ctx.answerCbQuery("✅ Approved");
    ctx.editMessageText(`✅ APPROVED\n\nApp: ${req.app_id}\nEnv: ${req.env}${req.path ? `\nPath: ${req.path}` : ""}`);
});

bot.action(/^deny_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const req = get.get(id);
    if (!req || req.status !== "pending") {
        return ctx.answerCbQuery("Already processed");
    }
    update.run("denied", id);
    await ctx.answerCbQuery("❌ Denied");
    ctx.editMessageText(`❌ DENIED\n\nApp: ${req.app_id}\nEnv: ${req.env}${req.path ? `\nPath: ${req.path}` : ""}`);
});

// ============================================================================
// HTTP SERVER
// ============================================================================

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        // Health check
        if (path === "/health") {
            return new Response("OK");
        }

        // Create approval request
        if (path === "/request" && req.method === "POST") {
            try {
                const body = await req.json();

                if (!body.envName) {
                    return Response.json({ error: "envName required" }, { status: 400 });
                }

                // Validate app ID if set
                if (PHASE_APP_ID && body.appId && body.appId !== PHASE_APP_ID) {
                    return Response.json({ error: "Invalid app ID" }, { status: 403 });
                }

                const id = `req_${crypto.randomUUID()}`;
                const appId = body.appId || PHASE_APP_ID || "default";

                insert.run(id, appId, body.envName, body.path || "", Date.now());

                await bot.telegram.sendMessage(CHAT_ID,
                    `🔐 <b>Access Request</b>\n\nEnv: <b>${body.envName}</b>${body.path ? `\nPath: ${body.path}` : ""}`,
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
                console.error("Error:", e);
                return Response.json({ error: "Failed" }, { status: 500 });
            }
        }

        // Check status
        if (path.startsWith("/status/")) {
            const id = path.slice(8);
            const req = get.get(id);

            if (!req) {
                return Response.json({ error: "Not found" }, { status: 404 });
            }

            // Expired after 5 minutes
            if (req.status === "pending" && Date.now() - req.created_at > 5 * 60 * 1000) {
                return Response.json({ status: "expired" });
            }

            if (req.status === "approved") {
                // Return token (one-time - delete after)
                update.run("consumed", id);
                return Response.json({ status: "approved", phaseToken: PHASE_TOKEN });
            }

            return Response.json({ status: req.status });
        }

        // Telegram webhook
        if (path === "/webhook" && req.method === "POST") {
            try {
                await bot.handleUpdate(await req.json());
                return new Response("OK");
            } catch {
                return new Response("Error", { status: 500 });
            }
        }

        return Response.json({ error: "Not found" }, { status: 404 });
    }
});

console.log(`Server ready on port ${server.port}`);

// Auto-configure webhook
if (BOT_URL) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(BOT_URL + "/webhook")}`, { method: "POST" })
        .then(r => r.json())
        .then(d => console.log(d.ok ? `✓ Webhook: ${BOT_URL}/webhook` : `✗ ${d.description}`))
        .catch(e => console.error("Webhook error:", e.message));
}
