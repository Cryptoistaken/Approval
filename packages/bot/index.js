import { Telegraf, Markup } from "telegraf";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";

// ============================================================================
// Configuration
// ============================================================================
const CONFIG = {
    PORT: parseInt(process.env.PORT || "3000"),
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim(),
    PHASE_TOKEN: process.env.PHASE_TOKEN,
    PHASE_APP_ID: process.env.PHASE_APP_ID?.trim(),
    DATA_DIR: process.env.DATA_DIR || "./data",
    BOT_URL: process.env.BOT_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null),
    RATE_LIMIT: parseInt(process.env.RATE_LIMIT || "10"),
    RATE_WINDOW: parseInt(process.env.RATE_WINDOW || "60000")
};

// Validation
if (!CONFIG.BOT_TOKEN || !CONFIG.CHAT_ID || !CONFIG.PHASE_TOKEN || !CONFIG.PHASE_APP_ID) {
    console.error("ERROR: Missing required env vars (TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, PHASE_TOKEN, PHASE_APP_ID)");
    process.exit(1);
}

console.log(`🛡️ Crion Bot Starting | Chat: ${CONFIG.CHAT_ID} | App: ${CONFIG.PHASE_APP_ID}`);

// ============================================================================
// Database Setup (Supports both Bun and Node.js)
// ============================================================================
await mkdir(CONFIG.DATA_DIR, { recursive: true });

let db;
const isBun = typeof Bun !== "undefined";

if (isBun) {
    // Use Bun's built-in SQLite
    const { Database } = await import("bun:sqlite");
    db = new Database(`${CONFIG.DATA_DIR}/approvals.db`);
} else {
    // Use better-sqlite3 for Node.js
    const BetterSqlite3 = (await import("better-sqlite3")).default;
    db = new BetterSqlite3(`${CONFIG.DATA_DIR}/approvals.db`);
}

db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        env TEXT,
        path TEXT,
        client_ip TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER
    );
`);

const queries = {
    insert: db.prepare("INSERT INTO requests (id, env, path, client_ip, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"),
    get: db.prepare("SELECT * FROM requests WHERE id = ?"),
    updateStatus: db.prepare("UPDATE requests SET status = ? WHERE id = ?")
};

// ============================================================================
// Rate Limiting
// ============================================================================
const rateLimits = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const requests = rateLimits.get(ip) || [];
    const recent = requests.filter(t => now - t < CONFIG.RATE_WINDOW);

    if (recent.length >= CONFIG.RATE_LIMIT) {
        return false;
    }

    recent.push(now);
    rateLimits.set(ip, recent);
    return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of rateLimits.entries()) {
        const recent = requests.filter(t => now - t < CONFIG.RATE_WINDOW);
        if (recent.length === 0) {
            rateLimits.delete(ip);
        } else {
            rateLimits.set(ip, recent);
        }
    }
}, 60000);

// ============================================================================
// Telegram Bot
// ============================================================================
const bot = new Telegraf(CONFIG.BOT_TOKEN);

bot.start(ctx => ctx.reply(`🛡️ Crion Bot\nChat ID: ${ctx.chat.id}`));

const handleAction = async (ctx, status) => {
    const id = ctx.match[1];
    const req = queries.get.get(id);

    if (!req || req.status !== "pending") {
        return ctx.answerCbQuery("Already processed");
    }

    queries.updateStatus.run(status, id);
    await ctx.answerCbQuery(status === "approved" ? "✅ Approved" : "❌ Denied");

    const emoji = status === "approved" ? "✅" : "❌";
    ctx.editMessageText(`${emoji} ${status.toUpperCase()}\n\nEnv: ${req.env}${req.path ? `\nPath: ${req.path}` : ""}`);
};

bot.action(/^approve_(.+)$/, ctx => handleAction(ctx, "approved"));
bot.action(/^deny_(.+)$/, ctx => handleAction(ctx, "denied"));

// ============================================================================
// HTTP Server (Node.js compatible)
// ============================================================================
const parseBody = (req) => new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
        try {
            resolve(data ? JSON.parse(data) : {});
        } catch (e) {
            reject(new Error("Invalid JSON"));
        }
    });
    req.on("error", reject);
});

const sendJson = (res, data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
};

const getClientIp = (req) => {
    return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers["x-real-ip"] ||
        req.socket.remoteAddress ||
        "unknown";
};

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const clientIp = getClientIp(req);

    // Health check
    if (pathname === "/health") {
        res.writeHead(200);
        return res.end("OK");
    }

    try {
        // New Request
        if (pathname === "/request" && req.method === "POST") {
            // Rate limiting
            if (!checkRateLimit(clientIp)) {
                return sendJson(res, { error: "Rate limit exceeded" }, 429);
            }

            const body = await parseBody(req);

            if (!body.envName) {
                return sendJson(res, { error: "envName required" }, 400);
            }

            const id = `req_${crypto.randomUUID()}`;
            queries.insert.run(id, body.envName, body.path || "", clientIp, Date.now());

            await bot.telegram.sendMessage(CONFIG.CHAT_ID,
                `🔐 <b>Access Request</b>\n\nEnv: <b>${body.envName}</b>${body.path ? `\nPath: ${body.path}` : ""}\nIP: <code>${clientIp}</code>`,
                {
                    parse_mode: "HTML",
                    ...Markup.inlineKeyboard([[
                        Markup.button.callback("✅ Approve", `approve_${id}`),
                        Markup.button.callback("❌ Deny", `deny_${id}`)
                    ]])
                }
            );

            return sendJson(res, { requestId: id });
        }

        // Check Status
        if (pathname.startsWith("/status/")) {
            const id = pathname.slice(8);
            const request = queries.get.get(id);

            if (!request) {
                return sendJson(res, { error: "Not found" }, 404);
            }

            // Check expiration (5 minutes)
            if (request.status === "pending" && Date.now() - request.created_at > 300000) {
                return sendJson(res, { status: "expired" });
            }

            if (request.status === "approved") {
                queries.updateStatus.run("consumed", id);
                return sendJson(res, {
                    status: "approved",
                    phaseToken: CONFIG.PHASE_TOKEN,
                    appId: CONFIG.PHASE_APP_ID
                });
            }

            return sendJson(res, { status: request.status });
        }

        // Webhook
        if (pathname === "/webhook" && req.method === "POST") {
            const body = await parseBody(req);
            await bot.handleUpdate(body);
            res.writeHead(200);
            return res.end("OK");
        }

        // Not found
        sendJson(res, { error: "Not found" }, 404);

    } catch (e) {
        console.error("Server error:", e);
        sendJson(res, { error: "Server error" }, 500);
    }
});

server.listen(CONFIG.PORT, () => {
    console.log(`✅ Server ready on port ${CONFIG.PORT}`);
});

// ============================================================================
// Webhook Setup
// ============================================================================
if (CONFIG.BOT_URL) {
    const webhookUrl = `${CONFIG.BOT_URL}/webhook`;
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`, {
        method: "POST"
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                console.log(`📡 Webhook set: ${webhookUrl}`);
            } else {
                console.error("Failed to set webhook:", data);
            }
        })
        .catch(console.error);
}
