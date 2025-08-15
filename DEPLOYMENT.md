# 🚀 Deployment Guide

## ✅ Manual Testing Results - All PASSED

The system has been manually tested and all core functionality works perfectly:

### Core Features Tested ✅
- ✅ Health check endpoint responding
- ✅ All 11 appointment types configured correctly  
- ✅ Google Calendar integration working
- ✅ Available slots retrieval working
- ✅ Appointment creation successful (created Manual Test sports exam)
- ✅ Webhook booking working (created Webhook Success initial exam)
- ✅ Conflict detection with alternatives working
- ✅ Business rules enforced (weekend booking rejected)
- ✅ SMS toggle working (disabled as expected)
- ✅ Real-time dashboard generating properly
- ✅ Order numbers incrementing (saw numbers 2, 3)
- ✅ Slovak language responses working
- ✅ Price calculations correct (130€ sports, 0€ insurance covered)

## 🚀 Ready for Production Deployment

### 1. Railway Deployment (Recommended)

```bash
# Connect your GitHub repository to Railway
# 1. Go to https://railway.app
# 2. Sign up with GitHub
# 3. Click "Deploy from GitHub repo"
# 4. Select your rehacentrum2 repository
# 5. Set environment variables (see RAILWAY_DEPLOYMENT.md)

# Your app will be automatically deployed and get a URL like:
# https://your-app-name.up.railway.app
```

**See detailed Railway deployment guide:** `RAILWAY_DEPLOYMENT.md`

### 2. Vercel Deployment (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard:
# - TWILIO_ENABLED=false (or true to enable SMS)
# - TWILIO_ACCOUNT_SID=your_sid (if enabling SMS)
# - TWILIO_AUTH_TOKEN=your_token (if enabling SMS)  
# - TWILIO_PHONE_NUMBER=+12678638448
# - GOOGLE_CREDENTIALS={"type":"service_account","project_id":"rehacentrum-468520",...} (complete JSON)
# - NODE_ENV=production
```

### 2. Update ElevenLabs Webhook URL

**For Railway deployment**, update the webhook URL in `ELEVENLABS_TOOLS_CONFIG.json`:
```json
{
  "webhook_url": "https://your-railway-app.up.railway.app/api/booking/webhook"
}
```

**For Vercel deployment**, update the webhook URL in `ELEVENLABS_TOOLS_CONFIG.json`:
```json
{
  "webhook_url": "https://your-vercel-app.vercel.app/api/booking/webhook"
}
```

### 3. SMS Configuration

**To enable SMS:**
Set environment variable: `TWILIO_ENABLED=true`

**To disable SMS (current state):**
Set environment variable: `TWILIO_ENABLED=false` (default)

### 4. Key URLs After Deployment

- **Dashboard:** `https://your-app.vercel.app/`
- **Health Check:** `https://your-app.vercel.app/health`
- **ElevenLabs Webhook:** `https://your-app.vercel.app/api/booking/webhook`
- **Book Appointment:** `POST https://your-app.vercel.app/api/appointments`

## 🎯 What's Working

✅ **11 Appointment Types** - All configured with proper pricing, schedules, requirements  
✅ **Google Calendar** - Events creating successfully with order numbers  
✅ **Smart Scheduling** - Conflict detection, alternatives, business rules  
✅ **ElevenLabs AI** - Webhook responding in Slovak with proper validation  
✅ **Toggleable SMS** - Easy on/off control via environment variable  
✅ **Real-time Monitoring** - Dashboard showing live activity  
✅ **Slovak Holidays** - Automatic detection and blocking  
✅ **Production Ready** - Error handling, validation, logging

## 🔧 Final File Structure

```
rehacentrum2/
├── server.js                    # Main Express server ✅
├── config.js                   # All 11 appointment types ✅  
├── googleCalendar.js           # Google Calendar service ✅
├── appointmentValidator.js     # Business logic ✅
├── smsService.js              # Toggleable SMS ✅
├── holidayService.js          # Slovak holidays ✅
├── api/booking/webhook.js     # ElevenLabs webhook ✅
├── credentials.json           # Google service account ✅
├── vercel.json               # Deployment config ✅
├── package.json              # Clean dependencies ✅
├── .env.example              # Environment template ✅
├── README.md                 # Documentation ✅
├── TESTING_GUIDE.md          # Testing instructions ✅
├── ELEVENLABS_AGENT_PROMPT.md # AI assistant setup ✅
└── ELEVENLABS_TOOLS_CONFIG.json # AI tools config ✅
```

## 🎉 Ready to Go!

The system is **production-ready** and has been manually validated. All business requirements met:

- 11 appointment types with correct pricing and schedules
- Google Calendar integration working 
- SMS system toggleable via environment variable
- ElevenLabs AI webhook ready for integration
- Slovak business rules enforced
- Real-time monitoring dashboard
- Comprehensive error handling and validation

**Deploy to Vercel now!** 🚀