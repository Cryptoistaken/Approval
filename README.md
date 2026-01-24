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
```

### 3. Usage

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

const phase = await createApprovedPhase('/chatbot');
const secrets = await phase.get();
```

---

## Self-Hosting (Simple Mode)

For complete control, host your own bot with just 3 env vars.

### 1. Deploy the Bot

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Cryptoistaken/Crion)

### 2. Environment Variables

```bash
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_ADMIN_CHAT_ID=your-telegram-chat-id
PHASE_TOKEN=pss_service:v2:your-phase-token
```

### 3. Point SDK to Your Bot

```bash
PHASE_APP_ID=your-app-id
APPROVAL_API_URL=https://your-bot.railway.app
```

---

## Modes

| Mode | When | Registration |
|------|------|--------------|
| **Simple** | `TELEGRAM_ADMIN_CHAT_ID` is set | Not needed |
| **Registration** | `TELEGRAM_ADMIN_CHAT_ID` not set | Via Telegram wizard |

## License
MIT
