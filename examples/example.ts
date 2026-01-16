/**
 * Complete Example: @cryptoistaken/approval
 * 
 * Demonstrates how to securely fetch Phase.dev secrets with human approval.
 */
import { createApprovedPhase } from '../sdk/src/index'; // In your app, import from '@cryptoistaken/approval'

// Example: Simplified Phase integration with defaults
async function main() {
    console.log('--- Phase Approval Example ---');

    // MOCK: Set environment variable so we don't need a real server for this *syntax check*
    // In a real run, this would talk to the bot
    process.env.APPROVAL_API_URL = "https://approval.up.railway.app";

    try {
        console.log('Initializing Phase with approval + defaults...');

        // 1. One-line initialization with defaults
        // The Telegram message will show: appId, envName, and path
        const phase = await createApprovedPhase(
            {
                appId: '00000000-0000-0000-0000-000000000000', // Your Phase App ID
                envName: 'Production',
                path: '/database'
            },
            {
                // Optional: Approval settings
                timeout: 300000 // 5 minutes
            }
        );

        console.log('Approved! Fetching secrets...');

        // 2. Fetch without arguments - uses defaults from approval params
        const secrets = await phase.get();
        console.log('Secrets:', secrets);

    } catch (e: any) {
        if (e.message.includes('getApprovedToken')) {
            // Expected if we don't actually click approve
            console.log('Mock run finished (approval would hang here)');
        } else {
            console.log('Runtime Error (Expected for mock):', e.message);
        }
    }
}

main();
