# ANP Recruitment

Arabic application form and protected administration panel for the ANP recruitment workflow.

## Netlify frontend

The root-level netlify.toml builds the frontend with:
- Build command: pnpm --filter @workspace/anp-recruitment run build
- Publish directory: artifacts/anp-recruitment/dist/public
- Build variables: BASE_PATH=/ and PORT=25723

Set VITE_CLERK_PUBLISHABLE_KEY and VITE_CLERK_PROXY_URL in Netlify's site environment before building. Never place secret keys in this repository.

## Backend required

The frontend calls the Express API under /api. Netlify hosting alone does not deploy the API, PostgreSQL database, or Clerk backend. Deploy those separately, then configure a Netlify /api proxy to the real backend URL before accepting applications or using admin review. Backend environment variables include DATABASE_URL, CLERK_PUBLISHABLE_KEY, and CLERK_SECRET_KEY; keep them in the backend host's secret store.
