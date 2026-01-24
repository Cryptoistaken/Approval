# Deploy and Host Crion on Railway

Crion is a secure, human-in-the-loop approval system for Phase.dev secrets. It pauses your scripts and sends a Telegram notification, waiting for you to click "Approve" before releasing sensitive credentials to your code.

## About Hosting Crion

Crion consists of a lightweight Bun-powered HTTP server that bridges your application scripts with Telegram. When deployed on Railway, the bot runs 24/7, receiving approval requests from your SDK-integrated scripts and forwarding them to your Telegram chat. You approve or deny with a single tap, and the bot releases (or withholds) your Phase.dev service token. Railway's persistent volumes ensure your SQLite database of approval requests survives restarts.

## Common Use Cases

- **CI/CD Pipelines**: Require human approval before deploying to production or accessing production secrets.
- **AI Agents**: Gate sensitive API keys so autonomous scripts can't access them without your explicit consent.
- **Shared Development**: Let team members request access to secrets they need, with you as the gatekeeper.

## Dependencies for Crion Hosting

- **Bun Runtime**: Used as the JavaScript runtime for the bot server.
- **Telegraf**: Telegram Bot framework for handling messages and callbacks.

### Deployment Dependencies

- [Phase.dev](https://phase.dev) - Secrets management platform (you'll need a Phase Service Token)
- [Telegram Bot](https://t.me/BotFather) - Create a bot via @BotFather to get your `TELEGRAM_BOT_TOKEN`
- [Get Chat ID](https://t.me/userinfobot) - Use @userinfobot to find your `TELEGRAM_ADMIN_CHAT_ID`

### Implementation Details

**Environment Variables:**
```bash
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_ADMIN_CHAT_ID=your-telegram-chat-id
PHASE_TOKEN=pss_service:v2:your-phase-token
```

**Persistence:**
Add a Railway Volume mounted to `/app/bot/data` to persist the SQLite database.

## Why Deploy Crion on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Crion on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
