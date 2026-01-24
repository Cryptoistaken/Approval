import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    console.log('Crion Calculation Test\n');

    try {
        const phase = await createApprovedPhase('/numbers', {
            envName: 'prod'
        });

        const secrets = await phase.get({ path: '/numbers' });

        const number = parseInt(secrets.NUMBER, 10);

        if (isNaN(number)) {
            console.error('NUMBER secret not found or invalid');
            process.exit(1);
        }

        console.log(`\nCalculations for NUMBER = ${number}\n`);
        console.log(`  Square:     ${number} x ${number} = ${number * number}`);
        console.log(`  Cube:       ${number}^3 = ${number ** 3}`);
        console.log(`  Double:     ${number} x 2 = ${number * 2}`);
        console.log(`  Half:       ${number} / 2 = ${number / 2}`);
        console.log(`  Factorial:  ${number}! = ${factorial(number)}`);
        console.log(`\nDone!`);

    } catch (error) {
        console.error(`\nError: ${error.message || error}`);
        if (error.code) {
            console.error(`Code: ${error.code}`);
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
