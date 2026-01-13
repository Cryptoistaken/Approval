/**
 * Example: Using @cryptoistaken/approval with Phase.dev
 *
 * This demonstrates how to request approval before accessing secrets.
 *
 * Setup:
 * 1. Set APPROVAL_API_URL to your Railway bot URL
 * 2. Run: bun examples/basic.ts
 */

import { getApprovedToken, ApprovalError } from "../sdk/src/index";

// Simulating Phase SDK import
// import Phase from '@phase.dev/phase-node';

async function main() {
    console.log("=== Phase.dev Approval Example ===\n");

    try {
        const token = await getApprovedToken("production-secrets", {
            apiUrl: 'https://approval.up.railway.app',
            requester: "test-nodejs-script",
            environment: "production",
            timeout: 300000, // 5 minutes
        });

        console.log("\nToken received:", token.substring(0, 20) + "...");

        // Now use the token with Phase SDK
        // const phase = new Phase(token);
        // const secrets = await phase.get({
        //   appId: 'your-app-id',
        //   envName: 'Production'
        // });
        // console.log('Secrets:', secrets);

        console.log("\n✅ Success! You can now use this token with Phase SDK.");
    } catch (error) {
        if (error instanceof ApprovalError) {
            console.error(`\n❌ Approval failed: ${error.message} (${error.code})`);
            process.exit(1);
        }
        throw error;
    }
}

main();
