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

## 3. Examples

**Database Connection**

```typescript
import { getSecret } from '@cryptoistaken/crion';

const secrets = await getSecret('/database-prod');
const dbUrl = `postgres://${secrets.USER}:${secrets.PASS}@${secrets.HOST}:5432/db`;

await connect(dbUrl);
```

**Payment Processing**

```typescript
import { getSecret } from '@cryptoistaken/crion';

const secrets = await getSecret('/stripe-keys');
const stripe = new Stripe(secrets.SK_LIVE);

await stripe.charges.create({ amount: 2000, currency: 'usd' });
```
