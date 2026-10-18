# Shakil Dev Pro — Portfolio v2

A responsive neon-dark portfolio connected to Supabase.

## Already configured
- Supabase project: `shakil-dev-pro-v2`
- URL: `https://xqdzavnoyfuglquhjuqg.supabase.co`
- Initial database schema and starter projects have been applied.
- `config.js` contains the public Supabase URL and publishable key. Never add a service-role/secret key to frontend code.

## Features
- Email/password signup and login
- Password reset email
- Google and GitHub OAuth buttons (provider credentials still need to be added in Supabase)
- Live projects from PostgreSQL
- Contact form writes to the database
- Visitor counter
- Admin dashboard for projects and contact inbox
- Responsive mobile layout

## Run locally
```bash
npm install
npm run dev
```

## Enable Google/GitHub OAuth
In Supabase Dashboard → Authentication → Sign In / Providers:
1. Create an OAuth application in Google Cloud Console and/or GitHub Developer Settings.
2. Add the callback URL shown by Supabase to the provider's allowed callback URLs.
3. Paste the provider Client ID and Client Secret into the Supabase provider settings and enable the provider.
4. Once deployed, add the final website URL to Supabase Auth → URL Configuration (Site URL and Redirect URLs).

The buttons will not work until provider credentials are configured. Do not share secrets in a public chat.

## Set your account as admin
For security, public signup cannot grant admin access. After creating your own account and confirming its email, use the Supabase Dashboard's SQL Editor to run this statement, replacing the email with your exact account email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'YOUR_ACCOUNT_EMAIL';
```

Then sign out and sign in again so the refreshed session contains the admin role. Do not give admin to accounts you do not control.

## Deploy to Vercel
Import this project/repository into Vercel and deploy as a Vite app. Vercel normally detects Vite automatically. If asked, use `npm run build` as the build command and `dist` as the output directory. After deployment, configure the final domain in Supabase Auth URL Configuration.

## Notes
- The public visit table stores only visit timestamps, not IP addresses or identifying visitor data.
- Visitor count can be inflated by automated traffic; it is a lightweight counter, not analytics-grade tracking.
