# Self-Hosting Guide

Deploy your own Crion approval bot for maximum security and control.

## Prerequisites

- [Phase.dev](https://phase.dev) account with service token
- [Telegram Bot](https://core.telegram.org/bots#creating-a-new-bot) token
- [Railway](https://railway.app) account (or any Node.js host)

## Quick Deploy (Railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/crion)

Or manually:

```bash
git clone https://github.com/Cryptoistaken/Crion.git
cd Crion/packages/bot
railway login
railway init
railway up
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | ✅ | Your chat/group ID |
| `PHASE_TOKEN` | ✅ | Phase service token |
| `PHASE_APP_ID` | ✅ | Phase application ID |
| `PORT` | ❌ | Server port (default: 3000) |
| `BOT_URL` | ❌ | Public URL for webhooks |
| `DATA_DIR` | ❌ | Database path (default: ./data) |
| `RATE_LIMIT` | ❌ | Max requests/window (default: 10) |
| `RATE_WINDOW` | ❌ | Rate window in ms (default: 60000) |

## Getting Your Chat ID

1. Start your bot in Telegram
2. Send `/start`
3. Bot replies with your Chat ID

For groups: Add bot to group, send any message, check bot logs.

## SDK Configuration

Point your SDK to your self-hosted instance:

```typescript
import { getSecret } from '@cryptoistaken/crion';

const secrets = await getSecret('/path', {
    apiUrl: 'https://your-bot.railway.app'
});
```

Or via environment variable:
```bash
APPROVAL_API_URL=https://your-bot.railway.app
```

## Running Locally

```bash
# With Bun (recommended)
cd packages/bot
bun install
bun run dev

# With Node.js
npm install
npm start
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/request` | POST | Create approval request |
| `/status/:id` | GET | Check request status |
| `/webhook` | POST | Telegram webhook |
