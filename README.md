# 🏥 Rehacentrum Humenné - API Documentation

A comprehensive healthcare appointment booking system with AI voice assistant integration for Rehacentrum rehabilitation center in Slovakia.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Service Account with Calendar API enabled
- Twilio account (optional for SMS)
- Railway or Vercel account (for deployment)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd rehacentrum2
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Set up Google Calendar:**
   - Place your `credentials.json` file in the project root
   - Ensure the service account has access to the calendar `airecepcia@gmail.com`

4. **Start the server:**
```bash
npm start
# or for development
npm run dev
```

5. **Access the dashboard:**
   - Open http://localhost:3000
   - API available at http://localhost:3000/api/*

## 📱 SMS Configuration

SMS notifications via Twilio can be easily enabled/disabled:

```bash
# To enable SMS
export TWILIO_ENABLED=true
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_PHONE_NUMBER=+12678638448

# To disable SMS (default)
export TWILIO_ENABLED=false
```

## 🏗️ Project Structure

```
rehacentrum2/
├── server.js                    # Main Express server
├── config.js                   # Central configuration
├── googleCalendar.js           # Google Calendar service
├── appointmentValidator.js     # Business logic & validation
├── smsService.js              # Twilio SMS service (toggleable)
├── holidayService.js          # Slovak holiday management
├── api/booking/webhook.js     # ElevenLabs AI webhook handler
├── credentials.json           # Google service account (you provide)
├── package.json              # Dependencies
├── vercel.json               # Vercel deployment config
├── .env.example              # Environment variables template
├── ELEVENLABS_AGENT_PROMPT.md # AI assistant instructions
├── ELEVENLABS_TOOLS_CONFIG.json # AI tools configuration
└── README.md                 # This file
```

## 🎯 Appointment Types

| Type | Price | Schedule | Duration | Insurance |
|------|--------|----------|----------|-----------|
| **Športová prehliadka** | 130€ | 7:00-8:40 (20min intervals) | 20min | No |
| **Vstupné vyšetrenie** | Free | 9:00-11:30, 13:00-15:00 (10min) | 30min | Yes |
| **Kontrolné vyšetrenie** | Free | 9:00-11:30, 13:00-15:00 (10min) | 30min | Yes |
| **Zdravotnícke pomôcky** | Free | 9:00-11:30, 13:00-15:00 (10min) | 30min | Yes |
| **Konzultácia** | 30€ | 7:30-9:00, 15:00-16:00 (10min) | 30min | No |

## 🔌 API Endpoints

### Core Booking Endpoints
```
GET  /health                      # Health check
GET  /                           # Real-time dashboard
GET  /api/appointment-types      # List all appointment types
GET  /api/available-slots        # Get available slots for date/type
GET  /api/availability/:date     # Full day availability
POST /api/appointments           # Create appointment
POST /slots/soonest             # Find next available slot
```

### ElevenLabs AI Webhook
```
POST /api/booking/webhook        # AI assistant webhook handler
```

**Supported Actions:**
- `get_available_slots` - Get free slots
- `find_closest_slot` - Find nearest appointment  
- `book_appointment` - Create booking
- `cancel_appointment` - Cancel appointment
- `reschedule_appointment` - Move appointment
- `send_fallback_sms` - Fallback SMS

### Utility Endpoints
```
GET  /api/logs                   # View system logs
DELETE /api/logs                 # Clear logs
POST /api/sms/test              # Test SMS functionality
GET  /api/requirements/:type     # Get appointment requirements
```

## 📊 Real-time Dashboard

Access the live monitoring dashboard at the root URL (`/`):

- **System Status**: Calendar and SMS service status
- **Live Logs**: Real-time API activity with filtering
- **Statistics**: Appointment counts and service status
- **Manual Controls**: Clear logs, refresh data

## 🤖 ElevenLabs AI Integration

### Configuration Files

1. **ELEVENLABS_AGENT_PROMPT.md** - Slovak language AI assistant instructions
2. **ELEVENLABS_TOOLS_CONFIG.json** - Tool definitions for AI agent

### Webhook URL
**Railway deployment:**
```
https://your-railway-app.up.railway.app/api/booking/webhook
```

**Vercel deployment:**
```
https://your-vercel-app.vercel.app/api/booking/webhook
```

### Sample AI Tool Call
```json
{
  \"action\": \"book_appointment\",
  \"parameters\": {
    \"appointment_type\": \"sportova_prehliadka\",
    \"date_time\": \"2025-01-20T08:00:00\",
    \"patient_name\": \"Ján\",
    \"patient_surname\": \"Novák\",
    \"phone\": \"+421901234567\",
    \"insurance\": \"VšZP\"
  }
}
```

## 🚀 Deployment

### Railway Deployment (Recommended)

