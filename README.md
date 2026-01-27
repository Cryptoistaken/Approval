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

// Use secrets directly - NEVER log them!
await db.connect(secrets.DATABASE_URL);
await api.init(secrets.API_KEY);
```

> [!CAUTION]
> **Never print secrets to console!** Use them directly in your code. Only log secrets if explicitly needed for debugging and remove immediately after.

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

// ✅ CORRECT - Use directly without logging
const bot = new Bot(secrets.BOT_TOKEN);
await db.connect(secrets.DATABASE_URL);

// ❌ WRONG - Never do this!
// console.log(secrets);
// console.log(secrets.BOT_TOKEN);
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
    // Use secrets here...
} catch (error) {
    if (error instanceof ApprovalError) {
        switch (error.code) {
            case 'DENIED':  console.error('Request denied'); break;
            case 'TIMEOUT': console.error('Approval timed out'); break;
            case 'EXPIRED': console.error('Request expired'); break;
            case 'NETWORK': console.error('Connection failed'); break;
        }
    }
    process.exit(1);
}
```

## AI Integration

See [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md) for a prompt template to help AI assistants integrate Crion into your scripts.

## Self-Hosting

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for deploying your own approval bot.

## Security

- ✅ One-time tokens (consumed after use)  
- ✅ Request expiration (5 minutes)
- ✅ Rate limiting (10 requests/minute)
- ⚠️ Never log secrets to console

See [docs/SECURITY.md](docs/SECURITY.md) for the full security model.

## License

MIT © [cryptoistaken](https://github.com/Cryptoistaken)
