# 🏥 Rehacentrum Humenné - AI Booking System

Healthcare appointment booking system with ElevenLabs AI voice assistant integration.

## 📁 Repository Structure

```
rehacentrum2/
├── 📄 Core Application Files
│   ├── server.js                    # Main Express server
│   ├── config.js                    # Application configuration
│   ├── package.json                 # Dependencies
│   └── package-lock.json            # Dependency lock file
│
├── 🔧 Services
│   ├── googleCalendar.js            # Google Calendar integration
│   ├── appointmentValidator.js      # Appointment validation logic
│   ├── smsService.js               # SMS notifications (Twilio)
│   ├── holidayService.js           # Holiday/working day logic
│   └── lib/
│       └── logger.js               # Logging utilities
│
├── 🌐 API Endpoints
│   └── api/
│       ├── health.js               # Health check endpoint
│       ├── appointment-types.js    # Appointment types API
│       ├── logs.js                 # Logging API
│       ├── webhook-logs.js         # Webhook logging
│       ├── webhook-storage.js      # Webhook storage
│       ├── index.js               # API index
│       └── booking/
│           └── webhook.js          # ElevenLabs webhook handler
│
├── 📚 Documentation
│   ├── docs/
│   │   ├── elevenlabs/
│   │   │   ├── ELEVENLABS_AGENT_PROMPT.md    # AI agent instructions
│   │   │   ├── ELEVENLABS_CONFIG.md          # ElevenLabs setup guide
│   │   │   └── ELEVENLABS_TOOLS_CONFIG.json  # Tool configuration
│   │   ├── deployment/
│   │   │   └── RAILWAY_DEPLOYMENT.md         # Railway deployment guide
│   │   └── TESTING_GUIDE.md                  # Testing documentation
│   ├── COMPLETE_PROJECT_OVERVIEW.md          # Complete system overview
│   └── README.md                             # This file
│
└── ⚙️ Configuration
    ├── environment-variables.example         # Environment variables template
    ├── railway.toml                         # Railway deployment config
    └── nixpacks.toml                        # Nixpacks build config
```

## 🚀 Quick Start

### 1. Environment Setup
```bash
cp environment-variables.example .env
# Edit .env with your credentials
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm start
```

## 🎯 Key Features

- **🤖 AI Voice Assistant**: ElevenLabs integration for natural Slovak conversations
- **📅 Google Calendar**: Real-time appointment scheduling
- **📱 SMS Notifications**: Twilio integration for appointment confirmations
- **🌍 Multi-timezone**: DST-aware scheduling (Europe/Bratislava)
- **🔄 Real-time Sync**: Live calendar availability checking

## 📋 Appointment Types

| Type | Time Slots | Price | Duration |
|------|------------|-------|----------|
| **Športová prehliadka** | 07:00-08:40 (20min intervals) | 130€ | 20min |
| **Vstupné vyšetrenie** | 09:00-11:30, 13:00-15:00 | Free | 30min |
| **Kontrolné vyšetrenie** | 09:00-11:30, 13:00-15:00 | Free | 30min |
| **Zdravotnícke pomôcky** | 09:00-11:30, 13:00-15:00 | Free | 30min |
| **Konzultácia** | 07:30-09:00, 15:00-16:00 | 30€ | 30min |

## 🔧 Configuration

### ElevenLabs AI Assistant
Configure the AI assistant using files in `docs/elevenlabs/`:
- `ELEVENLABS_AGENT_PROMPT.md` - AI behavior and instructions
- `ELEVENLABS_TOOLS_CONFIG.json` - Tool configuration for ElevenLabs

### Production Deployment
- **Platform**: Railway (https://railway.app)
- **URL**: https://rehacentrum2-production.up.railway.app
- **Webhook**: https://rehacentrum2-production.up.railway.app/api/booking/webhook

## 📞 API Endpoints

### Core Endpoints
```
GET  /health                     # System health check
GET  /api/appointment-types      # Available appointment types
GET  /api/available-slots        # Get available time slots
POST /api/booking/webhook        # ElevenLabs AI webhook
```

### ElevenLabs Webhook Actions
- `get_available_slots` - Find available appointment times
- `find_closest_slot` - Get next available appointment
- `book_appointment` - Create new booking
- `cancel_appointment` - Cancel existing booking
- `reschedule_appointment` - Move appointment to new time
- `get_more_slots` - Show additional available times

## 📖 Documentation

- **[Complete Overview](COMPLETE_PROJECT_OVERVIEW.md)** - Detailed system documentation
- **[ElevenLabs Setup](docs/elevenlabs/ELEVENLABS_CONFIG.md)** - AI assistant configuration
- **[Testing Guide](docs/TESTING_GUIDE.md)** - How to test the system
- **[Railway Deployment](docs/deployment/RAILWAY_DEPLOYMENT.md)** - Production deployment

## 🔒 Environment Variables

Required environment variables (see `environment-variables.example`):
- `GOOGLE_CREDENTIALS` - Google service account credentials
- `TWILIO_ACCOUNT_SID` - Twilio SMS service ID
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - SMS sender number
- `TWILIO_ENABLED` - Enable/disable SMS (true/false)

## 🌟 Recent Updates

- ✅ Fixed sports examination time slots (07:00-08:40)
- ✅ DST-aware timezone handling for winter/summer
- ✅ Removed premature price information from responses
- ✅ Enhanced AI agent behavior and validation
- ✅ Cleaned repository structure and documentation

## 📞 Support

For issues or questions about the Rehacentrum booking system, refer to the documentation in the `docs/` directory.