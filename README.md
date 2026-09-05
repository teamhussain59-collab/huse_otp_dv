# LEGAND HUSE OTP Console — Cloudflare Workers Ready

This project is prepared for Cloudflare Workers with Static Assets. It does not need PHP or Railway.

## Easiest deployment (recommended)
1. Put this folder in a GitHub repository.
2. Cloudflare Dashboard → Workers & Pages → Create application → Import an existing Git repository.
3. Select this repository and deploy.
4. In Worker → Settings → Variables and Secrets, add a **Secret** named `API_TOKEN` containing your upstream API token.
5. `APPROVED_AGENT_EMAIL` is already set to `husedev786@gmail.com`.
6. Cloudflare gives you a `workers.dev` URL.

## Important
- Do NOT put the real API token in GitHub, `worker.js`, or `wrangler.jsonc`.
- Cloudflare Pages drag-and-drop is for static assets; this project has server-side Worker logic, so deploy it as a Worker/Workers project.
- You can edit `public/index.html` for UI changes and `src/worker.js` for server/API proxy changes.
