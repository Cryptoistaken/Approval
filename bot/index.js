/**
 * Crion Bot - Telegram-based Human-in-the-Loop Approval System
 * 
 * This bot provides secure approval workflows for Phase.dev secrets.
 * It supports two modes:
 * 
 * 1. SIMPLE MODE (Self-hosted, single user)
 *    - Set TELEGRAM_ADMIN_CHAT_ID to your Telegram chat ID
 *    - All approval requests go to that single chat
 *    - Requires PHASE_TOKEN to be set
 * 
 * 2. MULTI-TENANT MODE (Shared service, multiple users)
 *    - Do NOT set TELEGRAM_ADMIN_CHAT_ID
 *    - Users register via Telegram bot wizard
 *    - Each user provides their own Phase token during registration
 * 
 * Environment Variables:
 *   TELEGRAM_BOT_TOKEN   - Required. Get from @BotFather on Telegram
 *   PORT                 - Optional. Server port (default: 3000)
 *   DATA_DIR             - Optional. SQLite data directory (default: ./data)
 *   
 *   Simple Mode Only:
 *   TELEGRAM_ADMIN_CHAT_ID - Your Telegram chat ID
 *   PHASE_TOKEN            - Your Phase service token
 *   
 *   Auto-Webhook (Optional):
 *   BOT_URL                - Public URL of this bot (auto-sets webhook)
 *   RAILWAY_PUBLIC_DOMAIN  - Auto-detected on Railway
 */

// ============================================================================
// STARTUP LOGGING
// ============================================================================

console.log("╔══════════════════════════════════════╗");
console.log("║        Crion Approval Bot            ║");
console.log("╚══════════════════════════════════════╝");
console.log("");
console.log("Environment:");
console.log(`  PORT:                  ${process.env.PORT || "3000 (default)"}`);
console.log(`  TELEGRAM_BOT_TOKEN:    ${process.env.TELEGRAM_BOT_TOKEN ? "✓ SET" : "✗ NOT SET"}`);
console.log(`  TELEGRAM_ADMIN_CHAT_ID: ${process.env.TELEGRAM_ADMIN_CHAT_ID || "(not set - multi-tenant mode)"}`);
console.log(`  PHASE_TOKEN:           ${process.env.PHASE_TOKEN ? "✓ SET" : "(not set)"}`);
console.log(`  DATA_DIR:              ${process.env.DATA_DIR || "./data (default)"}`);
console.log(`  BOT_URL:               ${process.env.BOT_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "(not set - manual webhook setup)"}`);
console.log("");

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || "3000");
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
const SIMPLE_MODE = !!ADMIN_CHAT_ID;

// App state - populated after async module loading
const app = {
    ready: false,
    Markup: null,
    bot: null,
    insertRequest: null,
    getRequest: null,
    getApp: null,
};

// ============================================================================
// UTILITIES
// ============================================================================

