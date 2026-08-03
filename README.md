# Ahoy v2 — Phase 1

Static frontend connected to Supabase.

## Included

- Email/password login
- Account creation
- Persistent browser session
- Profile loading
- Profile editing
- Founder/admin badge display
- Avatar upload to the `avatars` bucket
- Logout

## Deploy to Cloudflare Pages

1. Create a GitHub repository named `ahoy-app-v2`.
2. Upload this project to the repository.
3. In Cloudflare Pages, import the repository.
4. Build command: leave blank or use `exit 0`.
5. Output directory: `/`.
6. Add `ahoy.gadgetrumclub.com` as the custom domain.

## Security

This project includes only the Supabase publishable key. Never add a secret or service-role key to browser code.
