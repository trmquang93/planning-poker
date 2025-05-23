# Deployment Guide

This guide explains how to deploy the Planning Poker application to production using free hosting services.

## Architecture Overview

- **Frontend**: React app deployed to Vercel
- **Backend**: Node.js/Express server deployed to Railway
- **Communication**: WebSocket connection between frontend and backend

## Prerequisites

- Git repository (GitHub recommended)
- Vercel account (free)
- Railway account (free)

## Backend Deployment (Railway)

1. **Connect Repository to Railway**
   ```bash
   # Visit https://railway.app
   # Click "New Project"
   # Select "Deploy from GitHub repo"
   # Choose your repository
   ```

2. **Configure Railway Settings**
   - Set **Root Directory**: `backend`
   - Set **Build Command**: `npm run build`
   - Set **Start Command**: `npm start`

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://your-app-name.vercel.app
   ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Note the deployed URL (e.g., `https://planning-poker-backend.railway.app`)

## Frontend Deployment (Vercel)

1. **Update Backend URL**
   ```bash
   # Edit frontend/.env.production
   echo "VITE_BACKEND_URL=https://your-backend-url.railway.app" > frontend/.env.production
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy from project root
   vercel

   # Follow prompts:
   # - Link to existing project: No
   # - Project name: planning-poker
   # - Directory: ./frontend
   # - Build command: npm run build
   # - Output directory: dist
   ```

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add: `VITE_BACKEND_URL` = `https://your-backend-url.railway.app`

## Alternative: One-Click Deployment

### Deploy Backend to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/your-template-link)

### Deploy Frontend to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/planning-poker&root-directory=frontend)

## Manual Deployment Commands

### Backend (Railway)
```bash
cd backend
npm run build
npm start
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Upload dist/ folder to Vercel
```

## Environment Configuration

### Production Environment Variables

**Backend (.env)**
```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

**Frontend (.env.production)**
```
VITE_BACKEND_URL=https://your-backend-domain.railway.app
```

## Health Checks

- **Backend Health**: `GET /health`
- **Frontend**: Automatic health checks via Vercel

## SSL/HTTPS

Both Vercel and Railway provide automatic HTTPS certificates.

## Domain Configuration (Optional)

### Custom Domain for Frontend (Vercel)
1. Go to Vercel Dashboard > Domains
2. Add your custom domain
3. Update DNS records as instructed

### Custom Domain for Backend (Railway)
1. Go to Railway Dashboard > Settings
2. Add custom domain
3. Update DNS records as instructed

## Monitoring

### Railway (Backend)
- View logs in Railway dashboard
- Monitor resource usage
- Set up alerts

### Vercel (Frontend)
- View deployment logs
- Monitor performance metrics
- Analytics dashboard

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend `CORS_ORIGIN` matches frontend domain
   - Check both HTTP and HTTPS protocols

2. **WebSocket Connection Failures**
   - Verify backend URL in frontend environment
   - Check Railway service is running
   - Ensure WebSocket support is enabled

3. **Build Failures**
   - Check all dependencies are in package.json
   - Verify TypeScript compilation
   - Run `npm run build` locally first

### Logs Access

**Railway Backend Logs:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and view logs
railway login
railway logs
```

**Vercel Frontend Logs:**
```bash
# Install Vercel CLI
npm install -g vercel

# View function logs
vercel logs [deployment-url]
```

## Cost Management

Both services offer generous free tiers:

- **Vercel**: 100GB bandwidth, unlimited static deployments
- **Railway**: $5 free credit monthly, no time limits

Monitor usage in respective dashboards to stay within free tier limits.

## Security Considerations

- No sensitive data is stored persistently
- Sessions auto-expire after 2 hours
- All communications use HTTPS/WSS
- No user authentication reduces attack surface

## Backup Strategy

Since the app uses in-memory storage:
- No data persistence required
- Session data is temporary by design
- Code is backed up in Git repository

## Performance Optimization

- Frontend uses Vite for optimized builds
- Backend implements connection pooling
- WebSocket connections are efficiently managed
- Static assets are cached via Vercel CDN

## Support

For deployment issues:
- Check service status pages (Vercel Status, Railway Status)
- Review deployment logs
- Verify environment variables
- Test locally first