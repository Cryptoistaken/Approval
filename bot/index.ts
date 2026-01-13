/**
 * Approval Bot - Telegram-based approval system for Phase.dev secrets
 *
 * Routes:
 *   POST /request  - Create approval request, sends Telegram notification
 *   GET  /status/:id - Check approval status
 *   POST /webhook  - Telegram webhook handler
 *   GET  /health   - Health check endpoint
 */

import { Telegraf, Markup, Context } from "telegraf";
import type { CallbackQuery, Update } from "telegraf/types";
import { Database } from "bun:sqlite";

type CallbackContext = Context<Update.CallbackQueryUpdate<CallbackQuery>>;


// =============================================================================
// Configuration (Bun auto-loads .env)
// =============================================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const PHASE_TOKEN = process.env.PHASE_TOKEN!;
const PORT = parseInt(process.env.PORT || "3000");
const DATA_DIR = process.env.DATA_DIR || "./data";

if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN required");
if (!ADMIN_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID required");
if (!PHASE_TOKEN) throw new Error("PHASE_TOKEN required");

// =============================================================================
// Database Setup
// =============================================================================

// Ensure data directory exists
await Bun.write(`${DATA_DIR}/.keep`, "");

const db = new Database(`${DATA_DIR}/approvals.db`);

db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL,
    requester TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  )
`);

// Prepared statements
const insertRequest = db.prepare(
    "INSERT INTO approvals (id, resource, requester, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
);
const getRequest = db.prepare("SELECT * FROM approvals WHERE id = ?");
const updateStatus = db.prepare(
    "UPDATE approvals SET status = ?, token = ?, resolved_at = ? WHERE id = ?"
);

// =============================================================================
// Telegram Bot Setup
// =============================================================================

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Handle Approve button click
bot.action(/^approve_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    const request = getRequest.get(requestId) as {
        id: string;
        resource: string;
        status: string;
    } | null;

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
    const request = getRequest.get(requestId) as {
        id: string;
        resource: string;
        status: string;
    } | null;

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

// =============================================================================
// HTTP Server
// =============================================================================

function generateId(): string {
    return `req_${crypto.randomUUID().slice(0, 8)}`;
}

const server = Bun.serve({
    port: PORT,
    routes: {
        // Health check
        "/health": new Response("OK", { status: 200 }),

        // Create approval request
        "/request": {
            POST: async (req: Request) => {
                try {
                    const body = (await req.json()) as {
                        resource?: string;
                        requester?: string;
                    };

                    if (!body.resource) {
                        return Response.json(
                            { error: "resource is required" },
                            { status: 400 }
                        );
                    }

                    const requestId = generateId();
                    const requester = body.requester || "unknown";
                    const now = Date.now();

                    // Store in database
                    insertRequest.run(requestId, body.resource, requester, now);

                    // Send Telegram notification
                    await bot.telegram.sendMessage(
                        ADMIN_CHAT_ID,
                        `🔐 <b>New Access Request</b>\n\n` +
                        `� <b>User:</b> ${requester}\n` +
                        `📦 <b>Resource:</b> <code>${body.resource}</code>\n\n` +
                        `🆔 <code>${requestId}</code>`,
                        {
                            parse_mode: "HTML",
                            ...Markup.inlineKeyboard([
                                [
                                    Markup.button.callback("✅ Approve", `approve_${requestId}`),
                                    Markup.button.callback("❌ Deny", `deny_${requestId}`),
                                ],
                            ]),
                        }
                    );
                    return Response.json({ requestId });
                } catch (error) {
                    console.error("Request error:", error);
                    return Response.json(
                        { error: "Failed to create request" },
                        { status: 500 }
                    );
                }
            },
        },

        // Check approval status
        "/status/:id": (req: Request & { params: { id: string } }) => {
            const { id } = req.params;
            const request = getRequest.get(id) as {
                status: string;
                token: string | null;
            } | null;

            if (!request) {
                return Response.json({ error: "Not found" }, { status: 404 });
            }

            if (request.status === "approved") {
                return Response.json({
                    status: "approved",
                    token: request.token,
                });
            }

            return Response.json({ status: request.status });
        },

        // Telegram webhook
        "/webhook": {
            POST: async (req: Request) => {
                try {
                    const update = await req.json();
                    await bot.handleUpdate(update);
                    return new Response("OK");
                } catch (error) {
                    console.error("Webhook error:", error);
                    return new Response("Error", { status: 500 });
                }
            },
        },
    },

    // Fallback for unmatched routes
    fetch() {
        return Response.json({ error: "Not found" }, { status: 404 });
    },
});

console.log(`Approval bot running on http://localhost:${server.port}`);
console.log(`Webhook URL: POST /webhook`);
console.log(`Status URL: GET /status/:id`);
console.log(`Request URL: POST /request`);
