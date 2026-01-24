# Crion Implementation Standard

**Context**: Use this SDK to secure scripts with human-in-the-loop Telegram approval.

## 1. Installation

```bash
npm install @cryptoistaken/crion
```

## 2. Environment Configuration

Add this to the project's `.env` file:

```ini
# Phase App ID (Required)
PHASE_APP_ID=... # App ID from Phase Console
```

*Note: `APPROVAL_API_URL` and `PHASE_ENV_NAME` default to the main production instance if omitted.*

## 3. Integration Code

**Standard Pattern**

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    // 1. Initialize & Request Approval
    const phase = await createApprovedPhase('/my-path');

    // 2. Fetch Secrets
    const secrets = await phase.get({ path: '/' });

    // 3. Application Logic
    console.log("Ready:", secrets.API_KEY);
}
```
