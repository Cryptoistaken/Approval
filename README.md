# Crion

Approvals for Phase.dev secrets via Telegram.

## 1. Deploy [Bot](https://railway.app/template/crion)

Required envs: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `PHASE_TOKEN`, `PHASE_APP_ID`.

## 2. Install

```bash
npm install @cryptoistaken/crion
```

## 3. Usage

```typescript
import { createApprovedPhase, getApprovedToken } from '@cryptoistaken/crion';

// Option A: Wrapper (Easy)
const phase = await createApprovedPhase('/script-name');
const secrets = await phase.get({ path: '/' });

// Option B: Manual (Advanced)
const { token, appId } = await getApprovedToken('/script-name');
```

## Config

```bash
APPROVAL_API_URL=https://your-app.railway.app
PHASE_ENV_NAME=production
PHASE_APP_ID=your-app-id
```
