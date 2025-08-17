const config = require('../config/config');
const googleCalendar = require('../services/googleCalendar');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Edge case test appointments for Tuesday, August 19, 2025
const testAppointments = [
  // EDGE CASE 1: Multiple "Ján" with different surnames
  {
    appointmentType: 'konzultacia',
    patientName: 'Ján Novák',
    phone: '+421910111111',
    insurance: 'VšZP',
    dateTime: '2025-08-19T07:30:00',
    duration: 30,
    price: 30,
    colorId: '6'
  },
  {
    appointmentType: 'vstupne_vysetrenie', 
    patientName: 'Ján Harmady',
    phone: '+421910223761',
    insurance: 'Dôvera',
    dateTime: '2025-08-19T08:00:00',
    duration: 30,
    price: 0,
    colorId: '2'
  },
  {
    appointmentType: 'kontrolne_vysetrenie',
    patientName: 'Ján Svoboda', 
    phone: '+421910333333',
    insurance: 'Union',
    dateTime: '2025-08-19T08:30:00',
    duration: 30,
    price: 25,
    colorId: '3'
  },
  
  // EDGE CASE 2: Similar names (transcription errors)
  {
    appointmentType: 'sportova_prehliadka',
    patientName: 'Peter Novotný',
    phone: '+421905444444',
    insurance: 'VšZP', 
    dateTime: '2025-08-19T07:00:00',
    duration: 40,
    price: 130,
    colorId: '1'
  },
  {
    appointmentType: 'konzultacia',
    patientName: 'Peter Novotný',  // Same name, different phone (different person)
    phone: '+421905555555',
    insurance: 'Dôvera',
    dateTime: '2025-08-19T09:00:00', 
    duration: 30,
    price: 30,
    colorId: '6'
  },
  
  // EDGE CASE 3: Partial phone numbers (country code variations)
  {
    appointmentType: 'zdravotnicke_pomucky',
    patientName: 'Mária Kováčová',
    phone: '0910666666', // Without country code
    insurance: 'Union',
    dateTime: '2025-08-19T09:30:00',
    duration: 20,
    price: 15,
    colorId: '4'
  },
  
  // EDGE CASE 4: Voice recognition challenges
  {
    appointmentType: 'vstupne_vysetrenie',
    patientName: 'Žofia Krásna',  // Special characters
    phone: '+421907777777',
    insurance: 'VšZP',
    dateTime: '2025-08-19T10:00:00',
    duration: 30, 
    price: 0,
    colorId: '2'
  },
  
  // EDGE CASE 5: Common first names
  {
    appointmentType: 'konzultacia',
    patientName: 'Anna Nová',
    phone: '+421908888888',
    insurance: 'Dôvera',
    dateTime: '2025-08-19T10:30:00',
    duration: 30,
    price: 30,
    colorId: '6'
  },
  {
    appointmentType: 'kontrolne_vysetrenie', 
    patientName: 'Anna Stará',
    phone: '+421908999999',
    insurance: 'Union',
    dateTime: '2025-08-19T11:00:00',
    duration: 30,
    price: 25,
    colorId: '3'
  }
];

async function generateTestData() {
  console.log('🧪 Generating edge case test data...\n');
  
  try {
    for (const appointment of testAppointments) {
      // Get order number for this appointment type and date
      const date = dayjs(appointment.dateTime).format('YYYY-MM-DD');
      const orderNumber = await googleCalendar.getOrderNumber(appointment.appointmentType, date);
      
      const eventData = {
        ...appointment,
        orderNumber
      };
      
      const event = await googleCalendar.createEvent(eventData);
      
      const typeName = config.appointmentTypes[appointment.appointmentType]?.name || appointment.appointmentType;
      console.log(`✅ Created: ${appointment.patientName} - ${typeName}`);
      console.log(`   📅 ${dayjs(appointment.dateTime).format('DD.MM.YYYY HH:mm')}`);
      console.log(`   📞 ${appointment.phone}`);
      console.log(`   🔢 Order: ${orderNumber}\n`);
    }
    
    console.log('🎉 Test data generation completed!');
    console.log('📋 Created appointments for Tuesday, August 19, 2025');
    console.log('🧪 Edge cases included:');
    console.log('   - Multiple "Ján" with different surnames');
    console.log('   - Identical names with different phones');
    console.log('   - Phone format variations');
    console.log('   - Special characters in names');
    console.log('   - Common first names');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  generateTestData();
}

module.exports = { generateTestData, testAppointments };
