# @cryptoistaken/approval

Telegram-based approval system for Phase.dev secrets. Request approval via Telegram before your scripts can access secrets.

## How It Works

```
Your script runs
    ↓
Calls getApprovedToken('production-secrets')
    ↓
Bot sends you Telegram message with [Approve] [Deny] buttons
    ↓
You click Approve on your phone
    ↓
Script receives Phase token and continues
```

## Quick Start

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the bot token (looks like `123456:ABC-xyz...`)

### 2. Get Your Chat ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It replies with your user ID (a number like `123456789`)

### 3. Deploy Bot to Railway

1. Push this repository to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Select "Connect GitHub Repo"
4. Choose this repository
5. **IMPORTANT**: Set the "Root Directory" in Railway Service Settings to `/bot`
6. Add environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ADMIN_CHAT_ID`
   - `PHASE_TOKEN`

### 4. Set Telegram Webhook

After deploying, set the webhook URL:

```
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<RAILWAY_URL>/webhook"
```

### 5. Install & Use SDK

```bash
cd sdk
bun run build
npm publish --access public
```

In your script:

```typescript
import { getApprovedToken } from '@cryptoistaken/approval';
import Phase from '@phase.dev/phase-node';

// Set APPROVAL_API_URL environment variable to your Railway URL
const token = await getApprovedToken('production-secrets');

const phase = new Phase(token);
// ...
```
