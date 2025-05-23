# Free Deployment Options for Planning Poker

## 🆓 100% Free Hosting Services

### Option 1: Render.com (Recommended)
**Backend + Frontend - Completely Free**

#### Deploy Backend:
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo: `trmquang93/planning-poker`
5. Configure:
   - **Name**: `planning-poker-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Select **Free**

6. Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   ```

7. Click "Create Web Service"

#### Deploy Frontend:
1. In Render dashboard, click "New +" → "Static Site"
2. Connect same GitHub repo
3. Configure:
   - **Name**: `planning-poker-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Select **Free**

4. Environment Variables:
   ```
   VITE_BACKEND_URL=https://planning-poker-backend.onrender.com
   ```

**✅ Benefits**: Real domain, HTTPS, no time limits, WebSocket support

---

### Option 2: Netlify (Frontend) + Render (Backend)
**Frontend on Netlify, Backend on Render**

#### Deploy Backend to Render:
Follow Render backend steps above.

#### Deploy Frontend to Netlify:
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Choose GitHub → Select `trmquang93/planning-poker`
5. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm ci && npm run build`
   - **Publish directory**: `frontend/dist`

6. Environment Variables:
   ```
   VITE_BACKEND_URL=https://planning-poker-backend.onrender.com
   ```

**✅ Benefits**: Lightning fast CDN, excellent for React apps

---

### Option 3: Firebase Hosting + Google Cloud Run
**Google's Free Tier**

#### Prerequisites:
```bash
npm install -g firebase-tools
```

#### Deploy:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: `planning-poker`
3. In your terminal:
   ```bash
   firebase login
   firebase init hosting
   firebase init functions
   firebase deploy
   ```

**✅ Benefits**: Google infrastructure, generous free tier

---

### Option 4: GitHub Pages + Vercel Functions
**Static hosting + Serverless functions**

#### Frontend (GitHub Pages):
1. Go to your repo settings
2. Pages → Source: "GitHub Actions"
3. Create `.github/workflows/pages.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: cd frontend && npm ci && npm run build
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: frontend/dist
```

#### Backend (Vercel Functions):
Convert Express routes to Vercel Functions (free tier: 100GB bandwidth)

---

## 🎯 Recommended: Render.com

**Why Render.com is the best free option:**
- ✅ True free tier (no credit card required)
- ✅ Custom domains included
- ✅ Automatic HTTPS
- ✅ WebSocket support
- ✅ No time limits
- ✅ GitHub integration
- ✅ Both frontend and backend
- ✅ No cold starts for static sites

## 📋 Quick Deploy Commands

### Render One-Click Deploy:
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/trmquang93/planning-poker)

### Manual Deploy Steps:
```bash
# 1. Push to GitHub (already done)
git push origin main

# 2. Go to render.com
# 3. Connect GitHub repo
# 4. Follow configuration steps above
# 5. Your app will be live at:
# Frontend: https://planning-poker-frontend.onrender.com
# Backend: https://planning-poker-backend.onrender.com
```

## 🔧 Environment Variables Summary

**Backend (.env on Render):**
```
NODE_ENV=production
PORT=10000
```

**Frontend (.env on Render/Netlify):**
```
VITE_BACKEND_URL=https://planning-poker-backend.onrender.com
```

## ⚡ Performance Notes

- **Render Free**: May sleep after 15 minutes of inactivity (cold starts)
- **Netlify**: No sleep, instant loading
- **GitHub Pages**: No sleep, instant loading
- **Firebase**: Generous quotas, minimal cold starts

## 🎉 Result

Your Planning Poker app will be live at:
- **Frontend**: `https://your-app-name.onrender.com`
- **API**: `https://your-backend-name.onrender.com`

**Total Cost: $0/month** 🎉