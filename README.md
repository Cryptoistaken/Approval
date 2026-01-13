# @cryptoistaken/approval

A simple, secure way to request manual approval before your scripts access sensitive secrets.

## Install

```bash
bun add @cryptoistaken/approval
# or
npm install @cryptoistaken/approval
```

## Usage

Instead of accessing secrets directly, wrap your secret retrieval with `getApprovedToken()`.

```typescript
import { getApprovedToken } from '@cryptoistaken/approval';
import Phase from '@phase.dev/phase-node';

// 1. Request approval (triggers Telegram notification)
// This will pause execution until you click "Approve"
const token = await getApprovedToken('production-secrets', {
  requester: 'my-script',
  environment: 'Production'
});

// 2. Use the approved token to fetch secrets
const phase = new Phase(token);
const secrets = await phase.get({
  appId: 'your-app-id',
  envName: 'Production',
  path: '/backend' // Optional: Fetch secrets from a specific path
});

console.log('Access granted! Secrets loaded.');
```

## Configuration

The SDK defaults to the public approval bot (`https://approval.up.railway.app`). You can override this if you're hosting your own bot.

Set the environment variable:

```bash
APPROVAL_API_URL=https://your-bot.railway.app
```

Or pass it in the options:

```typescript
await getApprovedToken('production-secrets', {
  apiUrl: 'https://your-bot.railway.app',
  timeout: 60000, // 1 minute timeout
  environment: 'Staging',
  requester: 'deploy-job'
});
```

## License

MIT
