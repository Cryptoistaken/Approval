# Crion

Human-in-the-loop approval for [Phase.dev](https://phase.dev) secrets via Telegram.

```
Your Script → Crion → Telegram → You Approve → Secrets
```

## Quick Start

### 1. Deploy Bot to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app/template/crion)

**Required Environment Variables:**

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Get from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | Get from [@userinfobot](https://t.me/userinfobot) |
| `PHASE_TOKEN` | Your Phase service token |
| `PHASE_APP_ID` | Your Phase App ID (Required) |

### 2. Install SDK

```bash
npm install @cryptoistaken/crion
```

### 3. Use

#### Example: Calculation Script

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    // 1. Request approval
    // The bot returns a token AND the correct App ID automatically
    const phase = await createApprovedPhase('/numbers', {
        envName: 'production' // defaults to 'production' if not set
    });

    // 2. Fetch secrets
    // The SDK automatically handles the App ID for you
    const secrets = await phase.get({ path: '/numbers' });

    // 3. Use secrets
    const number = parseInt(secrets.NUMBER, 10);
    console.log(`Square: ${number * number}`);
}
```

## How It Works

1. Your script calls `createApprovedPhase('/path')`
2. Bot sends you a Telegram notification with Approve/Deny buttons
3. You tap **Approve**
4. SDK gets your Phase token and fetches secrets
5. Your script continues with the secrets

## SDK Configuration

```bash
# .env
APPROVAL_API_URL=https://your-bot.railway.app
PHASE_ENV_NAME=production
```

## API

### `createApprovedPhase(path, options?)`

```typescript
const phase = await createApprovedPhase('/chatbot', {
    timeout: 300000,      // 5 min default
    envName: 'production',
    apiUrl: 'https://your-bot.railway.app'
});

const secrets = await phase.get({ path: '/' });
```

### `getApprovedToken(path, options?)`

```typescript
const token = await getApprovedToken('/script');
// Use token with Phase SDK directly
```

## Security

- ✅ One-time token (cleared after fetched)
- ✅ 5-minute request expiry
- ✅ Full UUID request IDs
- ✅ Human approval required

## License

MIT
