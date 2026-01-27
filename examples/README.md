# Example: Crion Calculation Demo

Demonstrates using Crion to securely fetch a secret number from Phase.dev.

## Setup

1. Create a Phase secret at path `/numbers` with key `NUMBER`
2. Set your environment variables (see main README)

## Run

```bash
# With npm
cd examples
npm install @cryptoistaken/crion
node calculate.js

# With bun
bun add @cryptoistaken/crion
bun run calculate.js
```

## What happens

1. Script requests the `/numbers` secret
2. You receive a Telegram notification  
3. Approve the request
4. Script receives the secret and runs calculations
