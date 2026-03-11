# SANATE.STORE — Project Context

## Architecture
- **Frontend**: React SPA hosted on Hostinger shared hosting (sanate.store)
- **Backend IA**: https://products-web-j7ji.onrender.com
- **Bot WhatsApp**: https://sanate-baileys.onrender.com (separate repo: sanate333/sanate-baileys)
- **Automation**: oasiss.app.n8n.cloud
- **WhatsApp Proxy**: /public_html/whatsapp-proxy.php (on Hostinger, excluded from deploys)

## Deploy
- Automatic deploy via GitHub Actions → FTP to Hostinger (port 21)
- Workflow: `.github/workflows/deploy-hostinger.yml`
- Uses `SamKirkland/FTP-Deploy-Action@v4.3.5`
- Required GitHub secrets: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`
- Build: `CI=false npm run build` → uploads `./build/` to `/public_html/`
- Excludes: `whatsapp-proxy.php`, `.git*`, `node_modules`
- SSH does NOT work on Hostinger shared — always use FTP port 21

## Key Module: ImagenesIA
- File: `src/Pages/ImagenesIA/ImagenesIA.jsx`
- Generates AI product images using Pollinations Flux API
- NEVER use `&enhance=true` — causes 503 errors
- Uses `new Image()` for loading (NOT fetch) — Pollinations doesn't support CORS properly
- 90s timeout for Flux, fallback to `model=turbo` at 512x512
- 6 brand palettes: Hero, Oferta, Beneficios, Antes/Despues, Testimonio, Logistica
- Pollinations models: `flux` (production, 30-90s), `turbo` (fallback, 10-20s), `flux-schnell` (preview, 15-30s)

## Commands
- `npm start` — Start backend server (server/index.mjs)
- `npm run build` — Build React app + post-build processing
- `npm run ia:smoke-test` — Run IA smoke tests (requires OPENAI_MOCK=1)

## Important Conventions
- Backend API base: `https://products-web-j7ji.onrender.com/api`
- Domain config: `src/config/domains.js` (defaults to sanate.store)
- Firebase project: notificaciones-f1eb9
