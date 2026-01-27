# Security Model

Crion implements multiple layers of security to protect your Phase.dev secrets.

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Brute-force attacks | Rate limiting (10 req/min per IP) |
| Replay attacks | One-time tokens (marked "consumed" after use) |
| Stale requests | 5-minute expiration |
| Request tampering | Cryptographically random UUIDs |
| IP spoofing | X-Forwarded-For validation |

## Request Flow

```
1. SDK sends approval request → Bot
2. Bot sends Telegram notification → Admin
3. Admin approves/denies → Bot
4. SDK polls for approval status
5. On approval: Bot returns Phase token (one-time)
6. SDK fetches secrets from Phase.dev
```

## Rate Limiting

- **Default**: 10 requests per minute per IP
- **Configurable** via `RATE_LIMIT` and `RATE_WINDOW` env vars
- Returns HTTP 429 when exceeded

## Token Handling

| Stage | Security |
|-------|----------|
| Request creation | Crypto-random UUID (`req_xxxx`) |
| Storage | SQLite database (server-side only) |
| Transmission | HTTPS only |
| Consumption | Marked "consumed" immediately after first access |

## Best Practices

1. **Always use specific paths** - Never use `/` in production
2. **Set short timeouts** - Default 5 minutes is recommended
3. **Monitor approvals** - Review Telegram logs regularly
4. **Use dedicated bot** - Self-host for sensitive applications
5. **Restrict chat access** - Only trusted admins in approval chat

## Self-Hosting Security

When self-hosting, ensure:

- [ ] HTTPS enabled (Railway provides this automatically)
- [ ] Strong Phase token with minimal permissions
- [ ] Private Telegram group for approvals
- [ ] Regular log auditing
