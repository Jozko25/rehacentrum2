const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('./config/config');

dayjs.extend(utc);
dayjs.extend(timezone);

async function checkAvailableSlots() {
  console.log('🔍 VERIFYING DAILY LIMITS BY CHECKING AVAILABLE SLOTS');
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
    return;
  }
  
  const testDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  console.log(`📅 Checking Date: ${testDate} (${dayjs().add(1, 'day').format('dddd')})\n`);
  
  // Check available slots for each appointment type
  for (const [appointmentType, appointmentConfig] of Object.entries(config.appointmentTypes)) {
    console.log(`\n🔸 CHECKING: ${appointmentConfig.name}`);
    console.log('─'.repeat(40));
    
    try {
      const response = await fetch('http://localhost:3000/api/booking/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_available_slots',
          date: testDate,
          appointment_type: appointmentType
        })
      });
      
      const result = await response.text();
      
      if (response.ok) {
        console.log(`   📊 Server Response: ${result}`);
        
        // Parse the response to count available slots
        if (result.includes('nie sú dostupné žiadne voľné termíny')) {
          console.log(`   🎯 Status: NO AVAILABLE SLOTS (Daily limit reached)`);
        } else if (result.includes('dostupné tieto termíny')) {
          // Count mentioned times in the response
          const timePattern = /\d{1,2}:\d{2}/g;
          const times = result.match(timePattern) || [];
          console.log(`   📈 Available slots found: ${times.length}`);
          console.log(`   🕐 Times: ${times.join(', ')}`);
        } else {
          console.log(`   ⚠️  Unexpected response format`);
        }
      } else {
        console.log(`   ❌ Error: ${result}`);
      }
    } catch (error) {
      console.log(`   💥 Request failed: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 AVAILABLE SLOTS VERIFICATION COMPLETED');
  console.log('═'.repeat(60));
}

async function getClosestSlots() {
  console.log('\n🎯 TESTING FIND_CLOSEST_SLOT FOR EACH APPOINTMENT TYPE');
  console.log('═'.repeat(60));
  
  for (const [appointmentType, appointmentConfig] of Object.entries(config.appointmentTypes)) {
    console.log(`\n🔸 CLOSEST SLOT FOR: ${appointmentConfig.name}`);
    console.log('─'.repeat(40));
    
    try {
      const response = await fetch('http://localhost:3000/api/booking/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'find_closest_slot',
          appointment_type: appointmentType,
          days_to_search: 7
        })
      });
      
      const result = await response.text();
      console.log(`   🎯 Closest available: ${result}`);
    } catch (error) {
      console.log(`   💥 Request failed: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Summary of what to look for
function printTestingSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 WHAT TO LOOK FOR IN TEST RESULTS:');
  console.log('═'.repeat(60));
  
  Object.keys(config.appointmentTypes).forEach(key => {
    const apt = config.appointmentTypes[key];
    console.log(`\n✅ ${apt.name} (Daily Limit: ${apt.dailyLimit}):`);
    
    if (apt.dailyLimit === 1) {
      console.log(`   - Should show NO available slots after 1 booking`);
    } else if (apt.dailyLimit === 5) {
      console.log(`   - Should show NO available slots after 5 bookings`);
    } else if (apt.dailyLimit >= 20) {
      console.log(`   - Should still have available slots (high limit)`);
    }
    
    console.log(`   - Closest slot should be ${apt.dailyLimit >= 20 ? 'soon' : 'far in future or unavailable'}`);
  });
  
  console.log('\n🎯 KEY TESTS:');
  console.log('   1. Zdravotnícke pomôcky should be FULLY BOOKED (limit=1)');
  console.log('   2. Športová prehliadka should be FULLY BOOKED (limit=5)'); 
  console.log('   3. Other types may still have availability (higher limits)');
}

// Run verification
if (require.main === module) {
  console.log('🔍 STARTING DAILY LIMITS VERIFICATION...\n');
  
  checkAvailableSlots()
    .then(() => getClosestSlots())
    .then(() => {
      printTestingSummary();
      console.log('\n🎉 Verification completed successfully!');
    })
    .catch(error => {
      console.error('\n💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAvailableSlots, getClosestSlots };