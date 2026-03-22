# Resend email setup

This project uses [Resend](https://resend.com) for transactional email (NextAuth magic links).

## Environment variables

```
SMTP_FROM=you@yourdomain.com
RESEND_API_KEY=your-resend-api-key
```

## Get an API key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain in Resend
3. Create an API key in the Resend dashboard
4. Add the key to your environment (e.g. `.env.local`)

## Domain verification

For production, the `from` address must use a domain verified in Resend. For local development you can use Resend’s test sender:

```
SMTP_FROM=onboarding@resend.dev
```

## Troubleshooting

1. Check server logs for error messages from Resend
2. Confirm the API key is valid and active
3. Ensure `SMTP_FROM` uses a verified domain (or the test domain above)
4. If you hit rate limits, reduce send frequency or upgrade the plan

Common errors:

- **Domain not verified** — Use `onboarding@resend.dev` or complete domain verification
- **Invalid API key** — Regenerate or copy the key from the Resend dashboard
- **Rate limit exceeded** — Space out sends or upgrade

See [Resend docs: Next.js](https://resend.com/docs/send-with-nextjs) for more detail.
