const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('./config/config');

dayjs.extend(utc);
dayjs.extend(timezone);

// Test patient data
const testPatients = [
  { name: 'Test', surname: 'Pacient1', phone: '+421901111111', insurance: 'VšZP' },
  { name: 'Test', surname: 'Pacient2', phone: '+421901111112', insurance: 'Dôvera' },
  { name: 'Test', surname: 'Pacient3', phone: '+421901111113', insurance: 'Union' },
  { name: 'Test', surname: 'Pacient4', phone: '+421901111114', insurance: 'VšZP' },
  { name: 'Test', surname: 'Pacient5', phone: '+421901111115', insurance: 'Dôvera' },
  { name: 'Test', surname: 'Pacient6', phone: '+421901111116', insurance: 'Union' },
  { name: 'Test', surname: 'Pacient7', phone: '+421901111117', insurance: 'VšZP' },
  { name: 'Test', surname: 'Pacient8', phone: '+421901111118', insurance: 'Dôvera' },
  { name: 'Test', surname: 'Pacient9', phone: '+421901111119', insurance: 'Union' },
  { name: 'Test', surname: 'Pacient10', phone: '+421901111120', insurance: 'VšZP' },
];

async function createTestBooking(appointmentType, dateTime, patientInfo) {
  console.log(`📅 Creating: ${appointmentType} on ${dateTime} for ${patientInfo.name} ${patientInfo.surname}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/booking/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'book_appointment',
        appointment_type: appointmentType,
        date_time: dateTime,
        patient_name: patientInfo.name,
        patient_surname: patientInfo.surname,
        phone: patientInfo.phone,
        insurance: patientInfo.insurance
      })
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS: ${result}`);
      return { success: true, message: result };
    } else {
      console.log(`   ❌ FAILED: ${result}`);
      return { success: false, message: result };
    }
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testDailyLimits() {
  console.log('🧪 TESTING DAILY LIMITS FOR ALL APPOINTMENT TYPES');
  console.log('═'.repeat(60));
  
  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3000/');
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running and accessible\n');
  } catch (error) {
    console.log('❌ SERVER NOT RUNNING! Please start the server first:');
    console.log('   npm start');
    console.log('   or');
    console.log('   node server.js');
    return;
  }
  
  const testDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  console.log(`📅 Test Date: ${testDate} (${dayjs().add(1, 'day').format('dddd')})\n`);
  
  // Test each appointment type
  for (const [appointmentType, appointmentConfig] of Object.entries(config.appointmentTypes)) {
    console.log(`\n🔸 TESTING: ${appointmentConfig.name} (Daily Limit: ${appointmentConfig.dailyLimit})`);
    console.log('─'.repeat(50));
    
    // Get available time slots for this appointment type
    const timeSlots = [];
    appointmentConfig.schedule.forEach(schedule => {
      let currentTime = dayjs(`${testDate} ${schedule.start}`, 'YYYY-MM-DD HH:mm');
      const endTime = dayjs(`${testDate} ${schedule.end}`, 'YYYY-MM-DD HH:mm');
      
      while (currentTime.isBefore(endTime)) {
        timeSlots.push(currentTime.format());
        currentTime = currentTime.add(schedule.interval, 'minute');
      }
    });
    
    console.log(`📊 Available time slots: ${timeSlots.length}`);
    console.log(`⚠️  Daily limit: ${appointmentConfig.dailyLimit}`);
    
    // Create appointments up to the limit
    let successfulBookings = 0;
    let failedBookings = 0;
    
    // Try to book one more than the daily limit to test the restriction
    const testCount = Math.min(appointmentConfig.dailyLimit + 1, testPatients.length, timeSlots.length);
    
    for (let i = 0; i < testCount; i++) {
      const patient = testPatients[i % testPatients.length];
      const timeSlot = timeSlots[i % timeSlots.length];
      
      console.log(`\n   ${i + 1}/${testCount}: Testing appointment ${i + 1}`);
      const result = await createTestBooking(appointmentType, timeSlot, {
        ...patient,
        surname: `${patient.surname}_${appointmentType}_${i + 1}`
      });
      
      if (result.success) {
        successfulBookings++;
      } else {
        failedBookings++;
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📈 RESULTS for ${appointmentConfig.name}:`);
    console.log(`   ✅ Successful bookings: ${successfulBookings}`);
    console.log(`   ❌ Failed bookings: ${failedBookings}`);
    console.log(`   🎯 Expected limit: ${appointmentConfig.dailyLimit}`);
    
    if (successfulBookings <= appointmentConfig.dailyLimit) {
      console.log(`   🎉 ✅ DAILY LIMIT WORKING CORRECTLY!`);
    } else {
      console.log(`   🚨 ❌ DAILY LIMIT NOT WORKING - TOO MANY BOOKINGS ALLOWED!`);
    }
    
    // Brief pause between appointment types
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 DAILY LIMITS TESTING COMPLETED');
  console.log('═'.repeat(60));
  console.log('💡 Check your Google Calendar to verify the appointments were created');
  console.log('💡 Run the server logs to see detailed booking information');
}

// Only run if called directly
if (require.main === module) {
  console.log('🚀 STARTING APPOINTMENT BOOKING TESTS...\n');
  
  // Verify SMS is disabled
  if (process.env.TWILIO_ENABLED === 'true') {
    console.log('⚠️  WARNING: SMS is ENABLED! This will send real SMS messages.');
    console.log('   Set TWILIO_ENABLED=false to disable SMS for testing.');
    console.log('   Exiting to prevent SMS charges...');
    process.exit(1);
  }
  
  console.log('✅ SMS is disabled - safe to proceed with testing');
  
  testDailyLimits()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestBooking, testDailyLimits };