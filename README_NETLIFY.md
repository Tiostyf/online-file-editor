# Deploying the frontend to Netlify

This project uses a Node + Express backend and a Vite React frontend. Netlify can host the frontend (static site) and you can host the backend separately (Render, Heroku, etc.). This file shows how to connect Netlify to this GitHub repo for automatic deploys.

1. Connect your GitHub repository in Netlify
- In Netlify, click "New site from Git" → GitHub → choose `Tiostyf/online-file-editor` and branch `main`.

2. Build settings (Netlify UI)
- Build command:

```
npm --prefix frontend install && npm --prefix frontend run build
```

- Publish directory:

```
frontend/dist
```

3. Redirects / SPA fallback
- `netlify.toml` includes a redirect to serve `index.html` for all routes.

4. Backend API
- Netlify hosts only static sites. If you deploy the backend to Render (or another host), set the backend URL in your frontend code or use relative `/api` calls and configure CORS in the backend to accept the Netlify domain.

5. Environment variables
- For frontend only, you may not need env vars. The backend must host secrets (JWT_SECRET, MONGODB_URI) and be configured separately.

6. Quick verification
- After deploy, open the Netlify site URL and confirm the SPA loads and makes requests to the correct API host.

*** End of README_NETLIFY.md
