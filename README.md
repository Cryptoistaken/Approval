# Crion Implementation Standard

**Context**: Use this SDK to secure scripts with human-in-the-loop Telegram approval.

## 1. Installation

```bash
npm install @cryptoistaken/crion
```

## 2. Environment Configuration

Add these to the project's `.env` file (Bot is pre-deployed):

```ini
# Bot Connection
APPROVAL_API_URL=https://crion.up.railway.app

# Phase Configuration
PHASE_ENV_NAME=production
PHASE_APP_ID=... # Required: Get from Phase Console
```

## 3. Integration Code

**Standard Pattern (Use Default)**
Wrap the Phase fetching logic with `createApprovedPhase`.

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    // 1. Initialize & Request Approval
    // Argument: Unique identifier for this script/task
    const phase = await createApprovedPhase('/script-name');

    // 2. Fetch Secrets
    // The wrapper automatically handles the App ID
    const secrets = await phase.get({ path: '/' });

    // 3. Application Logic
    console.log("Starting secure task with:", secrets.API_KEY);
}
```

**Manual Pattern (Advanced)**
Use `getApprovedToken` if you simply need the raw token/appId.

```typescript
import { getApprovedToken } from '@cryptoistaken/crion';

const { token, appId } = await getApprovedToken('/script-name');
```
