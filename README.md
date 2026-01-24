# crion

A secure, human-in-the-loop approval system for Phase.dev secrets.

## How It Works

```
Your Script --> Crion SDK --> Approval Bot --> Telegram --> You Approve --> Phase Token --> Secrets
```

## Quick Start (Easiest)

Use our hosted bot `@CrionDevBot` on Telegram.

### 1. Register with the Bot

In Telegram, DM **@CrionDevBot** and click **Start**.

1.  Click **[Register App]**.
2.  Send your **Phase App ID**.
3.  Send your **Phase Service Token**.
    *   *The bot will auto-delete your token message for security.*

### 2. Configure Your Project

In your `.env`:
```bash
PHASE_APP_ID=your-phase-app-id
# Optional: Defaults to https://crion-bot-production.up.railway.app
# APPROVAL_API_URL=https://your-self-hosted-bot.com
```

### 3. Usage

```typescript
import { createApprovedPhase } from 'crion';

const phase = await createApprovedPhase('/chatbot');
const secrets = await phase.get();
```

---

## For Bot Operators (Self-Hosting)

If you prefer to host your own bot for complete control.

### 1. Deploy the Bot

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Cryptoistaken/Crion)

### 2. Environment Variables

```bash
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
```

*Note: `TELEGRAM_ADMIN_CHAT_ID` and `PHASE_TOKEN` are NO LONGER required in env vars. You must register via Telegram command.*

### 3. Usage

Register yourself with your own bot by sending `/start` and following the prompts.

## SDK Usage Flows

**Flow 1: Environment Variables (Recommended)**
```bash
PHASE_APP_ID=your-app-id
```
```typescript
const phase = await createApprovedPhase('/chatbot');
```

**Flow 2: Per-Script Override**
```typescript
const phase = await createApprovedPhase('/chatbot', {
    appId: 'my-other-app'
});
```

## License
MIT
