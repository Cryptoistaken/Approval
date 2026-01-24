import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    console.log("Starting Crion SDK Example");

    try {
        console.log("Requesting approval");

        const phase = await createApprovedPhase('/chatbot');

        console.log("Approval granted");

        console.log("Fetching secrets");
        const secrets = await phase.get();

        console.log("Secrets fetched:");
        console.log(secrets);

    } catch (error) {
        console.error("Example failed:");
        console.error(error);
        process.exit(1);
    }
}

main();
