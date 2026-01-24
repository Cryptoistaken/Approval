import { Telegraf, Markup } from "telegraf";
import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

// Configuration
const CONFIG = {
    PORT: parseInt(process.env.PORT || "3000"),
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim(),
    PHASE_TOKEN: process.env.PHASE_TOKEN,
    PHASE_APP_ID: process.env.PHASE_APP_ID?.trim(),
    DATA_DIR: process.env.DATA_DIR || "./data",
    BOT_URL: process.env.BOT_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
};

// Validation
if (!CONFIG.BOT_TOKEN || !CONFIG.CHAT_ID || !CONFIG.PHASE_TOKEN || !CONFIG.PHASE_APP_ID) {
    console.error("ERROR: Missing required env vars (TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, PHASE_TOKEN, PHASE_APP_ID)");
    process.exit(1);
}

console.log(`Crion Bot Started | Chat: ${CONFIG.CHAT_ID} | App: ${CONFIG.PHASE_APP_ID}`);

// Database
await mkdir(CONFIG.DATA_DIR, { recursive: true });
const db = new Database(`${CONFIG.DATA_DIR}/approvals.db`);

db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        env TEXT,
        path TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER
    );
`);

const queries = {
    insert: db.prepare("INSERT INTO requests (id, env, path, status, created_at) VALUES (?, ?, ?, 'pending', ?)"),
    get: db.prepare("SELECT * FROM requests WHERE id = ?"),
    updateStatus: db.prepare("UPDATE requests SET status = ? WHERE id = ?")
};

// Bot
const bot = new Telegraf(CONFIG.BOT_TOKEN);

bot.start(ctx => ctx.reply(`🛡️ Crion Bot\nID: ${ctx.chat.id}`));

const handleAction = async (ctx, status) => {
    const id = ctx.match[1];
    const req = queries.get.get(id);
    if (!req || req.status !== "pending") return ctx.answerCbQuery("Already processed");

    queries.updateStatus.run(status, id);
    await ctx.answerCbQuery(status === "approved" ? "Approved" : "Denied");

    const emoji = status === "approved" ? "✅" : "❌";
    ctx.editMessageText(`${emoji} ${status.toUpperCase()}\n\nEnv: ${req.env}${req.path ? `\nPath: ${req.path}` : ""}`);
};

bot.action(/^approve_(.+)$/, ctx => handleAction(ctx, "approved"));
bot.action(/^deny_(.+)$/, ctx => handleAction(ctx, "denied"));

// Server
const server = Bun.serve({
    port: CONFIG.PORT,
    async fetch(req) {
        const { pathname } = new URL(req.url);

        if (pathname === "/health") return new Response("OK");

        try {
            // New Request
            if (pathname === "/request" && req.method === "POST") {
                const body = await req.json();
                if (!body.envName) return Response.json({ error: "envName required" }, { status: 400 });

                const id = `req_${crypto.randomUUID()}`;
                queries.insert.run(id, body.envName, body.path || "", Date.now());

                await bot.telegram.sendMessage(CONFIG.CHAT_ID,
                    `🔐 <b>Access Request</b>\n\nEnv: <b>${body.envName}</b>${body.path ? `\nPath: ${body.path}` : ""}`,
                    {
                        parse_mode: "HTML",
                        ...Markup.inlineKeyboard([[
                            Markup.button.callback("Approve", `approve_${id}`),
                            Markup.button.callback("Deny", `deny_${id}`)
                        ]])
                    }
                );
                return Response.json({ requestId: id });
            }

            // Check Status
            if (pathname.startsWith("/status/")) {
                const id = pathname.slice(8);
                const req = queries.get.get(id);

                if (!req) return Response.json({ error: "Not found" }, { status: 404 });
                if (req.status === "pending" && Date.now() - req.created_at > 300000) return Response.json({ status: "expired" });

                if (req.status === "approved") {
                    queries.updateStatus.run("consumed", id);
                    return Response.json({ status: "approved", phaseToken: CONFIG.PHASE_TOKEN, appId: CONFIG.PHASE_APP_ID });
                }
                return Response.json({ status: req.status });
            }

            // Webhook
            if (pathname === "/webhook" && req.method === "POST") {
                await bot.handleUpdate(await req.json());
                return new Response("OK");
            }
        } catch (e) {
            console.error(e);
            return Response.json({ error: "Server error" }, { status: 500 });
        }

        return Response.json({ error: "Not found" }, { status: 404 });
    }
});

console.log(`Server ready on port ${server.port}`);

// Webhook Setup
if (CONFIG.BOT_URL) {
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(CONFIG.BOT_URL + "/webhook")}`, { method: "POST" })
        .catch(console.error);
}
