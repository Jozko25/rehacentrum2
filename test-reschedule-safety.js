const axios = require('axios');

const WEBHOOK_URL = 'https://rehacentrum2-production.up.railway.app/api/booking/webhook';

// Critical safety tests
const criticalTests = [
  {
    name: "✅ SAFE: Correct Ján with phone match",
    payload: {
      action: "reschedule_appointment",
      patient_name: "Ján Harmady",
      phone: "+421910223761",
      old_date: "2025-08-19",
      new_date: "2025-08-21", 
      new_time: "09:00"
    },
    expectation: "Should find Ján Harmady's 08:00 vstupne_vysetrenie appointment"
  },
  {
    name: "❌ UNSAFE: Generic 'Ján' with wrong phone",
    payload: {
      action: "reschedule_appointment", 
      patient_name: "Ján",
      phone: "+421999999999",
      old_date: "2025-08-19",
      new_date: "2025-08-21",
      new_time: "09:10"
    },
    expectation: "Should FAIL - don't match any Ján"
  },
  {
    name: "✅ SAFE: Correct Peter with phone disambiguation",
    payload: {
      action: "reschedule_appointment",
      patient_name: "Peter Novotný", 
      phone: "+421905444444",
      old_date: "2025-08-19",
      new_date: "2025-08-21",
      new_time: "07:00"
    },
    expectation: "Should find first Peter (07:00 sportova_prehliadka), not second Peter (09:00)"
  },
  {
    name: "❌ UNSAFE: Mixed patient info",
    payload: {
      action: "reschedule_appointment",
      patient_name: "Ján Novák",  // First Ján's name
      phone: "+421910223761",     // Second Ján's phone
      old_date: "2025-08-19", 
      new_date: "2025-08-21",
      new_time: "09:10"
    },
    expectation: "Should match by PHONE (Ján Harmady), not by name"
  },
  {
    name: "✅ SAFE: Phone format tolerance",
    payload: {
      action: "reschedule_appointment",
      patient_name: "Mária Kováčová",
      phone: "+421910666666",  // Original was 0910666666
      old_date: "2025-08-19",
      new_date: "2025-08-21", 
      new_time: "09:10"
    },
    expectation: "Should find Mária despite phone format difference"
  }
];

async function runSafetyTests() {
  console.log('🚨 RUNNING CRITICAL RESCHEDULE SAFETY TESTS\n');
  console.log('Goal: Ensure NO wrong appointments get rescheduled\n');
  
  for (const test of criticalTests) {
    console.log(`\n🧪 ${test.name}`);
    console.log(`📋 Expectation: ${test.expectation}`);
    console.log(`📤 Sending request...`);
    
    try {
      const response = await axios.post(WEBHOOK_URL, test.payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      const result = response.data;
      
      // Handle both JSON and text responses
      if (typeof result === 'string') {
        console.log(`📝 RESPONSE: ${result}`);
        // Check if response indicates success
        if (result.includes('úspešne') || result.includes('presunutý')) {
          console.log('✅ Appears to be SUCCESS');
        } else if (result.includes('nenašiel') || result.includes('nepodarilo')) {
          console.log('❌ Appears to be FAILURE');
        }
      } else if (result.success) {
        console.log(`✅ SUCCESS: ${result.message}`);
      } else {
        console.log(`❌ FAILED: ${result.error || result.message}`);
      }
      
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
      if (error.response?.data) {
        console.log(`📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log('\n🏁 SAFETY TESTS COMPLETED');
  console.log('\n⚠️  REVIEW RESULTS CAREFULLY:');
  console.log('✅ Tests marked "SAFE" should succeed');
  console.log('❌ Tests marked "UNSAFE" should fail');
  console.log('💥 Any errors need investigation');
  console.log('\n🔍 Verify in Google Calendar that only intended appointments were affected!');
}

// Run tests
runSafetyTests().catch(console.error);
