# VAPI.ai Configuration for Rehacentrum

## Overview
This document describes the VAPI.ai integration setup as a fallback solution for the existing ElevenLabs voice booking system.

## Architecture
- **Primary**: ElevenLabs at `/api/booking/webhook`
- **Fallback**: VAPI.ai at `/api/booking/vapi-webhook`
- **Shared Logic**: Both use same booking functions
- **Auto-Failover**: Monitors ElevenLabs health and switches automatically

## Configuration Files
- `/config/vapi-config.js` - VAPI.ai specific configuration
- `/docs/vapi/VAPI_ASSISTANT_CONFIG.json` - Assistant configuration for VAPI.ai platform
- `/docs/vapi/VAPI_PROMPT.md` - Slovak language prompt (same as ElevenLabs)

## Environment Variables
```
# VAPI.ai Configuration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_ASSISTANT_ID=your_assistant_id_here
VAPI_PHONE_NUMBER=your_vapi_phone_number_here
VAPI_ENABLED=true

# Health Monitoring
ELEVENLABS_HEALTH_CHECK_INTERVAL=30000
AUTO_FAILOVER_ENABLED=true
FORCE_PLATFORM=auto  # auto, elevenlabs, vapi
```

## Webhook Endpoints
1. **ElevenLabs**: `POST /api/booking/webhook` (unchanged)
2. **VAPI.ai**: `POST /api/booking/vapi-webhook` (new)

## Health Monitoring
- Checks ElevenLabs API status every 30 seconds
- Auto-switches to VAPI.ai when ElevenLabs is down
- Auto-switches back when ElevenLabs recovers
- Manual override available via environment variable

## Failover Logic
1. Monitor ElevenLabs health continuously
2. When down: Route new calls to VAPI.ai
3. When recovered: Route new calls back to ElevenLabs
4. Existing calls continue on their original platform

## Setup Steps
1. Add environment variables
2. Create VAPI.ai assistant with provided configuration
3. Deploy updated webhook endpoints
4. Configure Zadarma routing for failover scenarios
5. Test both platforms independently
6. Enable auto-failover monitoring