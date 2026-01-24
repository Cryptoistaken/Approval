# Crion

Human-in-the-loop approval for [Phase.dev](https://phase.dev) secrets via Telegram.

## How It Works

```
Your Script → Crion SDK → Crion Bot → Telegram → You Approve → Secrets
```

## Setup

### 1. Deploy the Bot (Railway)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/crion?referralCode=4n_jis)

**Set these environment variables:**

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | Your chat ID (get from [@userinfobot](https://t.me/userinfobot)) |
| `PHASE_TOKEN` | Your Phase service token |
| `PHASE_APP_ID` | Your Phase app ID (optional) |

### 2. Install the SDK

```bash
npm install @cryptoistaken/crion
```

### 3. Configure Your Project

```bash
# .env
APPROVAL_API_URL=https://your-bot.railway.app
PHASE_ENV_NAME=production
```

### 4. Use It

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

// This sends a Telegram notification
const phase = await createApprovedPhase('/my-script');

// After you approve in Telegram:
const secrets = await phase.get({ path: '/' });
console.log(secrets.API_KEY);
```

## API

### `createApprovedPhase(path, options?)`

Request approval and get a Phase instance.

```typescript
const phase = await createApprovedPhase('/chatbot', {
    timeout: 300000,     // 5 min (default)
    envName: 'production'
});

const secrets = await phase.get({ path: '/' });
```

### `getApprovedToken(path, options?)`

Request approval and get just the token.

```typescript
const token = await getApprovedToken('/script');
// Use token with Phase directly
```

## Security

- ✅ One-time token fetch (cleared after first use)
- ✅ 5-minute request expiry
- ✅ Full UUID request IDs (unguessable)
- ✅ Human approval required for every request

## License

MIT
