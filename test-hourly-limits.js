const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('./config/config');

dayjs.extend(utc);
dayjs.extend(timezone);

console.log('🧪 HOURLY LIMITS TEST CONFIGURATION');
console.log('═'.repeat(60));

// Display the hourly limits configuration
console.log('⚡ HOURLY LIMITS CONFIG:');
console.log(`   Enabled: ${config.businessRules.hourlyLimits.enabled}`);
console.log(`   Max patients per hour: ${config.businessRules.hourlyLimits.maxPatientsPerHour}`);
console.log(`   Applicable hours: ${config.businessRules.hourlyLimits.applicableHours.map(h => `${h.start}-${h.end}`).join(', ')}`);
console.log(`   Excluded types: ${config.businessRules.hourlyLimits.excludedTypes.join(', ')}`);
console.log(`   Orientative phrase: "${config.businessRules.hourlyLimits.orientativeTimePhrase}"`);

console.log('\n📋 APPOINTMENT TYPES AFFECTED BY HOURLY LIMITS:');
Object.keys(config.appointmentTypes).forEach(key => {
  const apt = config.appointmentTypes[key];
  const isExcluded = config.businessRules.hourlyLimits.excludedTypes.includes(key);
  const affectedHours = [];
  
  // Check which of this appointment's scheduled hours overlap with hourly limit hours
  apt.schedule.forEach(schedule => {
    config.businessRules.hourlyLimits.applicableHours.forEach(limitHour => {
      const schedStart = dayjs(`2000-01-01 ${schedule.start}`);
      const schedEnd = dayjs(`2000-01-01 ${schedule.end}`);
      const limitStart = dayjs(`2000-01-01 ${limitHour.start}`);
      const limitEnd = dayjs(`2000-01-01 ${limitHour.end}`);
      
      // Check if there's any overlap
      if (schedStart.isBefore(limitEnd) && schedEnd.isAfter(limitStart)) {
        const overlapStart = schedStart.isAfter(limitStart) ? schedStart : limitStart;
        const overlapEnd = schedEnd.isBefore(limitEnd) ? schedEnd : limitEnd;
        affectedHours.push(`${overlapStart.format('HH:mm')}-${overlapEnd.format('HH:mm')}`);
      }
    });
  });
  
  console.log(`\n🔸 ${apt.name} (${key}):`);
  console.log(`   Excluded from hourly limits: ${isExcluded ? '✅ YES' : '❌ NO'}`);
  console.log(`   Affected hours: ${affectedHours.length > 0 ? affectedHours.join(', ') : 'None'}`);
  if (!isExcluded && affectedHours.length > 0) {
    console.log(`   ⚠️  Will be LIMITED to ${config.businessRules.hourlyLimits.maxPatientsPerHour} patients/hour during ${affectedHours.join(', ')}`);
  }
});

console.log('\n' + '═'.repeat(60));
console.log('🎯 TESTING SCENARIOS FOR HOURLY LIMITS:');
console.log('═'.repeat(60));

const testDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
console.log(`Test Date: ${testDate} (${dayjs().add(1, 'day').format('dddd')})\n`);

// Generate test scenarios for each applicable hour
const testScenarios = [];

config.businessRules.hourlyLimits.applicableHours.forEach(timeRange => {
  let currentHour = dayjs(`${testDate} ${timeRange.start}`, 'YYYY-MM-DD HH:mm');
  const endTime = dayjs(`${testDate} ${timeRange.end}`, 'YYYY-MM-DD HH:mm');
  
  while (currentHour.isBefore(endTime)) {
    const hourString = currentHour.format('HH:mm');
    const hourEnd = currentHour.add(1, 'hour');
    
    // Don't test partial hours at the end of time ranges
    if (hourEnd.isAfter(endTime)) {
      break;
    }
    
    testScenarios.push({
      hour: hourString,
      hourFormatted: currentHour.format('HH:00'),
      timeRange: `${currentHour.format('HH:mm')}-${hourEnd.format('HH:mm')}`
    });
    
    currentHour = currentHour.add(1, 'hour');
  }
});

console.log('📊 HOURLY TEST SCENARIOS:');
testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. Test Hour ${scenario.timeRange}:`);
  console.log(`   - Create ${config.businessRules.hourlyLimits.maxPatientsPerHour} ordinary appointments`);
  console.log(`   - Verify ${config.businessRules.hourlyLimits.maxPatientsPerHour + 1}th appointment is rejected`);
  console.log(`   - Test with: vstupne_vysetrenie, kontrolne_vysetrenie, zdravotnicke_pomocky`);
  console.log(`   - Verify: sportova_prehliadka & konzultacia are NOT affected by this limit`);
});

console.log('\n' + '═'.repeat(60));
console.log('🚀 READY FOR HOURLY LIMITS TESTING');
console.log('═'.repeat(60));
console.log('✅ Configuration loaded successfully');
console.log('✅ Test scenarios planned');
console.log(`✅ SMS disabled (${config.sms.enabled ? 'ENABLED - ⚠️ WARNING' : 'disabled - safe'})`);

console.log('\n💡 To test:');
console.log('   1. Start server: npm start');
console.log('   2. Run: node create-hourly-test-appointments.js');
console.log('   3. Verify: node verify-hourly-limits.js');

// Export configuration for other test files
module.exports = {
  testScenarios,
  testDate,
  maxPatientsPerHour: config.businessRules.hourlyLimits.maxPatientsPerHour,
  config
};