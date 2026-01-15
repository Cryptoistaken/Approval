/**
 * Complete Example: @cryptoistaken/approval
 * 
 * Demonstrates how to securely fetch Phase.dev secrets with human approval.
 */
import { createApprovedPhase } from '../sdk/src/index'; // In your app, import from '@cryptoistaken/approval'

// Example: Simplified Phase integration with defaults
async function main() {
    console.log('--- Phase Approval Mockup ---');

    // MOCK: Set environment variable so we don't need a real server for this *syntax check*
    // In a real run, this would talk to the bot
    process.env.APPROVAL_API_URL = "https://approval.up.railway.app";

    try {
        console.log('Initializing Phase with approval + defaults...');

        // 1. One-line initialization with defaults
        const phase = await createApprovedPhase('prod-db-credentials', {
            // Approval settings
            requester: 'integration-test',
            environment: 'Production',

            // Phase Defaults!
            appId: '00000000-0000-0000-0000-000000000000', // Mock UUID
            envName: 'Production',
            path: '/database'
        });

        console.log('Appproved! Fetching secrets...');

        // 2. Fetch without arguments - uses defaults
        // This will fail at runtime without a real token, but verifies the API syntax
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
