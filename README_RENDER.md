# Deploying to Render

This repository is prepared to deploy a single web service on Render: the Express backend will serve the built React frontend from `frontend/dist` in production.

Steps to deploy

1. In Render, create a new Web Service and connect your GitHub repo `Tiostyf/online-file-editor` (branch `main`).

2. Build Command (Render):

```
npm --prefix frontend install && npm --prefix frontend run build
```

This installs the frontend devDependencies (Vite) and runs the build.

3. Start Command (Render):

```
npm start
```

This runs the backend (`backend/server.js`) in production mode. The root `start` script expects the frontend build to already exist.

Environment variables to set (in Render web UI, mark secrets):
- `MONGODB_URI` (optional) — MongoDB Atlas connection string
- `JWT_SECRET` (required for auth features) — strong secret
- `LOG_LEVEL` (optional)

Notes
- The server will look for the built frontend in multiple common locations. If Render build runs successfully, the server should log:

```
📄 Serving frontend from: /path/to/frontend/dist
```

- If you see `No frontend build found`, confirm the build step succeeded in Build Logs.

- Do NOT commit real secrets to the repo. Use the Render dashboard to set secrets.

Troubleshooting
- If the Build step fails, paste the Build log here and I will help fix it.
- If the Service starts but shows `Cannot GET /`, paste the Service logs (first 80 lines) and I will analyze them.

*** End of README_RENDER.md
