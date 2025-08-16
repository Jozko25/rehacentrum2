#!/usr/bin/env node

/**
 * Setup test appointments for ElevenLabs voice testing
 * Creates specific appointments that can be used in voice conversation tests
 */

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const config = {
  calendar: {
    calendarId: 'airecepcia@gmail.com',
    timeZone: 'Europe/Bratislava'
  }
};

let calendar;

async function initializeGoogleCalendar() {
  console.log('🔧 Initializing Google Calendar service...');
  
  try {
    let auth;
    
    try {
      const credentials = require('./credentials.json');
      console.log('📁 Using credentials from file (local development)');
      
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    } catch (fileError) {
      console.log('📁 Credentials file not found, using environment variables');
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    }
    
    const authClient = await auth.getClient();
    calendar = google.calendar({ version: 'v3', auth: authClient });
    console.log('✅ Google Calendar service initialized successfully');
    
    return calendar;
  } catch (error) {
    console.error('❌ Failed to initialize Google Calendar:', error.message);
    throw error;
  }
}

async function createTestAppointment(appointmentData) {
  const { patientName, phone, date, time, type, orderNumber } = appointmentData;
  
  const startDateTime = dayjs.tz(`${date}T${time}:00`, config.calendar.timeZone);
  const endDateTime = startDateTime.add(30, 'minute');
  
  const event = {
    summary: `${type} - ${patientName}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: config.calendar.timeZone
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: config.calendar.timeZone
    },
    description: `Pacient: ${patientName}\\nTelefón: ${phone}\\nPoisťovňa: VšZP\\nPoradové číslo: ${orderNumber}`,
    colorId: '1'
  };
  
  try {
    const response = await calendar.events.insert({
      calendarId: config.calendar.calendarId,
      resource: event
    });
    
    console.log(`✅ Created: ${patientName} - ${type}`);
    console.log(`   📅 ${date} ${time}`);
    console.log(`   📞 ${phone}`);
    console.log(`   🔢 Order: ${orderNumber}\\n`);
    
    return response.data.id;
  } catch (error) {
    console.error(`❌ Failed to create appointment for ${patientName}:`, error.message);
    throw error;
  }
}

async function setupVoiceTestingData() {
  console.log('🎤 Setting up ElevenLabs voice testing data...');
  
  try {
    await initializeGoogleCalendar();
    
    // Get dates for testing (next week)
    const monday = dayjs().add(1, 'week').startOf('week').add(1, 'day'); // Next Monday
    const tuesday = monday.add(1, 'day');
    const wednesday = monday.add(2, 'day');
    const thursday = monday.add(3, 'day');
    const friday = monday.add(4, 'day');
    
    console.log(`📅 Setting up test data for week: ${monday.format('DD.MM.YYYY')} - ${friday.format('DD.MM.YYYY')}\\n`);
    
    // Test appointments for voice testing scenarios
    const testAppointments = [
      // For booking tests - these will be available slots
      
      // For cancellation tests - these appointments exist and can be cancelled
      {
        patientName: 'Ján Testovací',
        phone: '+421911111111',
        date: tuesday.format('YYYY-MM-DD'),
        time: '09:00',
        type: 'Vstupné vyšetrenie',
        orderNumber: 1
      },
      {
        patientName: 'Mária Kancelová',
        phone: '+421922222222', 
        date: wednesday.format('YYYY-MM-DD'),
        time: '10:00',
        type: 'Kontrolné vyšetrenie',
        orderNumber: 1
      },
      
      // For reschedule tests - these can be moved
      {
        patientName: 'Peter Presunový',
        phone: '+421933333333',
        date: thursday.format('YYYY-MM-DD'),
        time: '09:30',
        type: 'Vstupné vyšetrenie',
        orderNumber: 1
      },
      {
        patientName: 'Anna Zmenová',
        phone: '+421944444444',
        date: friday.format('YYYY-MM-DD'),
        time: '14:00',
        type: 'Konzultácia',
        orderNumber: 1
      },
      
      // For security tests - patients with similar names
      {
        patientName: 'Ján Novák',
        phone: '+421955555555',
        date: monday.format('YYYY-MM-DD'),
        time: '09:00',
        type: 'Vstupné vyšetrenie',
        orderNumber: 1
      },
      {
        patientName: 'Ján Svoboda',
        phone: '+421966666666',
        date: monday.format('YYYY-MM-DD'),
        time: '09:10',
        type: 'Vstupné vyšetrenie', 
        orderNumber: 2
      },
      
      // Special characters test
      {
        patientName: 'Žofia Kráľová',
        phone: '+421977777777',
        date: tuesday.format('YYYY-MM-DD'),
        time: '14:30',
        type: 'Konzultácia',
        orderNumber: 1
      }
    ];
    
    console.log('📝 Creating test appointments...\\n');
    
    for (const appointment of testAppointments) {
      await createTestAppointment(appointment);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🎉 Voice testing data setup completed!');
    console.log('\\n📋 Created appointments:');
    console.log('- Cancellation tests: Ján Testovací, Mária Kancelová');
    console.log('- Reschedule tests: Peter Presunový, Anna Zmenová');
    console.log('- Security tests: Ján Novák, Ján Svoboda');
    console.log('- Special chars: Žofia Kráľová');
    console.log('\\n🎤 Ready for ElevenLabs voice testing!');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupVoiceTestingData();
}

module.exports = { setupVoiceTestingData };