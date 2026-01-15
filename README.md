# @cryptoistaken/approval

A secure, human-in-the-loop approval system for accessing Phase.dev secrets. Pauses your script until you click "Approve" in Telegram.

## Quick Start

### 1. Install

```bash
bun add @cryptoistaken/approval
```

### 2. Usage

Copy-paste this into your script. It handles everything: approval, auth, and fetching.

```typescript
import { createApprovedPhase } from '@cryptoistaken/approval';

// 1. Request Approval & Init
// Execution PAUSES here until Admin approves via Telegram
const phase = await createApprovedPhase('production-db-access', {
    // Approval Context
    requester: 'migration-script',
    environment: 'Production',
    
    // Phase Defaults (Optional) - Applied to all requests
    appId: 'YOUR_PHASE_APP_ID',
    envName: 'Production',
    path: '/' 
});

// 2. Fetch Secrets
// Automatically uses the authenticated token and defaults above
const secrets = await phase.get();

console.log('Access granted!', secrets);
```

## Configuration (Optional)

If you host your own bot, set the URL:

```bash
export APPROVAL_API_URL="https://your-bot.railway.app"
```

---

<details>
<summary>Manual Usage (Advanced)</summary>

```typescript
import { getApprovedToken } from '@cryptoistaken/approval';
import Phase from '@phase.dev/phase-node';

const token = await getApprovedToken('my-resource');
const phase = new Phase(token);
const secrets = await phase.get({ ... });
```
</details>

## License
MIT
