# ANP Recruitment

Arabic application form and protected administration panel for the ANP recruitment workflow.

This repository is being initialized for Netlify deployment. The repository is currently empty, so this first commit only establishes the default branch.

Frontend build settings:
- Build command: pnpm --filter @workspace/anp-recruitment run build
- Publish directory: artifacts/anp-recruitment/dist/public
- Build variables: BASE_PATH=/ and PORT=25723

The frontend calls the Express API under /api. Netlify hosting alone does not deploy the API, PostgreSQL database, or Clerk backend. Those services must be deployed and the /api proxy configured before application submission and admin review will work. Do not commit environment secrets.
