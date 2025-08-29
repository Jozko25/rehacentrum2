const path = require('path');
const { smsConfig } = require('./sms-config');

const config = {
  port: process.env.PORT || 3000,
  
  // Google Calendar Configuration
  calendar: {
    credentials: path.join(__dirname, 'credentials.json'), // Fallback path
    calendarId: '1rehacentrum@gmail.com',
    timeZone: 'Europe/Bratislava'
  },
  
  // Twilio SMS Configuration (toggleable)
  sms: {
    enabled: process.env.TWILIO_ENABLED === 'true',
    accountSid: process.env.TWILIO_ACTUAL_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+12678638448',
    // SMS templates are configured in sms-config.js
    config: smsConfig
  },
  
  // Appointment Types Configuration
  appointmentTypes: {
    sportova_prehliadka: {
      name: 'Športová prehliadka',
      schedule: [
        { start: '07:00', end: '08:40', interval: 20 }
      ],
      dailyLimit: 6,
      duration: 20,
      price: 130,
      currency: 'EUR',
      insurance: false,
      color: '11', // Red for sports
      requirements: [
        'Fasting (8 hours before examination)',
        'Bring food and water for after examination',
        'Sports clothes and towel',
        'Cash payment required (130€)'
      ],
      orderNumbers: false
    },
    
    vstupne_vysetrenie: {
      name: 'Vstupné vyšetrenie',
      schedule: [
        { start: '09:00', end: '11:30', interval: 10 },
        { start: '13:00', end: '15:00', interval: 10 }
      ],
      dailyLimit: 50,
      duration: 30,
      price: 0,
      currency: 'EUR',
      insurance: true,
      color: '1', // Blue for vstupne_vysetrenie
      requirements: [
        'Referral slip (mandatory)',
        'Previous medical reports if available',
        'Insurance card'
      ],
      orderNumbers: true
    },
    
    kontrolne_vysetrenie: {
      name: 'Kontrolné vyšetrenie',
      schedule: [
        { start: '09:00', end: '11:30', interval: 10 },
        { start: '13:00', end: '14:20', interval: 10 }
      ],
      dailyLimit: 50,
      duration: 30,
      price: 0,
      currency: 'EUR',
      insurance: true,
      color: '1', // Blue for kontrolne_vysetrenie
      requirements: [
        'Insurance card',
        'Latest test results and medical reports',
        'Previous examination documentation'
      ],
      orderNumbers: true
    },
    
    zdravotnicke_pomocky: {
      name: 'Zdravotnícke pomôcky',
      schedule: [
        { start: '09:00', end: '11:30', interval: 10 },
        { start: '13:00', end: '14:20', interval: 10 }
      ],
      dailyLimit: 1, // FIXED: Only 1 zdravotnicke_pomocky appointment per day
      duration: 30,
      price: 0,
      currency: 'EUR',
      insurance: true,
      color: '1', // Blue for zdravotnicke_pomocky
      requirements: [
        'Medical reports',
        'Old aids for inspection if applicable',
        'Insurance card'
      ],
      orderNumbers: true
    },
    
    konzultacia: {
      name: 'Konzultácia',
      schedule: [
        { start: '14:30', end: '15:00', interval: 10 }
      ],
      dailyLimit: 3,
      duration: 30,
      price: 30,
      currency: 'EUR',
      insurance: false,
      color: '1', // Blue for konzultacia
      requirements: [
        'Cash payment (30€)',
        'Medical documents if available'
      ],
      orderNumbers: false
    }
  },
  
  // Business Rules
  businessRules: {
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    workingHours: {
      start: '07:00',
      end: '16:00'
    },
    vacationKeyword: 'DOVOLENKA',
    minAdvanceBooking: 0, // hours - DISABLED to allow immediate booking
    maxAdvanceBooking: 30, // days
    
    // Hourly patient limits for ordinary hours
    hourlyLimits: {
      enabled: false, // TEMPORARILY DISABLED FOR DEBUGGING
      maxPatientsPerHour: 6,
      applicableHours: [
        { start: '09:00', end: '11:30' }, // Morning ordinary hours
        { start: '13:00', end: '15:00' }  // Afternoon ordinary hours
      ],
      // Exclude specific appointment types from hourly limits
      excludedTypes: ['sportova_prehliadka', 'konzultacia'],
      orientativeTimePhrase: 'čas je orientačný'
    }
  },
  
  // Patient Data Validation
  validation: {
    requiredFields: ['name', 'surname', 'phone', 'insurance'],
    optionalFields: ['email', 'birthId'],
    phoneFormat: /^\+421\d{9}$/
  }
};

module.exports = config;