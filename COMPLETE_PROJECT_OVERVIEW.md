# Rehacentrum Humenné - Complete Project Overview

## Project Summary
**Rehacentrum Humenné** is a comprehensive healthcare appointment booking system with AI voice assistant integration, built for a rehabilitation center in Slovakia. The system handles appointment scheduling, SMS confirmations, Google Calendar integration, and provides intelligent booking recommendations.

---

## Technical Architecture

### 🏗️ Core Technology Stack
- **Backend**: Node.js + Express.js
- **Calendar Integration**: Google Calendar API
- **SMS Service**: Twilio API
- **AI Assistant**: ElevenLabs Voice AI
- **Date/Time Management**: Day.js
- **Holiday System**: Slovak holidays (date-holidays)
- **Deployment**: Vercel (serverless functions)
- **Real-time Monitoring**: Custom dashboard with live logging

### 🔧 Project Structure
```
rehacentrum/
├── server.js                    # Main Express server with all endpoints
├── config.js                   # Central configuration file
├── googleCalendar.js           # Google Calendar service integration
├── appointmentValidator.js     # Business logic & slot validation
├── smsService.js              # Twilio SMS notifications
├── holidayService.js          # Slovak holiday management
├── api/booking/webhook.js     # Vercel serverless webhook
├── credentials.json           # Google service account credentials
├── package.json              # Dependencies and scripts
├── vercel.json               # Vercel deployment configuration
├── ELEVENLABS_AGENT_PROMPT.md # AI assistant instructions
├── ELEVENLABS_TOOLS_CONFIG.json # AI tools configuration
└── Documentation files...
```

---

## Business Logic & Appointment Types

### 🏥 Supported Appointment Types

