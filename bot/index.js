import { Markup } from "telegraf";
import { bot } from "./src/bot.js";
import { insertRequest, getRequest, getApp } from "./src/db.js";

const PORT = parseInt(process.env.PORT || "3000");

function generateId() {
    return `req_${crypto.randomUUID().slice(0, 8)}`;
}

const server = Bun.serve({
    port: PORT,
    routes: {
        "/health": new Response("OK", { status: 200 }),

        "/request": {
            POST: async (req) => {
                try {
                    const body = await req.json();

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

                    const app = getApp.get(body.appId);
                    if (!app) {
                        console.log(`App ID not found: ${body.appId}`);
                        return Response.json(
                            { error: "App ID not registered or pending approval" },
                            { status: 403 }
                        );
                    }

                    const requestId = generateId();
                    const appId = body.appId;
                    const envName = body.envName;
                    const path = body.path || "";
                    const now = Date.now();

                    insertRequest.run(requestId, appId, envName, path, now);

                    let messageText = `New Access Request\n\n` +
                        `App ID: ${appId}\n` +
                        `Environment: ${envName}`;

                    if (path) {
                        messageText += `\nPath: ${path}`;
                    }

                    await bot.telegram.sendMessage(
                        app.chat_id,
                        messageText,
                        {
                            parse_mode: "HTML",
                            ...Markup.inlineKeyboard([
                                [
                                    Markup.button.callback("Approve", `approve_${requestId}`),
                                    Markup.button.callback("Deny", `deny_${requestId}`),
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

        "/status/:id": (req) => {
            const { id } = req.params;
            const request = getRequest.get(id);

            if (!request) {
                return Response.json({ error: "Not found" }, { status: 404 });
            }

            if (request.status === "approved") {
                const response = {
                    status: "approved",
                    phaseToken: request.token,
                };

                return Response.json(response);
            }

            return Response.json({ status: request.status });
        },

        "/webhook": {
            POST: async (req) => {
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

    fetch() {
        return Response.json({ error: "Not found" }, { status: 404 });
    },
});

console.log(`Approval bot running on http://localhost:${server.port}`);
console.log(`Webhook URL: POST /webhook`);
console.log(`Status URL: GET /status/:id`);
console.log(`Request URL: POST /request`);
