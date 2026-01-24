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

**Usage**

> [!IMPORTANT]
> **Always use a specific path** (e.g., `/my-script`, `/payments`).
> Do NOT use the root path `/` unless you intend to fetch *all* secrets in the environment.

```typescript
import { getSecret } from '@cryptoistaken/crion';

const path = '/my-script-secrets'; 
const secrets = await getSecret(path);

console.log("Ready!", secrets.API_KEY);
```
