// MINIMAL STARTUP TEST - No imports, just a health endpoint
console.log("=== MINIMAL CRION BOT STARTUP ===");
console.log("Starting bare-bones server...");

const PORT = parseInt(process.env.PORT || "3000");
console.log(`Using PORT: ${PORT}`);

try {
    const server = Bun.serve({
        port: PORT,
        fetch(req) {
            const url = new URL(req.url);
            console.log(`Request: ${req.method} ${url.pathname}`);

            if (url.pathname === "/health") {
                return new Response("OK", { status: 200 });
            }

            return new Response("Not Found", { status: 404 });
        },
    });

    console.log(`Server running on port ${server.port}`);
    console.log("Health check should pass now!");

    // Now try to load the rest of the app
    console.log("Loading full application...");
    import("./src/main.js").catch(err => {
        console.error("Failed to load main module:", err);
    });

} catch (error) {
    console.error("=== SERVER STARTUP FAILED ===");
    console.error(error);
    process.exit(1);
}