#### 1. **Športová prehliadka** (Sports Examination)
- **Schedule**: 7:00-8:40 AM, 20-minute intervals (7:00, 7:20, 7:40, 8:00, 8:20)
- **Daily Limit**: 5 patients
- **Duration**: 20 minutes
- **Price**: 130€ (not covered by insurance)
- **Requirements**: Fasting (8h), bring food/water, sports clothes, towel
- **Order Numbers**: Yes (for doctor queue management)
- **Color**: Red (#11) in Google Calendar

#### 2. **Vstupné vyšetrenie** (Initial Examination)
- **Schedule**: 9:00-11:30 AM, 1:00-3:00 PM, 10-minute intervals
- **Daily Limit**: 50 patients
- **Duration**: 30 minutes
- **Price**: Covered by insurance
- **Requirements**: Referral slip (mandatory), previous medical reports
- **Order Numbers**: Yes

#### 3. **Kontrolné vyšetrenie** (Follow-up Examination)
- **Schedule**: 9:00-11:30 AM, 1:00-3:00 PM, 10-minute intervals
- **Daily Limit**: 50 patients
- **Duration**: 30 minutes
- **Price**: Covered by insurance
- **Requirements**: Insurance card, latest test results
- **Order Numbers**: Yes

#### 4. **Zdravotnícke pomôcky** (Medical Aids Consultation)
- **Schedule**: 9:00-11:30 AM, 1:00-3:00 PM, 10-minute intervals
- **Daily Limit**: 10 patients
- **Duration**: 30 minutes
- **Price**: Covered by insurance
- **Requirements**: Medical reports, old aids for inspection
- **Order Numbers**: Yes

#### 5. **Konzultácia** (Doctor Consultation)
- **Schedule**: 7:30-9:00 AM, 3:00-4:00 PM, 10-minute intervals
- **Daily Limit**: 20 patients
- **Duration**: 30 minutes
- **Price**: 30€ (not covered by insurance)
- **Requirements**: Cash payment, medical documents
- **Order Numbers**: Yes

---

## API Endpoints Reference

### 📅 Core Booking Endpoints
```
POST /events/add                    # Legacy appointment creation
POST /api/appointments              # ElevenLabs-compatible appointment creation
POST /slots/soonest                 # Find next available slot
GET  /api/available-slots           # Get multiple available slots
GET  /api/appointment-types         # List all appointment types with details
GET  /api/availability/:date        # Get full day availability
```

### 🤖 ElevenLabs Webhook Endpoints
```
POST /api/booking/webhook           # Main AI webhook handler
```
**Supported Actions**:
- `get_available_slots` - Get all free slots for specific date/type
- `find_closest_slot` - Find nearest available appointment
- `book_appointment` - Create new appointment booking
- `cancel_appointment` - Cancel existing appointment (requires patient verification)
- `reschedule_appointment` - Move appointment to new date/time
- `send_fallback_sms` - Send SMS when AI booking fails

### 🧠 Advanced AI Endpoints
```
POST /api/smart-recommendations     # Intelligent appointment suggestions
POST /api/appointment-guidance      # Help choose right appointment type
POST /api/conflict-resolution       # Handle booking conflicts with alternatives
POST /api/patient-info-validation   # Progressive patient data validation
GET  /api/requirements/:type        # Get detailed requirements per appointment
```

### 🔧 Utility Endpoints
```
GET  /health                        # Basic health check
GET  /                              # Real-time monitoring dashboard
GET  /api/logs                      # Retrieve system logs
DELETE /api/logs                    # Clear system logs
POST /api/sms/test                  # Test SMS functionality
```

---

## Configuration Details

### 📱 SMS Templates (Twilio Integration)
All SMS messages are in Slovak with appointment-specific information:

```javascript
// Example for Sports Examination
"Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, cena 130€, nalačno, prineste jedlo/vodu, veci na prezlečenie. Vaše poradové číslo je {order_number}. Rehacentrum Humenné"
```

**Template Variables**:
- `{patient_name}` - Patient's full name
- `{date_short}` - Date in Slovak format (e.g., "18.8.")
- `{time}` - Time in HH:MM format
- `{order_number}` - Sequential queue number

### 🗓️ Google Calendar Integration
- **Single Calendar**: All appointments stored in `airecepcia@gmail.com`
- **Time Zone**: Europe/Bratislava
- **Event Format**: 
  ```
  Summary: "SPORTOVA_PREHLIADKA - John Doe"
  Description: "🔢 PORADOVÉ ČÍSLO: 3\n\nAppointment Type: sportova_prehliadka..."
  ```
- **Color Coding**: Different colors for different appointment types
- **Order Numbers**: Embedded in event description for doctor reference

### 🎯 Business Rules & Validation

#### Time Restrictions:
- **Weekends**: No appointments (Saturday/Sunday)
- **Slovak Holidays**: No appointments (automatic detection)
- **Vacation Days**: No appointments (marked as "DOVOLENKA" in calendar)
- **Appointment Windows**: Specific time slots per appointment type

#### Daily Limits:
- Sports: 5 appointments
- Initial/Follow-up: 50 each
- Medical Aids: 10 appointments
- Consultation: 20 appointments

#### Patient Data Requirements:
- **Mandatory**: Name, surname, phone (+421 format), insurance
- **Optional**: Email, birth ID
- **Validation**: Progressive validation for better UX

---

## ElevenLabs AI Configuration

### 🎤 AI Agent Prompt (Slovak)
The AI receptionist is configured to:
- Communicate professionally in Slovak
- Understand appointment types and requirements
- Handle booking, cancellation, and rescheduling
- Verify patient identity for cancellations/changes
- Provide pricing and requirement information
- Use appropriate tools for each action

### 🛠️ AI Tools Available
1. **get_available_slots** - Check free slots for date/type
2. **find_closest_slot** - Find nearest appointment
3. **book_appointment** - Create booking with patient data
4. **cancel_appointment** - Cancel with patient verification
5. **reschedule_appointment** - Move to new date/time

### 📞 Communication Style
- Friendly but professional Slovak
- Clear pricing information (130€ sports, 30€ consultation)
- Specific requirements per appointment type
- Order number explanation
- Fallback to SMS when AI fails

---

## Environment & Deployment

### 🔑 Required Environment Variables
```bash
# Twilio SMS (optional - can be disabled)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token  
TWILIO_PHONE_NUMBER=+12678638448

# Google Calendar (required)
# Place credentials.json in project root
```

### 📦 Dependencies
```json
{
  "axios": "^1.11.0",
  "cors": "^2.8.5", 
  "date-holidays": "^3.25.0",
  "dayjs": "^1.11.10",
  "express": "^4.18.2",
  "googleapis": "^126.0.1",
  "twilio": "^5.8.0"
}
```

### 🚀 Deployment Commands
```bash
# Development
npm run dev
# OR
vercel dev

# Production (Vercel)
vercel --prod

# Direct Node.js
node server.js
```

### 🔍 Health Check
```bash
curl http://localhost:3000/health
# Response: "Rehacentrum API je v prevádzke"
```

---

## Real-time Monitoring

### 📊 Dashboard Features
- **Live API Activity**: Real-time request monitoring  
- **Log Filtering**: By type (booking, API, webhook)
- **Auto-refresh**: Updates every 1 second
- **Request Details**: Method, path, timestamp, response status
- **Manual Controls**: Clear logs, filter by category

### 📝 Log Types
- `booking` - Appointment creation/modification events
- `api` - General API requests
- `webhook` - ElevenLabs AI assistant calls
- `success` - Successful operations (SMS sent, bookings confirmed)
- `warning` - Non-critical issues (SMS failures, conflicts)
- `error` - Error conditions (API failures, validation errors)

---

## Security & Data Protection

### 🔒 Security Measures
- **CORS**: Enabled for cross-origin requests
- **Input Validation**: All endpoints validate required fields
- **Patient Verification**: Identity checks for cancellations/changes
- **Environment Variables**: Sensitive data protected
- **No Local Storage**: All data in Google Calendar (encrypted)

### 🛡️ Privacy Compliance
- **GDPR Compliant**: Patient data handling
- **Minimal Data Storage**: Only in Google Calendar
- **Secure APIs**: Twilio and Google APIs
- **No Database**: Reduces data breach risk

---

## Integration Points

### 🔗 External Integrations
- **Google Calendar API**: Primary appointment storage
- **Twilio SMS API**: Patient notifications  
- **ElevenLabs AI**: Voice assistant webhook
- **Slovak Holiday API**: Holiday validation
- **Vercel Platform**: Serverless deployment

### 📡 Webhook Configuration
```json
{
  "webhook_url": "https://rehacentrum-xxx.vercel.app/api/booking/webhook",
  "method": "POST",
  "timeout": 30000,
  "content_type": "application/json"
}
```

---

## Error Handling & Troubleshooting

### ⚠️ Common Error Responses
- **400**: Missing required fields, invalid appointment type
- **409**: Time slot already occupied (provides alternatives)
- **404**: No available slots found
- **500**: Internal server error, Google Calendar issues

### 🔧 Debug Tools
- `/api/logs` - View system logs
- `/api/sms/test` - Test SMS functionality
- `/health` - Basic connectivity check
- Real-time dashboard at root URL

### 🚨 Common Issues & Solutions
1. **Google Calendar Auth**: Check `credentials.json` file
2. **SMS Not Working**: Verify Twilio credentials
3. **Slot Validation Errors**: Check holiday configuration
4. **Order Number Issues**: Verify appointment type settings

---

## Future Enhancement Roadmap

### 📈 Planned Features
- **Patient Portal**: Self-service appointment management
- **Payment Integration**: Online payment processing
- **Advanced Analytics**: Booking patterns and insights
- **Multi-language Support**: English and other languages
- **Mobile App API**: Dedicated mobile application
- **Healthcare System Integration**: HL7/FHIR compatibility

### 🔄 Scalability Improvements
- **Microservices Architecture**: Split into smaller services
- **Database Integration**: Move from Google Calendar to dedicated DB
- **Load Balancing**: Handle higher traffic
- **Advanced Caching**: Improve performance
- **API Versioning**: Maintain backward compatibility

---

## Contact & Support

**Clinic Information**:
- **Name**: Rehacentrum Humenné
- **Location**: Humenné, Slovakia  
- **Hours**: Monday-Friday 7:00-16:00
- **Phone**: +421 XXX XXX XXX

**Technical Support**:
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Maintainer**: Rehacentrum Development Team

---

*This document provides a complete overview of the Rehacentrum appointment booking system. For specific implementation details, refer to the individual source files in the project repository.*
