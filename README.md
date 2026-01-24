# crion

A secure, human-in-the-loop approval system for Phase.dev secrets. Pauses your script until you click "Approve" in Telegram.

## Quick Start

### 1. Install

```bash
bun add crion
```

### 2. Set Environment Variables

```bash
export PHASE_APP_ID="your-phase-app-id"
export PHASE_ENV_NAME="Production"
export APPROVAL_API_URL="https://your-bot.railway.app"
```

### 3. Usage

```typescript
import { createApprovedPhase } from 'crion';

const phase = await createApprovedPhase('/chatbot');

const secrets = await phase.get();

console.log(secrets);
```

## Hosting the Bot (Required)

For security, you must host your own Approval Bot.

**Environment Variables Required:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `PHASE_TOKEN`

**Persistence**: The bot uses SQLite. Add a Volume and mount it to `/app/bot/data`.

---

<details>
<summary>Manual Usage</summary>

```typescript
import { getApprovedToken } from 'crion';
import Phase from '@phase.dev/phase-node';

const token = await getApprovedToken('/database');
const phase = new Phase(token);
const secrets = await phase.get({
    appId: process.env.PHASE_APP_ID,
    envName: process.env.PHASE_ENV_NAME,
    path: '/database'
});
```
</details>

## License
MIT
