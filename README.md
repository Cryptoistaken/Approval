# Crion Implementation Standard

**Context**: Use this SDK to secure scripts with human-in-the-loop Telegram approval.

## 1. Installation

```bash
npm install @cryptoistaken/crion
```

## 2. Integration Code

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
