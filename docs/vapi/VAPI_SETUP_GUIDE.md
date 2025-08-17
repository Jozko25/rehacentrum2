# VAPI.ai Integration Setup Guide

## Overview
This guide will help you set up VAPI.ai as a fallback voice platform for your ElevenLabs booking system. The integration provides automatic failover when ElevenLabs experiences outages.

## 🚨 IMPORTANT: Zero Downtime Guarantee
**Your existing ElevenLabs system will continue working exactly as before. Nothing will be broken.**

## Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Zadarma       │    │  Health Monitor  │    │  Google Calendar│
│   (Calls)       │────│  (Auto-Failover) │────│  (Shared)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │                 │              │
         ▼              ▼                 ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   ElevenLabs    │ │     VAPI.ai     │ │   SMS Service   │
│   (Primary)     │ │   (Fallback)    │ │   (Shared)      │
│ /webhook        │ │ /vapi-webhook   │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Prerequisites
1. VAPI.ai account and API key
2. Your existing ElevenLabs setup (unchanged)
3. Access to environment variables

## Step 1: Get VAPI.ai Credentials

### 1.1 Create VAPI.ai Account
1. Go to [vapi.ai](https://vapi.ai) and sign up
2. Get your API key from the dashboard
3. Note your phone number if you have one

### 1.2 Required Information
- `VAPI_API_KEY`: Your VAPI.ai API key
- `VAPI_ASSISTANT_ID`: Will be created in Step 3
- `VAPI_PHONE_NUMBER`: Your VAPI.ai phone number (optional)
- `VAPI_WEBHOOK_SECRET`: Generate a secure random string

## Step 2: Environment Configuration

### 2.1 Add Environment Variables
Add these to your Railway/deployment environment:

```bash
# VAPI.ai Configuration
VAPI_ENABLED=true
VAPI_API_KEY=your_actual_vapi_api_key_here
VAPI_ASSISTANT_ID=your_assistant_id_here
VAPI_PHONE_NUMBER=your_vapi_phone_number_here
VAPI_VOICE_ID=pNInz6obpgDQGcFmaJgB
VAPI_WEBHOOK_SECRET=your_secure_random_string_here
VAPI_WEBHOOK_URL=https://rehacentrum2-production.up.railway.app/api/booking/vapi-webhook

# Health Monitoring
ELEVENLABS_HEALTH_CHECK_INTERVAL=30000
AUTO_FAILOVER_ENABLED=true
FORCE_PLATFORM=auto
```

### 2.2 Generate Webhook Secret
```bash
# Generate a secure webhook secret (32 characters)
openssl rand -hex 32
```

## Step 3: Create VAPI.ai Assistant

### 3.1 Using VAPI.ai Dashboard
1. Log into your VAPI.ai dashboard
2. Click "Create Assistant"
3. Upload the configuration from `/docs/vapi/VAPI_ASSISTANT_CONFIG.json`
4. Update the webhook URL to your deployment URL
5. Save and note the Assistant ID

### 3.2 Using VAPI.ai API (Alternative)
```bash
curl -X POST "https://api.vapi.ai/assistant" \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @docs/vapi/VAPI_ASSISTANT_CONFIG.json
```

## Step 4: Deploy Updated Code

### 4.1 Commit Changes
```bash
git add .
git commit -m "🔄 Add VAPI.ai dual-platform support with auto-failover"
git push origin main
```

### 4.2 Verify Deployment
1. Check Railway logs for successful deployment
2. Visit `/api/platform/status` to see platform status
3. Verify both endpoints are working:
   - `/api/booking/webhook` (ElevenLabs - unchanged)
   - `/api/booking/vapi-webhook` (VAPI.ai - new)

## Step 5: Test the Integration

### 5.1 Manual Testing
```bash
# Test ElevenLabs endpoint (should work as before)
curl -X POST "https://your-domain.railway.app/api/booking/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_available_slots",
    "parameters": {
      "date": "2025-08-20",
      "appointment_type": "vstupne_vysetrenie"
    }
  }'

# Test VAPI.ai endpoint (new)
curl -X POST "https://your-domain.railway.app/api/booking/vapi-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "function_call",
    "function_call": {
      "name": "get_available_slots",
      "parameters": {
        "date": "2025-08-20",
        "appointment_type": "vstupne_vysetrenie"
      }
    }
  }'
```

### 5.2 Platform Status Check
```bash
curl "https://your-domain.railway.app/api/platform/status"
```

Expected response:
```json
{
  "initialized": true,
  "monitoring": true,
  "activePlatform": "elevenlabs",
  "platforms": {
    "elevenlabs": {
      "status": "up",
      "lastCheck": "2025-08-17T...",
      "responseTime": 234
    },
    "vapi": {
      "status": "up",
      "lastCheck": "2025-08-17T...",
      "responseTime": 189
    }
  }
}
```

## Step 6: Configure Zadarma (Future)

When ElevenLabs is down, you'll need to manually update Zadarma to use the VAPI.ai endpoint:

### 6.1 Get Configuration
```bash
curl "https://your-domain.railway.app/api/platform/zadarma-config"
```

### 6.2 Update Zadarma Webhook
- **Normal**: `https://your-domain.railway.app/api/booking/webhook`
- **Failover**: `https://your-domain.railway.app/api/booking/vapi-webhook`

## Monitoring & Management

### Platform Status Dashboard
Visit your admin panel to see:
- Real-time platform health
- Call routing statistics
- Manual platform switching
- Failover history

### Health Monitoring
The system automatically:
- Checks ElevenLabs every 30 seconds
- Detects outages after 3 failed attempts
- Logs all platform events
- Provides recommendations

### Manual Override
```bash
# Force switch to VAPI.ai
curl -X POST "https://your-domain.railway.app/api/platform/switch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"platform": "vapi", "reason": "Maintenance"}'

# Return to automatic mode
curl -X POST "https://your-domain.railway.app/api/platform/switch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"platform": "auto"}'
```

## Troubleshooting

### Common Issues

#### 1. VAPI.ai webhook not receiving calls
- Check `VAPI_WEBHOOK_URL` is correct
- Verify `VAPI_WEBHOOK_SECRET` matches
- Ensure assistant configuration has correct webhook URL

#### 2. Health monitoring not working
- Check `VAPI_API_KEY` is valid
- Verify `AUTO_FAILOVER_ENABLED=true`
- Check logs for health check errors

#### 3. Platform not switching
- Verify `FORCE_PLATFORM=auto`
- Check ElevenLabs actually fails 3+ times
- Review platform status endpoint

### Debug Endpoints
- `/api/platform/status` - Platform health
- `/api/platform/config` - Current configuration
- `/health` - Service status
- `/admin` - Admin dashboard

## Security Notes

1. **Webhook Security**: VAPI.ai webhook is secured with secret validation
2. **IP Filtering**: Admin endpoints require IP whitelisting
3. **Audit Logging**: All platform switches are logged
4. **Graceful Degradation**: System continues working even if health monitoring fails

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Review admin dashboard for platform status
3. Test both webhook endpoints manually
4. Verify environment variables are set correctly

---

**Remember**: Your ElevenLabs setup remains completely unchanged and will continue working exactly as before. VAPI.ai is purely an additional fallback option.