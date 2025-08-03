# Migrating from Postmark to Resend

This project has been updated to use Resend for email delivery instead of Postmark. Follow these steps to complete the migration:

## 1. Update your environment variables

Replace the following Postmark environment variables:

```
SMTP_FROM=khanhnguyen@hachium.com
POSTMARK_API_TOKEN=6d1a0cac-ccae-4aa0-a23a-04b9cd6bcc53
POSTMARK_SIGN_IN_TEMPLATE=38336674
POSTMARK_ACTIVATION_TEMPLATE=38336674
```

With this single Resend environment variable:

```
SMTP_FROM=khanhnguyen@hachium.com
RESEND_API_KEY=your-resend-api-key
```

## 2. Get a Resend API key

1. Sign up for a Resend account at [resend.com](https://resend.com)
2. Verify your domain in Resend
3. Create an API key in the Resend dashboard
4. Add the API key to your environment variables

## 3. Domain verification requirements

For production use, Resend requires that you verify your domain. This means:

1. The `from` email address must use a domain that you've verified in Resend
2. During development, you can use Resend's test domain: `onboarding@resend.dev`

If you're getting authentication errors, try changing your `SMTP_FROM` to use Resend's test domain temporarily:

```
SMTP_FROM=onboarding@resend.dev
```

## 4. Troubleshooting

If you encounter errors during email sending:

1. Check the server logs for detailed error messages
2. Verify your API key is correct and active
3. Ensure your `from` email uses a verified domain
4. Make sure your Resend account is in good standing

Common errors:

- "Domain not verified" - Use `onboarding@resend.dev` or verify your domain
- "Invalid API key" - Check your API key in the Resend dashboard
- "Rate limit exceeded" - Reduce sending frequency or upgrade your plan

## Benefits of using Resend

- Modern API designed for developers
- React-based email templates
- Better deliverability
- Simplified setup (no need for template IDs)
- Improved analytics and tracking

For more information, see the [Resend documentation](https://resend.com/docs/send-with-nextjs).
