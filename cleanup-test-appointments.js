const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

async function cleanupTestAppointments() {
  console.log('🧹 CLEANING UP TEST APPOINTMENTS');
  console.log('═'.repeat(50));
  
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
  console.log(`📅 Cleaning appointments for: ${testDate}\n`);
  
  // Note: This would require a special cleanup endpoint or direct database/calendar access
  console.log('⚠️  To clean up test appointments, you can:');
  console.log('   1. Manually delete from Google Calendar');
  console.log('   2. Use the Google Calendar web interface');
  console.log('   3. Create a cleanup endpoint in the API');
  
  console.log('\n💡 Test appointments follow the pattern:');
  console.log('   Patient names: "Test Pacient1_[appointment_type]_[number]"');
  console.log('   Phone numbers: +421901111111 to +421901111120');
  
  console.log('\n📋 To identify test appointments in Google Calendar:');
  console.log('   - Look for patient names starting with "Test"');
  console.log('   - Phone numbers in range +421901111111-120');
  console.log(`   - Appointments scheduled for ${testDate}`);
}

// Run cleanup
if (require.main === module) {
  cleanupTestAppointments()
    .then(() => {
      console.log('\n🎉 Cleanup guidance provided!');
    })
    .catch(error => {
      console.error('\n💥 Cleanup failed:', error);
    });
}

module.exports = { cleanupTestAppointments };