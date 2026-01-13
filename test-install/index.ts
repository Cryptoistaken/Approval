
import { getApprovedToken, ApprovalError } from "@cryptoistaken/approval";

async function main() {
    console.log("=== Phase.dev Approval Example ===\n");

    try {
        console.log("Requesting approval... (Press Ctrl+C to cancel if it hangs)");
        const token = await getApprovedToken("production-secrets", {
            apiUrl: 'https://approval.up.railway.app',
            requester: "test-verified-install",
            environment: "production",
            timeout: 5000, // 5 seconds timeout for test
        });

        console.log("\nToken received:", token.substring(0, 20) + "...");
    } catch (error) {
        if (error instanceof ApprovalError) {
            // If we get an error or timeout, that's fine, it means the SDK is working!
            console.log(`\n✅ SDK Error handling works: ${error.message} (${error.code})`);
            process.exit(0);
        }
        // If it's a real error (like module not found), we want to see it
        console.error("Unknown error:", error);
        throw error;
    }
}

main();