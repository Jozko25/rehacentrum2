const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  
  // Google Calendar Configuration
  calendar: {
    credentials: path.join(__dirname, 'credentials.json'),
    calendarId: 'airecepcia@gmail.com',
    timeZone: 'Europe/Bratislava'
  },
  
  // Twilio SMS Configuration (toggleable)
  sms: {
    enabled: process.env.TWILIO_ENABLED === 'true',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+12678638448'
  },
  
  // Appointment Types Configuration
  appointmentTypes: {
    sportova_prehliadka: {
      name: 'Športová prehliadka',
      schedule: [
        { start: '07:00', end: '08:40', interval: 20 }
      ],
      dailyLimit: 5,
      duration: 20,
      price: 130,
      currency: 'EUR',
      insurance: false,
      color: '11',
      requirements: [
        'Fasting (8 hours before examination)',
        'Bring food and water for after examination',
        'Sports clothes and towel',
        'Cash payment required (130€)'
      ],
      orderNumbers: false,
      smsTemplate: 'Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, cena 130€, nalačno, prineste jedlo/vodu, veci na prezlečenie. Rehacentrum Humenné'
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
      color: '1',
      requirements: [
        'Referral slip (mandatory)',
        'Previous medical reports if available',
        'Insurance card'
      ],
      orderNumbers: true,
      smsTemplate: 'Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, vstupné vyšetrenie, hradené poisťovňou. Vaše poradové číslo je {order_number}. Rehacentrum Humenné'
    },
    
    kontrolne_vysetrenie: {
      name: 'Kontrolné vyšetrenie',
      schedule: [
        { start: '09:00', end: '11:30', interval: 10 },
        { start: '13:00', end: '15:00', interval: 10 }
      ],
      dailyLimit: 50,
      duration: 30,
      price: 0,
      currency: 'EUR',
      insurance: true,
      color: '2',
      requirements: [
        'Insurance card',
        'Latest test results and medical reports',
        'Previous examination documentation'
      ],
      orderNumbers: true,
      smsTemplate: 'Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, kontrolné vyšetrenie, hradené poisťovňou. Vaše poradové číslo je {order_number}. Rehacentrum Humenné'
    },
    
    zdravotnicke_pomocky: {
      name: 'Zdravotnícke pomôcky',
      schedule: [
        { start: '09:00', end: '11:30', interval: 10 },
        { start: '13:00', end: '15:00', interval: 10 }
      ],
      dailyLimit: 10,
      duration: 30,
      price: 0,
      currency: 'EUR',
      insurance: true,
      color: '3',
      requirements: [
        'Medical reports',
        'Old aids for inspection if applicable',
        'Insurance card'
      ],
      orderNumbers: true,
      smsTemplate: 'Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, zdravotnícke pomôcky, hradené poisťovňou. Vaše poradové číslo je {order_number}. Rehacentrum Humenné'
    },
    
    konzultacia: {
      name: 'Konzultácia',
      schedule: [
        { start: '07:30', end: '09:00', interval: 10 },
        { start: '15:00', end: '16:00', interval: 10 }
      ],
      dailyLimit: 20,
      duration: 30,
      price: 30,
      currency: 'EUR',
      insurance: false,
      color: '4',
      requirements: [
        'Cash payment (30€)',
        'Medical documents if available'
      ],
      orderNumbers: true,
      smsTemplate: 'Dobrý deň {patient_name}, Váš termín bol rezervovaný na {date_short} o {time}, konzultácia, cena 30€. Vaše poradové číslo je {order_number}. Rehacentrum Humenné'
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
    minAdvanceBooking: 1, // hours
    maxAdvanceBooking: 30 // days
  },
  
  // Patient Data Validation
  validation: {
    requiredFields: ['name', 'surname', 'phone', 'insurance'],
    optionalFields: ['email', 'birthId'],
    phoneFormat: /^\+421\d{9}$/
  }
};

module.exports = config;