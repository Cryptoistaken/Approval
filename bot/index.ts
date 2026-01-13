/**
 * Approval Bot - Telegram-based approval system for Phase.dev secrets
 *
 * Routes:
 *   POST /request  - Create approval request, sends Telegram notification
 *   GET  /status/:id - Check approval status
 *   POST /webhook  - Telegram webhook handler
 *   GET  /health   - Health check endpoint
 */

import { Markup } from "telegraf";
import { bot } from "./src/bot";
import { insertRequest, getRequest, type ApprovalRequest } from "./src/db";

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || "3000");
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;

if (!ADMIN_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID required");

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
                        environment?: string;
                    };

                    if (!body.resource) {
                        return Response.json(
                            { error: "resource is required" },
                            { status: 400 }
                        );
                    }

                    const environment = body.environment || "default";
                    const requestId = generateId();
                    const requester = body.requester || "unknown";
                    const now = Date.now();

                    // Store in database
                    insertRequest.run(requestId, body.resource, requester, environment, now);

                    // Send Telegram notification
                    await bot.telegram.sendMessage(
                        ADMIN_CHAT_ID,
                        `<pre>` +
                        `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                        `┃    ⬢ NEW REQUEST ⬢       ┃\n` +
                        `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n` +
                        `┃                           ┃\n` +
                        `┃  ◆ ${requester.padEnd(22)}┃\n` +
                        `┃  ◇ ${environment.padEnd(22)}┃\n` +
                        `┃  ◈ ${requestId.padEnd(22)}┃\n` +
                        `┃                           ┃\n` +
                        `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛</pre>`,
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
            const request = getRequest.get(id) as ApprovalRequest | null;

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