**Quick deployment from GitHub:**

1. **Connect to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Sign up with your GitHub account
   - Click "Deploy from GitHub repo"
   - Select your `rehacentrum2` repository

2. **Set environment variables:**
   - `GOOGLE_CREDENTIALS` - Your complete Google Service Account JSON
   - `NODE_ENV=production`
   - `TWILIO_ENABLED=false` (or true to enable SMS)

3. **Deploy:**
   - Railway automatically builds and deploys
   - You get a URL like: `https://your-app.up.railway.app`

**See detailed guide:** `RAILWAY_DEPLOYMENT.md`

### Vercel Deployment (Alternative)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy to production:**
```bash
vercel --prod
```

3. **Set environment variables in Vercel dashboard:**
   - `TWILIO_ENABLED=true` (or false)
   - `TWILIO_ACCOUNT_SID=your_sid`
   - `TWILIO_AUTH_TOKEN=your_token`
   - `TWILIO_PHONE_NUMBER=+12678638448`
   - `NODE_ENV=production`
   - `TZ=Europe/Bratislava`

### Other Deployment Options (AWS, DigitalOcean, etc.)

The application is containerizable and can run on any Node.js hosting:

```bash
# Build and start
npm install --production
node server.js
```

## 📝 Business Rules

- **Working Days**: Monday-Friday only
- **Holiday Detection**: Automatic Slovak holiday detection
- **Vacation Days**: Marked as "DOVOLENKA" in calendar
- **Daily Limits**: Each appointment type has specific limits
- **Order Numbers**: Sequential numbering for doctor queue
- **Advance Booking**: 1 hour minimum, 30 days maximum

## 🔒 Security & Privacy

- **CORS**: Enabled for cross-origin requests
- **Input Validation**: All endpoints validate required fields
- **Patient Verification**: Identity checks for cancellations
- **Environment Variables**: Sensitive data protected
- **No Local Storage**: Data stored in Google Calendar only
- **GDPR Compliant**: Minimal patient data handling

## 🛠️ Testing

### Manual Testing Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get appointment types
curl http://localhost:3000/api/appointment-types

# Get available slots
curl \"http://localhost:3000/api/available-slots?date=2025-01-20&appointmentType=sportova_prehliadka\"

# Test SMS (if enabled)
curl -X POST http://localhost:3000/api/sms/test \\
  -H \"Content-Type: application/json\" \\
  -d '{\"phone\":\"+421901234567\",\"message\":\"Test message\"}'
```

### Test Appointment Creation

```bash
curl -X POST http://localhost:3000/api/appointments \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"patientData\": {
      \"name\": \"Test\",
      \"surname\": \"Patient\",
      \"phone\": \"+421901234567\",
      \"insurance\": \"VšZP\"
    },
    \"appointmentType\": \"vstupne_vysetrenie\",
    \"dateTime\": \"2025-01-20T09:00:00\"
  }'
```

## 📱 SMS Templates

All SMS messages are sent in Slovak with appointment-specific information:

**Sports Examination:**
```
Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, 
cena 130€, nalačno, prineste jedlo/vodu, veci na prezlečenie. 
Vaše poradové číslo je {order_number}. Rehacentrum Humenné
```

## 🔧 Troubleshooting

### Common Issues

1. **Google Calendar not working:**
   - Check `credentials.json` file exists
   - Verify service account permissions
   - Check calendar ID in config

2. **SMS not sending:**
   - Verify `TWILIO_ENABLED=true`
   - Check Twilio credentials
   - Test with `/api/sms/test` endpoint

3. **Appointment validation errors:**
   - Check Slovak holidays configuration
   - Verify appointment type exists
   - Check time slot alignment

### Debug Information

View logs in real-time:
- Dashboard: http://localhost:3000
- API: `GET /api/logs`
- Filter by type: `GET /api/logs?type=error`

## 📞 Contact & Support

**Clinic Information:**
- **Name**: Rehacentrum Humenné
- **Location**: Humenné, Slovakia
- **Hours**: Monday-Friday 7:00-16:00

**Technical Support:**
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Node.js**: 18+
- **Dependencies**: See package.json

---

## 🎉 Ready to Deploy!

The system is now ready for production deployment. All services are working, SMS is toggleable via environment variable, and comprehensive testing documentation is provided. Deploy to Vercel first, then scale to Railway or AWS as needed.

**Key Features:**
- ✅ 11 complete appointment types configured
- ✅ Google Calendar integration
- ✅ Toggleable Twilio SMS (TWILIO_ENABLED=true/false)
- ✅ ElevenLabs AI webhook ready
- ✅ Slovak holiday system
- ✅ Real-time monitoring dashboard
- ✅ Comprehensive API documentation
- ✅ Production-ready Vercel configuration
- ✅ Complete testing suite