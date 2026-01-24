# Crion

Human-in-the-loop approval for [Phase.dev](https://phase.dev) secrets via Telegram.

## Quick Start

### 1. Deploy Bot

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app/template/crion)

**Environment Variables:**

| Variable | Description |
|----------|-------------|
| TELEGRAM_BOT_TOKEN | From @BotFather |
| TELEGRAM_ADMIN_CHAT_ID | From @userinfobot |
| PHASE_TOKEN | Your Phase service token |
| PHASE_APP_ID | Your Phase App ID |

### 2. Install

```bash
npm install @cryptoistaken/crion
```

### 3. Usage

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    // Requests approval and returns Phase client
    const phase = await createApprovedPhase('/numbers');

    const secrets = await phase.get({ path: '/numbers' });
    console.log(secrets.NUMBER);
}
```

## API

### createApprovedPhase

```typescript
const phase = await createApprovedPhase('/my-script', {
    envName: 'production',
    timeout: 300000 
});

// Use phase.get() normally
const secrets = await phase.get({ path: '/' });
```

### getApprovedToken

```typescript
const { token, appId } = await getApprovedToken('/my-script');
```

## Configuration

```bash
APPROVAL_API_URL=https://your-bot.railway.app
PHASE_ENV_NAME=production
PHASE_APP_ID=your-app-id
```

## License

MIT
