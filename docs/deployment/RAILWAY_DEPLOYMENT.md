# 🚂 Railway Deployment Guide

## Overview

This application is configured for deployment on [Railway](https://railway.app), a modern platform that automatically deploys your applications from GitHub.

## 🚀 Quick Deployment

### Prerequisites
- GitHub repository with your code
- Railway account (free tier available)

### Step 1: Connect to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up/login with your GitHub account
3. Click "Deploy from GitHub repo"
4. Select your repository (`rehacentrum2`)

### Step 2: Environment Variables
Set these in Railway's dashboard under your project → Variables:

```bash
# Required - Google Calendar Service Account
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"rehacentrum-468520",...}

# Optional - SMS Service (set to 'true' to enable)
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+12678638448

# Production Environment
NODE_ENV=production
```

### Step 3: Deploy
Railway will automatically:
- Detect your Node.js application
- Install dependencies (`npm ci`)
- Run health checks on `/health`
- Deploy and provide a public URL

## 📋 Railway Configuration Files

### `railway.toml`
```toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[environments.production.variables]
NODE_ENV = "production"
PORT = "$PORT"
```

### `nixpacks.toml` 
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmd = "npm ci"

[phases.build]
cmd = "npm run build 2>/dev/null || echo 'No build script found'"

[start]
cmd = "npm start"
```

## 🔗 Key URLs After Deployment

Replace `your-app-name` with your Railway app URL:

- **Dashboard:** `https://your-app-name.up.railway.app/`
- **Health Check:** `https://your-app-name.up.railway.app/health`
- **ElevenLabs Webhook:** `https://your-app-name.up.railway.app/api/booking/webhook`
- **API Endpoint:** `https://your-app-name.up.railway.app/api/appointments`

## 🔧 Update ElevenLabs Configuration

After deployment, update your ElevenLabs webhook URL in `ELEVENLABS_TOOLS_CONFIG.json`:

```json
{
  "webhook_url": "https://your-app-name.up.railway.app/api/booking/webhook"
}
```

## ⚙️ Environment Variables Details

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CREDENTIALS` | Complete Google Service Account JSON | `{"type":"service_account",...}` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables (SMS)

| Variable | Description | Default |
|----------|-------------|---------|
| `TWILIO_ENABLED` | Enable/disable SMS notifications | `false` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | - |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | `+12678638448` |

## 🏥 What's Deployed

✅ **Healthcare Appointment System**
- 5 appointment types (Sports exam, Initial, Follow-up, Medical aids, Consultation)
- Google Calendar integration
- Slovak holiday detection
- Business hours enforcement
- Order number system

✅ **AI Voice Assistant Integration**
- ElevenLabs webhook endpoint
- Slovak language support
- Smart booking flow
- Appointment validation

✅ **Optional SMS Notifications**
- Toggleable via environment variable
- Appointment confirmations
- Order numbers included

✅ **Real-time Dashboard**
- System status monitoring
- Live appointment logs
- API call tracking
- Webhook activity

## 🎯 Testing Your Deployment

1. **Health Check**: Visit `/health` - should return `{"status": "OK"}`
2. **Dashboard**: Visit `/` - should show the monitoring dashboard
3. **API Test**: Make a GET request to `/api/appointment-types`
4. **ElevenLabs**: Test webhook with your voice assistant

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your GitHub repository's main branch. No additional configuration needed!

## 🆚 Railway vs Vercel

| Feature | Railway | Vercel |
|---------|---------|---------|
| **Type** | Traditional server hosting | Serverless functions |
| **Deployment** | Persistent Node.js process | Function-based |
| **Database connections** | Persistent connections | Cold starts |
| **WebSockets** | Full support | Limited |
| **File system** | Persistent | Read-only |
| **Pricing** | Usage-based | Function execution |

## 🚨 Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Health check fails**: Ensure `/health` endpoint responds
3. **Environment variables**: Double-check JSON formatting for `GOOGLE_CREDENTIALS`
4. **Port issues**: Railway automatically sets `PORT` environment variable

### Debug Steps

1. Check Railway deployment logs
2. Verify environment variables are set
3. Test health endpoint: `curl https://your-app.up.railway.app/health`
4. Check Google Calendar credentials JSON format

## 📞 Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Create GitHub issue in your repository

---

🎉 **Your healthcare appointment system is now live on Railway!**
