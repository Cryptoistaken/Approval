// Main application module - loaded after health endpoint is ready
console.log("=== Loading main application ===");

console.log("Environment check:");
console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? "SET" : "NOT SET"}`);
console.log(`  TELEGRAM_ADMIN_CHAT_ID: ${process.env.TELEGRAM_ADMIN_CHAT_ID || "NOT SET"}`);
console.log(`  PHASE_TOKEN: ${process.env.PHASE_TOKEN ? "SET" : "NOT SET"}`);
console.log(`  DATA_DIR: ${process.env.DATA_DIR || "./data (default)"}`);

try {
    const { Markup } = await import("telegraf");
    console.log("Loaded telegraf");

    const { bot } = await import("./bot.js");
    console.log("Loaded bot module");

    const { insertRequest, getRequest, getApp } = await import("./db.js");
    console.log("Loaded database module");

    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const SIMPLE_MODE = !!ADMIN_CHAT_ID;

    if (SIMPLE_MODE) {
        console.log("Running in SIMPLE MODE (single-tenant)");
    } else {
        console.log("Running in REGISTRATION MODE (multi-tenant)");
    }

    // Export functions for route handlers
    globalThis.crionApp = {
        Markup,
        bot,
        insertRequest,
        getRequest,
        getApp,
        SIMPLE_MODE,
        ADMIN_CHAT_ID,
    };

    console.log("=== Main application loaded successfully ===");

} catch (error) {
    console.error("=== MAIN MODULE LOAD ERROR ===");
    console.error(error);
}
