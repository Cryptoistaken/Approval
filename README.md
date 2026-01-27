# Crion

> 🛡️ Telegram-based approval system for Phase.dev secrets

Secure your secrets with human-in-the-loop approval. When your script needs secrets, Crion sends an approval request to Telegram. Only after you approve will the secrets be released.

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

// Request approval and get ALL secrets at the path
const secrets = await getSecret('/my-app');

// Access individual values
console.log(secrets.API_KEY);
console.log(secrets.API_SECRET);
console.log(secrets.DATABASE_URL);
```

> [!IMPORTANT]
> `getSecret('/path')` returns **all secrets** at that path as a key-value object.
> Always use specific paths like `/my-app`, `/bot-config`. Avoid `/` in production.

## How It Works

```
1. Your script calls getSecret('/path')
2. You receive a Telegram notification
3. Approve or Deny the request
4. If approved: All secrets at that path are returned
5. If denied: Script throws ApprovalError
```

## Multiple Secrets Example

If your Phase path `/my-bot` has these secrets:
- `BOT_TOKEN` = "abc123"
- `WEBHOOK_SECRET` = "xyz789"  
- `DATABASE_URL` = "postgres://..."

```typescript
const secrets = await getSecret('/my-bot');

// secrets = {
//   BOT_TOKEN: "abc123",
//   WEBHOOK_SECRET: "xyz789",
//   DATABASE_URL: "postgres://..."
// }

const bot = new Bot(secrets.BOT_TOKEN);
await db.connect(secrets.DATABASE_URL);
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PHASE_APP_ID` | ✅ | Your Phase application ID |
| `PHASE_ENV_NAME` | ❌ | Environment (default: `production`) |
| `APPROVAL_API_URL` | ❌ | Bot URL (default: shared instance) |

## Error Handling

```typescript
import { getSecret, ApprovalError } from '@cryptoistaken/crion';

try {
    const secrets = await getSecret('/my-app');
} catch (error) {
    if (error instanceof ApprovalError) {
        switch (error.code) {
            case 'DENIED':  // User clicked Deny
            case 'TIMEOUT': // 5 minutes passed
            case 'EXPIRED': // Request already used
            case 'NETWORK': // Connection failed
        }
    }
}
```

## Self-Hosting

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for deploying your own approval bot.

## Security

- ✅ One-time tokens (consumed after use)  
- ✅ Request expiration (5 minutes)
- ✅ Rate limiting (10 requests/minute)

See [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

## License

MIT © [cryptoistaken](https://github.com/Cryptoistaken)
