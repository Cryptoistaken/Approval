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

## Quick Start (Shared Bot)

The easiest way to use Crion is with our hosted bot.

### 1. Register Your App

1. Open Telegram and message **[@CrionDevBot](https://t.me/CrionDevBot)**
2. Send `/start`
3. Click **"📝 Register App"**
4. Enter your **Phase App ID** (from Phase.dev dashboard)
5. Paste your **Phase Service Token** (will be auto-deleted for security)

### 2. Install the SDK

```bash
npm install @cryptoistaken/crion
```

### 3. Configure Environment

```bash
# .env
PHASE_APP_ID=your-phase-app-id
```

### 4. Use in Your Code

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

// This will send an approval request to your Telegram
const phase = await createApprovedPhase('/chatbot');

// After you approve, secrets are fetched
const secrets = await phase.get();
console.log(secrets.API_KEY);
```

---

## Self-Hosting

For complete control and privacy, you can host your own Crion bot.

### Deployment Options

Crion bot supports two hosting modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Simple Mode** | Single user, all requests go to you | Personal projects |
| **Multi-Tenant Mode** | Multiple users register their own apps | Running as a service |

---

## Simple Mode (Self-Hosted)

Best for personal use or small teams.

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Cryptoistaken/Crion)

### Manual Setup

#### 1. Create a Telegram Bot

1. Open Telegram and message **[@BotFather](https://t.me/BotFather)**
2. Send `/newbot` and follow the prompts
3. Save your **Bot Token**

#### 2. Get Your Chat ID

1. Message **[@userinfobot](https://t.me/userinfobot)** on Telegram
2. It will reply with your Chat ID (a number like `123456789`)

#### 3. Deploy to Railway

1. Fork this repository
2. Connect to [Railway](https://railway.app)
3. Set environment variables:

```bash
TELEGRAM_BOT_TOKEN=8568632322:AAHy...    # From BotFather
TELEGRAM_ADMIN_CHAT_ID=123456789          # Your Chat ID
PHASE_TOKEN=pss_service:v2:...            # Your Phase service token
```

4. **Add a Volume** (for persistent database):
   - Go to Settings → Volumes
   - Add a volume mounted at `/data`
   - Set `DATA_DIR=/data` in environment variables

5. **Set up Webhook** (after deployment):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.railway.app/webhook"
```

#### 4. Configure Your SDK

```bash
# .env in your project
PHASE_APP_ID=your-phase-app-id
APPROVAL_API_URL=https://your-app.railway.app
```

### Local Development

```bash
cd bot
cp .env.example .env
# Edit .env with your tokens

bun install
bun dev
```

---

## Multi-Tenant Mode (Running as a Service)

Run Crion as a shared service for multiple users.

### Configuration

**Do NOT set** `TELEGRAM_ADMIN_CHAT_ID` - this enables multi-tenant mode.

```bash
TELEGRAM_BOT_TOKEN=8568632322:AAHy...    # From BotFather
# No TELEGRAM_ADMIN_CHAT_ID = Multi-tenant mode
# No PHASE_TOKEN = Users provide their own
DATA_DIR=/data                            # Persistent storage
```

### How It Works

1. Users message your bot and click "Register App"
2. They provide their Phase App ID and Service Token
3. Their credentials are stored in your database
4. Each user's approval requests go to their own Telegram chat
5. On approval, their own Phase token is used

### Database Persistence

**Important:** You MUST set up persistent storage for the SQLite database.

**Railway:**
1. Go to Settings → Volumes
2. Mount a volume at `/data`
3. Set `DATA_DIR=/data`

**Docker:**
```bash
docker run -v crion-data:/data -e DATA_DIR=/data crion
```

---

## API Reference

### POST /request

Create an approval request.

```bash
curl -X POST https://crion.up.railway.app/request \
  -H "Content-Type: application/json" \
  -d '{"appId": "your-app-id", "envName": "production", "path": "/api"}'
```

**Request Body:**
```json
{
  "appId": "your-phase-app-id",
  "envName": "production",
  "path": "/optional/path/filter"
}
```

**Response:**
```json
{
  "requestId": "req_abc12345"
}
```

### GET /status/:id

Check request status.

```bash
curl https://crion.up.railway.app/status/req_abc12345
```

**Pending Response:**
```json
{
  "status": "pending"
}
```

**Approved Response:**
```json
{
  "status": "approved",
  "phaseToken": "pss_service:v2:..."
}
```

**Denied Response:**
```json
{
  "status": "denied"
}
```

### GET /health

Health check endpoint.

```bash
curl https://crion.up.railway.app/health
# OK
```

### POST /webhook

Telegram webhook endpoint (set this as your bot's webhook URL).

---

## Environment Variables

| Variable | Required | Mode | Description |
|----------|----------|------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Both | Telegram bot token from @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Simple only | Simple | Your Telegram chat ID |
| `PHASE_TOKEN` | Simple only | Simple | Your Phase service token |
| `PORT` | ❌ | Both | Server port (default: 3000) |
| `DATA_DIR` | ❌ | Both | SQLite data directory (default: ./data) |

---

## SDK Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PHASE_APP_ID` | ✅ | Your Phase App ID |
| `APPROVAL_API_URL` | ❌ | Bot URL (default: https://crion.up.railway.app) |

---

## Project Structure

```
.
├── bot/                    # Crion Bot (Bun + Telegraf)
│   ├── index.js           # HTTP server & entry point
│   ├── src/
│   │   ├── bot.js         # Telegram bot handlers
│   │   └── db.js          # SQLite database
│   ├── package.json
│   └── railway.json       # Railway deployment config
│
├── sdk/                    # Crion SDK (TypeScript)
│   ├── index.ts           # SDK entry point
│   └── package.json
│
└── example/                # Example usage
    └── index.ts
```

---

## Security

- **Token Auto-Deletion:** When registering, the bot automatically deletes messages containing your Phase token
- **Human-in-the-Loop:** Every secret access requires explicit Telegram approval
- **Isolated Storage:** In multi-tenant mode, each user's credentials are isolated
- **No Logging of Secrets:** Phase tokens are stored but never logged

---

## License

MIT
