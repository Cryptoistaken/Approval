/**
 * Crion Test Script
 * 
 * This script uses @cryptoistaken/crion to request approval
 * and fetch a secret NUMBER from Phase, then performs calculations.
 * 
 * The bot returns the appId along with the token after approval,
 * so no local configuration is needed!
 * 
 * Usage: bun run calculate.js
 */

import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    console.log('🧮 Crion Calculation Test\n');

    try {
        // Request approval and get Phase instance
        // Bot will return appId after Telegram approval
        const phase = await createApprovedPhase('/numbers', {
            envName: 'prod'
        });

        // Fetch secrets from /numbers path
        const secrets = await phase.get({ path: '/numbers' });

        // Get the NUMBER value
        const number = parseInt(secrets.NUMBER, 10);

        if (isNaN(number)) {
            console.error('❌ NUMBER secret not found or invalid');
            process.exit(1);
        }

        console.log(`\n📊 Calculations for NUMBER = ${number}\n`);
        console.log(`  • Square:     ${number} × ${number} = ${number * number}`);
        console.log(`  • Cube:       ${number}³ = ${number ** 3}`);
        console.log(`  • Double:     ${number} × 2 = ${number * 2}`);
        console.log(`  • Half:       ${number} ÷ 2 = ${number / 2}`);
        console.log(`  • Factorial:  ${number}! = ${factorial(number)}`);
        console.log(`\n✅ Done!`);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message || error}`);
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        if (error.stack) {
            console.error(`   Stack: ${error.stack}`);
        }
        process.exit(1);
    }
}

function factorial(n) {
    if (n <= 1) return 1;
    if (n > 20) return 'Too large';
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

main();
