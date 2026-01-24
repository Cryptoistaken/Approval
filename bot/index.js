// Crion Bot - Telegram-based approval system
console.log("=== Crion Bot Starting ===");
console.log(`PORT: ${process.env.PORT || "3000 (default)"}`);
console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? "SET" : "NOT SET"}`);
console.log(`TELEGRAM_ADMIN_CHAT_ID: ${process.env.TELEGRAM_ADMIN_CHAT_ID || "NOT SET"}`);
console.log(`PHASE_TOKEN: ${process.env.PHASE_TOKEN ? "SET" : "NOT SET"}`);
console.log(`DATA_DIR: ${process.env.DATA_DIR || "./data (default)"}`);

const PORT = parseInt(process.env.PORT || "3000");
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const SIMPLE_MODE = !!ADMIN_CHAT_ID;

// App state - will be populated after modules load
let app = {
    ready: false,
    Markup: null,
    bot: null,
    insertRequest: null,
    getRequest: null,
    getApp: null,
};

function generateId() {
    return `req_${crypto.randomUUID().slice(0, 8)}`;
}

// Start server immediately for health checks
const server = Bun.serve({
    port: PORT,
    routes: {
        "/health": new Response("OK", { status: 200 }),

        "/request": {
            POST: async (req) => {
                if (!app.ready) {
                    return Response.json({ error: "Server starting up" }, { status: 503 });
                }

                try {
                    const body = await req.json();

                    if (!body.appId) {
                        return Response.json({ error: "appId is required" }, { status: 400 });
                    }

                    if (!body.envName) {
                        return Response.json({ error: "envName is required" }, { status: 400 });
                    }

                    let chatId;
                    if (SIMPLE_MODE) {
                        chatId = ADMIN_CHAT_ID;
                    } else {
                        const appData = app.getApp.get(body.appId);
                        if (!appData) {
                            console.log(`App ID not found: ${body.appId}`);
                            return Response.json({ error: "App ID not registered" }, { status: 403 });
                        }
                        chatId = appData.chat_id;
                    }

                    const requestId = generateId();
                    const appId = body.appId;
                    const envName = body.envName;
                    const path = body.path || "";
                    const now = Date.now();

                    app.insertRequest.run(requestId, appId, envName, path, now);

                    let messageText = `New Access Request\n\n` +
                        `App ID: ${appId}\n` +
                        `Environment: ${envName}`;

                    if (path) {
                        messageText += `\nPath: ${path}`;
                    }

                    await app.bot.telegram.sendMessage(
                        chatId,
                        messageText,
                        {
                            parse_mode: "HTML",
                            ...app.Markup.inlineKeyboard([
                                [
                                    app.Markup.button.callback("Approve", `approve_${requestId}`),
                                    app.Markup.button.callback("Deny", `deny_${requestId}`),
                                ],
                            ]),
                        }
                    );
                    return Response.json({ requestId });
                } catch (error) {
                    console.error("Request error:", error);
                    return Response.json({ error: "Failed to create request" }, { status: 500 });
                }
            },
        },

        "/status/:id": (req) => {
            if (!app.ready) {
                return Response.json({ error: "Server starting up" }, { status: 503 });
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
                    console.error("Webhook error:", error);
                    return new Response("Error", { status: 500 });
                }
            },
        },
    },

    fetch() {
        return Response.json({ error: "Not found" }, { status: 404 });
    },
});

console.log(`Server running on port ${server.port}`);
console.log("Loading application modules...");

// Load modules asynchronously after server starts
async function loadApp() {
    try {
        const { Markup } = await import("telegraf");
        console.log("Loaded telegraf");

        const { bot } = await import("./src/bot.js");
        console.log("Loaded bot module");

        const { insertRequest, getRequest, getApp } = await import("./src/db.js");
        console.log("Loaded database module");

        // Populate app state
        app.Markup = Markup;
        app.bot = bot;
        app.insertRequest = insertRequest;
        app.getRequest = getRequest;
        app.getApp = getApp;
        app.ready = true;

        if (SIMPLE_MODE) {
            console.log("Running in SIMPLE MODE (single-tenant)");
        } else {
            console.log("Running in REGISTRATION MODE (multi-tenant)");
        }

        console.log("=== Crion Bot Ready ===");
        console.log(`Health: GET /health`);
        console.log(`Request: POST /request`);
        console.log(`Status: GET /status/:id`);
        console.log(`Webhook: POST /webhook`);

    } catch (error) {
        console.error("=== MODULE LOAD ERROR ===");
        console.error(error);
    }
}

loadApp();