function generateRequestId() {
    return `req_${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================================================
// HTTP SERVER - Starts immediately for health checks
// ============================================================================

const server = Bun.serve({
    port: PORT,

    routes: {
        // Health check endpoint - always available
        "/health": () => new Response("OK", { status: 200 }),

        // Create approval request
        "/request": {
            POST: async (req) => {
                if (!app.ready) {
                    return Response.json(
                        { error: "Server starting up, please retry" },
                        { status: 503 }
                    );
                }

                try {
                    const body = await req.json();

                    // Validate required fields
                    if (!body.appId) {
                        return Response.json(
                            { error: "appId is required" },
                            { status: 400 }
                        );
                    }

                    if (!body.envName) {
                        return Response.json(
                            { error: "envName is required" },
                            { status: 400 }
                        );
                    }

                    // Determine which chat to send the approval request to
                    let chatId;
                    if (SIMPLE_MODE) {
                        chatId = ADMIN_CHAT_ID;
                    } else {
                        const registeredApp = app.getApp.get(body.appId);
                        if (!registeredApp) {
                            console.log(`[WARN] Unregistered app attempted access: ${body.appId}`);
                            return Response.json(
                                { error: "App ID not registered. Please register via @CrionDevBot on Telegram." },
                                { status: 403 }
                            );
                        }
                        chatId = registeredApp.chat_id;
                    }

                    // Create the request record
                    const requestId = generateRequestId();
                    const appId = body.appId;
                    const envName = body.envName;
                    const path = body.path || "";

                    app.insertRequest.run(requestId, appId, envName, path, Date.now());

                    // Build Telegram message
                    let messageText = `🔐 <b>New Access Request</b>\n\n` +
                        `<b>App ID:</b> <code>${appId}</code>\n` +
                        `<b>Environment:</b> ${envName}`;

                    if (path) {
                        messageText += `\n<b>Path:</b> ${path}`;
                    }

                    // Send to Telegram with approve/deny buttons
                    await app.bot.telegram.sendMessage(chatId, messageText, {
                        parse_mode: "HTML",
                        ...app.Markup.inlineKeyboard([
                            [
                                app.Markup.button.callback("✅ Approve", `approve_${requestId}`),
                                app.Markup.button.callback("❌ Deny", `deny_${requestId}`),
                            ],
                        ]),
                    });

                    console.log(`[INFO] Request created: ${requestId} for app ${appId}`);
                    return Response.json({ requestId });

                } catch (error) {
                    console.error("[ERROR] Request creation failed:", error);
                    return Response.json(
                        { error: "Failed to create request" },
                        { status: 500 }
                    );
                }
            },
        },

        // Check request status
        "/status/:id": (req) => {
            if (!app.ready) {
                return Response.json(
                    { error: "Server starting up" },
                    { status: 503 }
                );
            }

            const { id } = req.params;
            const request = app.getRequest.get(id);

            if (!request) {
                return Response.json({ error: "Not found" }, { status: 404 });
            }

            if (request.status === "approved") {
                return Response.json({
                    status: "approved",
                    phaseToken: request.token,
                });
            }

            return Response.json({ status: request.status });
        },

        // Telegram webhook endpoint
        "/webhook": {
            POST: async (req) => {
                if (!app.ready) {
                    return new Response("Server starting up", { status: 503 });
                }

                try {
                    const update = await req.json();
                    await app.bot.handleUpdate(update);
                    return new Response("OK");
                } catch (error) {
                    console.error("[ERROR] Webhook processing failed:", error);
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

console.log(`Server listening on port ${server.port}`);
console.log("Loading application modules...");

// ============================================================================
// ASYNC MODULE LOADING
// Deferred to allow health check to respond immediately
// ============================================================================

async function initializeApp() {
    try {
        // Load dependencies
        const { Markup } = await import("telegraf");
        console.log("  ✓ Loaded telegraf");

        const { bot } = await import("./src/bot.js");
        console.log("  ✓ Loaded bot handlers");

        const { insertRequest, getRequest, getApp } = await import("./src/db.js");
        console.log("  ✓ Loaded database");

        // Populate app state
        app.Markup = Markup;
        app.bot = bot;
        app.insertRequest = insertRequest;
        app.getRequest = getRequest;
        app.getApp = getApp;
        app.ready = true;

        // Log mode and endpoints
        console.log("");
        if (SIMPLE_MODE) {
            console.log("Mode: SIMPLE (single-tenant)");
            console.log(`  Approvals sent to chat: ${ADMIN_CHAT_ID}`);
        } else {
            console.log("Mode: MULTI-TENANT (shared service)");
            console.log("  Users register via Telegram bot");
        }

        console.log("");
        console.log("Endpoints:");
        console.log("  GET  /health      - Health check");
        console.log("  POST /request     - Create approval request");
        console.log("  GET  /status/:id  - Check request status");
        console.log("  POST /webhook     - Telegram webhook");
        console.log("");
        console.log("╔══════════════════════════════════════╗");
        console.log("║         Crion Bot Ready! ✓           ║");
        console.log("╚══════════════════════════════════════╝");

        // Auto-setup webhook if BOT_URL or RAILWAY_PUBLIC_DOMAIN is set
        const botUrl = process.env.BOT_URL ||
            (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

        if (botUrl) {
            try {
                const webhookUrl = `${botUrl}/webhook`;
                const telegramApi = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

                const response = await fetch(telegramApi, { method: 'POST' });
                const result = await response.json();

                if (result.ok) {
                    console.log(`\n✓ Webhook auto-configured: ${webhookUrl}`);
                } else {
                    console.error(`\n✗ Webhook setup failed: ${result.description}`);
                }
            } catch (err) {
                console.error(`\n✗ Webhook setup error: ${err.message}`);
            }
        } else {
            console.log("\nℹ Set BOT_URL to auto-configure webhook, or run manually:");
            console.log(`  curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/webhook"`);
        }

    } catch (error) {
        console.error("");
        console.error("╔══════════════════════════════════════╗");
        console.error("║      STARTUP FAILED!                 ║");
        console.error("╚══════════════════════════════════════╝");
        console.error(error);
        process.exit(1);
    }
}

initializeApp();
