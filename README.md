# Crion

A secure, human-in-the-loop approval system for [Phase.dev](https://phase.dev) secrets.

Crion ensures that sensitive secrets are only accessed with explicit human approval via Telegram.

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐     ┌─────────┐
│ Your Script │────▶│  Crion SDK   │────▶│ Crion Bot │────▶│Telegram │
└─────────────┘     └──────────────┘     └───────────┘     └────┬────┘
                                                                 │
       ┌──────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ You Approve │────▶│ Phase Token  │────▶│ Your Secrets  │
└─────────────┘     └──────────────┘     └───────────────┘
```

---

## Choose Your Setup

| Option | Description | Best For |
|--------|-------------|----------|
| **[Use Shared Bot](#quick-start-shared-bot)** | Use our hosted `@CrionDevBot` | Quick start, no server needed |
| **[Self-Host](#self-hosting-your-own-bot)** | Deploy your own bot instance | Full control, privacy |

---

## Quick Start (Shared Bot)

Use our hosted bot - no server required!

### Step 1: Register Your App

1. Open Telegram and message **[@CrionDevBot](https://t.me/CrionDevBot)**
2. Send `/start`
3. Click **"📝 Register App"**
4. Enter your **Phase App ID** (from Phase.dev dashboard)
5. Paste your **Phase Service Token** (auto-deleted for security)

### Step 2: Install the SDK

```bash
npm install @cryptoistaken/crion
```

### Step 3: Configure Your Project

```bash
# .env
PHASE_APP_ID=your-phase-app-id
```

### Step 4: Use in Your Code

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

// This sends an approval request to your Telegram
const phase = await createApprovedPhase('/chatbot');

// After you approve, secrets are fetched
const secrets = await phase.get();
console.log(secrets.API_KEY);
```

---

## Self-Hosting (Your Own Bot)

Host your own Crion bot for complete control and privacy.

### What You'll Need

1. **Your own Telegram Bot** (create via @BotFather)
2. **A server** (Railway, Render, VPS, etc.)
3. **Your Phase.dev credentials**

### Step 1: Create Your Telegram Bot

1. Open Telegram and message **[@BotFather](https://t.me/BotFather)**
2. Send `/newbot`
3. Follow the prompts to name your bot
4. **Save the Bot Token** (looks like `123456789:ABCdefGHI...`)

### Step 2: Get Your Telegram Chat ID

1. Message **[@userinfobot](https://t.me/userinfobot)** on Telegram
2. It replies with your Chat ID (a number like `123456789`)

### Step 3: Deploy the Bot

#### Option A: One-Click Railway Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/crion?referralCode=4n_jis&utm_medium=integration&utm_source=template&utm_campaign=generic)

Set these environment variables in Railway:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdef...  # Your bot token from Step 1
TELEGRAM_ADMIN_CHAT_ID=123456789         # Your chat ID from Step 2
PHASE_TOKEN=pss_service:v2:...           # Your Phase service token
```

**Optional (Recommended):** For persistent data across restarts, add a Volume:
1. Go to Settings → Volumes
2. Mount at `/data`
3. Add `DATA_DIR=/data` to environment variables

*Without a volume, approval history resets on container restart.*

#### Option B: Docker

```bash
docker run -d \
  -e TELEGRAM_BOT_TOKEN=your-bot-token \
  -e TELEGRAM_ADMIN_CHAT_ID=your-chat-id \
  -e PHASE_TOKEN=your-phase-token \
  -e DATA_DIR=/data \
  -v crion-data:/data \
  -p 3000:3000 \
  ghcr.io/cryptoistaken/crion
```

#### Option C: Manual (Bun)

```bash
git clone https://github.com/Cryptoistaken/Crion.git
cd Crion/bot
cp .env.example .env
# Edit .env with your tokens
bun install
bun start
```

### Step 4: Webhook Setup

**On Railway:** The webhook is **automatically configured** - no action needed! Railway provides `RAILWAY_PUBLIC_DOMAIN` which the bot uses to set up its own webhook.

**On other platforms:** Set the `BOT_URL` environment variable to your public URL, and the bot will auto-configure the webhook on startup.

**Manual setup (if needed):**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-bot-url.com/webhook"
```

### Step 5: Configure Your SDK

In your project's `.env`:

```bash
PHASE_APP_ID=your-phase-app-id
APPROVAL_API_URL=https://your-bot-url.com
```

### Step 6: Test It!

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

const phase = await createApprovedPhase('/test');
// You should receive an approval request in Telegram!
```

---

## Environment Variables Reference

### Bot Server

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Your bot token from @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | ✅ Yes | Your Telegram chat ID |
| `PHASE_TOKEN` | ✅ Yes | Your Phase service token |
| `BOT_URL` | No | Public URL for auto-webhook (auto-detected on Railway) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_DIR` | No | SQLite directory (default: ./data) |

### SDK (Your Project)

| Variable | Required | Description |
|----------|----------|-------------|
| `PHASE_APP_ID` | ✅ Yes | Your Phase App ID |
| `APPROVAL_API_URL` | No | Bot URL (default: https://crion.up.railway.app) |

---

## API Reference

### POST /request

Create an approval request.

```bash
curl -X POST https://your-bot.com/request \
  -H "Content-Type: application/json" \
  -d '{"appId": "your-app-id", "envName": "production"}'
```

**Response:**
```json
{ "requestId": "req_abc12345" }
```

### GET /status/:id

Check request status.

```bash
curl https://your-bot.com/status/req_abc12345
```

**Responses:**
```json
{ "status": "pending" }
{ "status": "approved", "phaseToken": "pss_service:v2:..." }
{ "status": "denied" }
```

### GET /health

Health check.

```bash
curl https://your-bot.com/health
# OK
```

---

## Project Structure

```
Crion/
├── bot/                    # Bot Server (Bun + Telegraf)
│   ├── index.js           # Single-file server & bot
│   ├── package.json
│   └── railway.json       # Railway config
│
├── sdk/                    # SDK (npm package)
│   ├── index.ts
│   └── package.json
│
└── example/                # Usage examples
```

---

## Security Notes

- 🔒 **Token Auto-Deletion**: Bot automatically deletes messages containing Phase tokens
- 👤 **Human-in-the-Loop**: Every secret access requires explicit Telegram approval
- 🚫 **No Secret Logging**: Phase tokens are stored but never logged

---

## License

MIT
