# Coolify Deployment Guide for UKFont

## Step 1 — Push to GitHub

Make sure these 3 files are in the ROOT of your repo:
- `Dockerfile`
- `.dockerignore`  
- `.gitignore`

```
ukfont-claude/
├── Dockerfile          ← ADD THIS
├── .dockerignore       ← ADD THIS
├── .gitignore          ← ADD THIS
├── client/
├── server/
├── shared/
├── script/
├── package.json
└── ...
```

## Step 2 — Fix the Coolify GitHub App redirect

The redirect failure ("This site can't be reached") happens because Coolify's
callback URL doesn't match. Fix it:

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps**
2. Find the app created by Coolify (named something like "Coolify-xxxxx")
3. Click **Edit**
4. Under **Callback URL** — make sure it points to your Coolify server:
   ```
   https://YOUR-COOLIFY-DOMAIN/api/v1/security/git/github/callback
   ```
   (Replace YOUR-COOLIFY-DOMAIN with your actual Coolify server address)
5. Save

OR — skip GitHub App entirely and use a **Deploy Key** instead:
- In Coolify: New Resource → Private Repository (with Deploy Key)
- Coolify gives you an SSH public key → add it to GitHub repo Settings → Deploy Keys

## Step 3 — Create app in Coolify

1. New Project → New Resource → **Public Repository** (if repo is public)
   OR Private Repository → Deploy Key method
2. Paste your GitHub repo URL
3. Set **Build Pack** to: `Dockerfile`
4. Coolify will auto-detect the Dockerfile

## Step 4 — Set Environment Variables in Coolify

In your app's Environment Variables section, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-plain-scene-ai80zzh2-pooler...` (your full Neon URL) |
| `ADMIN_API_KEY` | `v47xQh+OCBE6Rh/3MOg3xCIRK+hPSNmVUPfay2kr/5U=` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `ANTHROPIC_API_KEY` | your key (for Font From Image feature) |

**Never put these in the repo** — always set them in Coolify's UI.

## Step 5 — Deploy

Click Deploy. Coolify will:
1. Pull your repo
2. Run `docker build` using your Dockerfile
3. Start the container on port 5000
4. Assign it a domain

## Troubleshooting

**Build fails on `npm run build`** — check Coolify build logs for TypeScript errors

**App starts but shows DB error** — verify DATABASE_URL is set correctly in env vars

**Port issue** — Coolify proxies automatically, but make sure PORT=5000 matches EXPOSE in Dockerfile
