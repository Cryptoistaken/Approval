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

        // Now use the token with Phase SDK (v3.0.0+)
        // const phase = new Phase(token);

        // Example 1: Get all secrets in an environment
        // const secrets = await phase.get({
        //   appId: 'your-app-id',
        //   envName: 'Production'
        // });

        // Example 2: Get secrets at a specific path
        // const backendSecrets = await phase.get({
        //   appId: 'your-app-id',
        //   envName: 'Production',
        //   path: '/backend/services'
        // });

        // Example 3: Get secrets with specific tags
        // const dbSecrets = await phase.get({
        //   appId: 'your-app-id',
        //   envName: 'Production',
        //   tags: ['database', 'critical']
        // });

        // console.log('Successfully loaded secrets!');
    } catch (error) {
        if (error instanceof ApprovalError) {
            console.error(`\n❌ Approval failed: ${error.message} (${error.code})`);
            process.exit(1);
        }
        throw error;
    }
}

main();
