# Crion

> 🛡️ Telegram-based approval system for Phase.dev secrets

Secure your secrets with human-in-the-loop approval. When your script needs a secret, Crion sends an approval request to Telegram. Only after you approve will the secret be released.

## Installation

```bash
# npm
npm install @cryptoistaken/crion

# bun
bun add @cryptoistaken/crion
```

## Quick Start

```typescript
import { getSecret } from '@cryptoistaken/crion';

// Request secrets - triggers Telegram approval
const secrets = await getSecret('/my-script-secrets');

console.log("Ready!", secrets.API_KEY);
```

> [!IMPORTANT]
> Always use specific paths like `/my-script`, `/database-prod`. Avoid using `/` which fetches all secrets.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PHASE_APP_ID` | ✅ | Your Phase application ID |
| `PHASE_ENV_NAME` | ❌ | Environment name (default: `production`) |
| `APPROVAL_API_URL` | ❌ | Bot URL (default: shared instance) |

## Examples

**Database Connection**
```typescript
const secrets = await getSecret('/database-prod');
const dbUrl = `postgres://${secrets.USER}:${secrets.PASS}@${secrets.HOST}/db`;
await connect(dbUrl);
```

**Payment Processing**
```typescript
const secrets = await getSecret('/stripe-keys');
const stripe = new Stripe(secrets.SK_LIVE);
await stripe.charges.create({ amount: 2000, currency: 'usd' });
```

## Self-Hosting

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for deploying your own approval bot.

## Security

- ✅ One-time tokens (consumed after use)
- ✅ Request expiration (5-minute timeout)
- ✅ Rate limiting (10 requests/minute)
- ✅ Cryptographic request IDs

See [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

## License

MIT © [cryptoistaken](https://github.com/Cryptoistaken)
