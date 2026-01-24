# Crion

Human-in-the-loop approval for [Phase.dev](https://phase.dev) secrets via Telegram.

```
Your Script -> Crion -> Telegram -> You Approve -> Secrets
```

## Quick Start

### 1. Deploy Bot to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app/template/crion)

**Required Environment Variables:**

| Variable | Description |
|----------|-------------|
| TELEGRAM_BOT_TOKEN | From @BotFather |
| TELEGRAM_ADMIN_CHAT_ID | From @userinfobot |
| PHASE_TOKEN | Your Phase service token |
| PHASE_APP_ID | Your Phase App ID |

### 2. Install SDK

```bash
npm install @cryptoistaken/crion
```

### 3. Usage

#### Calculation Script Example

```typescript
import { createApprovedPhase } from '@cryptoistaken/crion';

async function main() {
    const phase = await createApprovedPhase('/numbers', {
        envName: 'production'
    });

    const secrets = await phase.get({ path: '/numbers' });

    const number = parseInt(secrets.NUMBER, 10);
    console.log(`Square: ${number * number}`);
}
```

## How It Works

1. Your script calls createApprovedPhase
2. Bot sends you a Telegram notification
3. You tap Approve
4. SDK gets your Phase token and fetches secrets
5. Your script continues with the secrets

## SDK Configuration

You can configure the SDK using environment variables:

```bash
APPROVAL_API_URL=https://your-bot.railway.app
PHASE_ENV_NAME=production
```

## API

### createApprovedPhase(path, options?)

Returns a wrapper object that automatically injects the App ID into Phase requests.

```typescript
const phase = await createApprovedPhase('/chatbot', {
    timeout: 300000,
    envName: 'production',
    apiUrl: 'https://your-bot.railway.app'
});

const secrets = await phase.get({ path: '/' });
```

### getApprovedToken(path, options?)

Returns the raw token and app ID if you need manual control.

```typescript
const { token, appId } = await getApprovedToken('/script');
```

## Security

- One-time token
- 5-minute request expiry
- Full UUID request IDs
- Human approval required

## License

MIT
