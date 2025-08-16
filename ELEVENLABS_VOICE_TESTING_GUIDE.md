# 🎤 ELEVENLABS VOICE TESTING GUIDE

**Complete conversation scripts for testing your Rehacentrum booking agent**

---

## 🚀 QUICK START

### 1. Setup Test Data
```bash
cd /Users/janharmady/Desktop/rehacentrum2
node setup-voice-testing-data.js
```
This creates test appointments you can cancel/reschedule during voice testing.

### 2. Test Your Agent
Call your ElevenLabs phone number and use the conversation scripts below.

### 3. Verify Results
Check your Google Calendar after each test to confirm the agent worked correctly.

---

## 📋 TESTING CHECKLIST

Use this checklist to track your testing progress:

- [ ] **Booking Tests** (6 scenarios)
- [ ] **Cancellation Tests** (4 scenarios)  
- [ ] **Reschedule Tests** (5 scenarios)
- [ ] **Security Tests** (4 scenarios)
- [ ] **Edge Cases** (8 scenarios)
- [ ] **Error Handling** (5 scenarios)

---

## 🎯 1. BOOKING TESTS

### 📞 Test 1.1: Perfect Booking (Should Work)
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Dobrý deň, chcel by som si objednať termín"

Agent: "Aký typ vyšetrenia potrebujete?"
You: "Vstupné vyšetrenie"

Agent: "Na aký dátum a čas by ste mali záujem?"
You: "Na budúci pondelok o deviatej ráno"

Agent: "Ako sa voláte a aké je vaše telefónne číslo?"
You: "Volám sa Milan Nový, telefón plus štyri dva jedna deväť osem osem nula nula jeden dva tri"

Agent: "Aká je vaša poisťovňa?"
You: "VšZP"

✅ Expected: Successful booking with SMS confirmation
📋 Verify: Check calendar for "Milan Nový" appointment
```

### 📞 Test 1.2: Sports Examination (Paid)
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Potrebujem športovú prehliadku"

Agent: "Na aký dátum a čas?"
You: "Na utorok o siedmej ráno"

Agent: "Ako sa voláte a telefón?"
You: "Eva Športová, plus štyri dva jedna deväť osem osem nula nula dva tri štyri"

✅ Expected: Booking + price info (130€) + requirements (nalačno, jedlo/voda)
📋 Verify: Check calendar and SMS with fasting instructions
```

### 📞 Test 1.3: Consultation Booking
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem konzultáciu"

Agent: "Na aký dátum a čas?"
You: "Na stredu popoludní o tretej"

Agent: "Meno a telefón?"
You: "Tomáš Poradný, plus štyri dva jedna deväť osem osem nula nula tri štyri päť"

✅ Expected: Booking + price info (30€)
📋 Verify: Check calendar for afternoon slot (15:00)
```

### 📞 Test 1.4: Weekend Booking (Should Fail)
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem termín na vstupné vyšetrenie"

Agent: "Na aký dátum?"
You: "Na sobotu"

❌ Expected: "Pracujeme iba v pracovných dňoch" or similar rejection
📋 Verify: No appointment created
```

### 📞 Test 1.5: Invalid Appointment Type
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Potrebujem röntgen"

❌ Expected: Agent explains available appointment types
📋 Verify: Agent lists: vstupné vyšetrenie, kontrolné vyšetrenie, športová prehliadka, konzultácia, zdravotnícke pomôcky
```

### 📞 Test 1.6: Missing Information Recovery
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem termín"

Agent: "Aký typ vyšetrenia?"
You: "Neviem"

Agent: "Na aký dátum?"
You: "Zajtra"

Agent: "Meno a telefón?"
You: "Ján" (no surname or phone)

❌ Expected: Agent asks for missing information step by step
📋 Verify: Agent requires complete information before booking
```

---

## 🗑️ 2. CANCELLATION TESTS

### 📞 Test 2.1: Perfect Cancellation
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem zrušiť môj termín"

Agent: "Ako sa voláte a telefón?"
You: "Ján Testovací, plus štyri dva jedna deväť jeden jeden jeden jeden jeden jeden"

Agent: "Na aký dátum máte termín?"
You: "Na utorok"

✅ Expected: Finds and cancels appointment
📋 Verify: "Ján Testovací" appointment removed from calendar
```

### 📞 Test 2.2: Non-existent Appointment
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem zrušiť termín"

Agent: "Meno a telefón?"
You: "Neexistujúci Pacient, plus štyri dva jedna deväť deväť deväť deväť deväť deväť deväť deväť deväť"

Agent: "Dátum termínu?"
You: "Na zajtra"

❌ Expected: "Termín sa nenašiel" - no appointment found
📋 Verify: No changes to calendar
```

### 📞 Test 2.3: Wrong Phone Number
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Ruším termín"

Agent: "Meno a telefón?"
You: "Mária Kancelová, plus štyri dva jedna osem osem osem osem osem osem osem osem osem" (wrong phone)

Agent: "Dátum?"
You: "Na stredu"

❌ Expected: Phone mismatch detected, appointment not found
📋 Verify: Mária Kancelová's appointment still exists
```

### 📞 Test 2.4: Ambiguous Date
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Zrušiť termín"

Agent: "Meno a telefón?"
You: "Mária Kancelová, plus štyri dva jedna deväť dva dva dva dva dva dva dva dva dva"

Agent: "Dátum?"
You: "V stredu" (ambiguous - which Wednesday?)

❌ Expected: Agent asks for specific date
📋 Verify: Agent requests clarification
```

---

## 🔄 3. RESCHEDULE TESTS

### 📞 Test 3.1: Perfect Reschedule
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem prehodiť termín"

Agent: "Meno a telefón?"
You: "Peter Presunový, plus štyri dva jedna deväť tri tri tri tri tri tri tri tri tri"

Agent: "Pôvodný dátum a nový dátum s časom?"
You: "Mám termín vo štvrtok o pol desiatej a chcem ho presunúť na piatok o osmej ráno"

✅ Expected: Successful reschedule
📋 Verify: Peter's appointment moved from Thursday 09:30 to Friday 08:00
```

### 📞 Test 3.2: Security Test - Generic Name (CRITICAL)
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Presunúť termín"

Agent: "Meno a telefón?"
You: "Ján, plus štyri dva jedna deväť deväť deväť deväť deväť deväť deväť deväť deväť" (wrong phone)

🚨 Expected: "Pre bezpečnosť potrebujem celé meno a priezvisko"
📋 Verify: No appointments moved, security protection working
```

### 📞 Test 3.3: Conflicting New Time
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Prehodiť termín"

Agent: "Meno a telefón?"
You: "Anna Zmenová, plus štyri dva jedna deväť štyri štyri štyri štyri štyri štyri štyri štyri štyri"

Agent: "Pôvodný a nový termín?"
You: "Z piatku o druhej na pondelok o deviatej" (already occupied)

❌ Expected: "Termín je obsadený" - suggests alternatives
📋 Verify: Anna's appointment unchanged, alternatives offered
```

### 📞 Test 3.4: Weekend Reschedule (Should Fail)
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Zmeniť termín"

Agent: "Meno a telefón?"
You: "Peter Presunový, plus štyri dva jedna deväť tri tri tri tri tri tri tri tri tri"

Agent: "Pôvodný a nový termín?"
You: "Zo štvrtku na sobotu ráno"

❌ Expected: Weekend rejection
📋 Verify: Appointment stays on Thursday
```

### 📞 Test 3.5: Cross-Type Reschedule
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Presunúť termín"

Agent: "Meno a telefón?"
You: "Anna Zmenová, plus štyri dva jedna deväť štyri štyri štyri štyri štyri štyri štyri štyri štyri"

Agent: "Odkedy a kam?"
You: "Z piatku konzultácie na utorok na vstupné vyšetrenie o deviatej"

❌ Expected: Cannot change appointment type, only time/date
📋 Verify: Original consultation appointment preserved
```

---

## 🛡️ 4. SECURITY TESTS (CRITICAL)

### 📞 Test 4.1: Multiple "Ján" Disambiguation
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Zrušiť termín"

Agent: "Meno a telefón?"
You: "Ján Novák, plus štyri dva jedna deväť päť päť päť päť päť päť päť päť päť"

Agent: "Dátum?"
You: "V pondelok"

✅ Expected: Finds correct "Ján Novák" by phone
📋 Verify: Only Ján Novák (not Ján Svoboda) appointment affected
```

### 📞 Test 4.2: Wrong Patient Protection
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Zrušiť termín"

Agent: "Meno a telefón?"
You: "Ján Novák, plus štyri dva jedna deväť šesť šesť šesť šesť šesť šesť šesť šesť šesť" (Ján Svoboda's phone)

🚨 Expected: Security mismatch detected - no cancellation
📋 Verify: Both Ján appointments remain untouched
```

### 📞 Test 4.3: Partial Name with Wrong Phone
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Prehodiť termín"

Agent: "Meno a telefón?"
You: "Ján, plus štyri dva jedna nula nula nula nula nula nula nula nula nula" (generic name + wrong phone)

🚨 Expected: Generic name rejection
📋 Verify: "Pre bezpečnosť potrebujem celé meno a priezvisko"
```

### 📞 Test 4.4: Similar Names Security
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Zrušiť môj termín"

Agent: "Meno a telefón?"
You: "Ján, plus štyri dva jedna deväť päť päť päť päť päť päť päť päť päť" (partial name but correct phone)

✅ Expected: Finds appointment by phone match
📋 Verify: Correct Ján Novák appointment cancelled
```

---

## 🎭 5. EDGE CASES & CHALLENGES

### 📞 Test 5.1: Slovak Date Formats
```
Agent: "Na aký dátum?"
You (try each): 
- "Piateho septembra"
- "Piatok pätnásteho"  
- "Budúci piatok"
- "Pätnásteho deviateho"

✅ Expected: All formats recognized correctly
📋 Verify: Correct dates parsed (15.09.2025)
```

### 📞 Test 5.2: Time Variations
```
Agent: "Aký čas?"
You (try each):
- "O deviatej"
- "O deväť hodín" 
- "Ráno o deviatej"
- "Deväť nula nula"
- "Pol desiatej" (9:30)

✅ Expected: All time formats understood
📋 Verify: Correct times (09:00, 09:30) parsed
```

### 📞 Test 5.3: Phone Number Variations
```
Agent: "Telefónne číslo?"
You (try each):
- "Plus štyri dva jedna deväť osem osem jeden dva tri štyri päť šesť"
- "Nula deväť osem osem jeden dva tri štyri päť šesť" (should add +421)
- "Deväťsto osemdesiat osem jeden dva tri štyri päť šesť"

✅ Expected: All formats normalized to +421988123456
📋 Verify: Consistent phone format in calendar
```

### 📞 Test 5.4: Special Characters in Names
```
Agent: "Ako sa voláte?"
You: "Žofia Kráľová, plus štyri dva jedna deväť sedem sedem sedem sedem sedem sedem sedem sedem sedem"

Agent: "Aký termín?"
You: "Zrušiť termín na utorok"

✅ Expected: Special characters handled correctly
📋 Verify: "Žofia Kráľová" appointment found and cancelled
```

### 📞 Test 5.5: Interruptions and Corrections
```
Agent: "Meno a telefón?"
You: "Volám sa Peter... vlastne Tomáš Opravený, telefón plus štyri dva jedna deväť osem osem nula dva tri štyri päť šesť"

✅ Expected: Uses corrected name "Tomáš Opravený"
📋 Verify: Appointment booked with final name
```

### 📞 Test 5.6: Insurance Confusion
```
Agent: "Poisťovňa?"
You: "Mám dôveru" (could mean trust or Dôvera insurance)

Agent: (should clarify)
You: "Dôvera poisťovňa"

✅ Expected: Recognizes "Dôvera" as insurance company
📋 Verify: Calendar shows "Dôvera" as insurance
```

### 📞 Test 5.7: Background Noise Simulation
```
Call in noisy environment and test:
- Booking with background noise
- Speaking unclearly 
- Agent asking for repetition

✅ Expected: Agent handles unclear audio gracefully
📋 Verify: Asks for repetition when unclear
```

### 📞 Test 5.8: Long Conversation Recovery
```
Start booking, get interrupted, continue:

Agent: "Meno a telefón?"
You: "Chvíľu... môžem vám zavolať neskôr?"
You: "Vlastne nie, pokračujme... Petra Dlhá, telefón..."

✅ Expected: Agent continues conversation naturally
📋 Verify: Booking completed despite interruption
```

---

## ❌ 6. ERROR HANDLING TESTS

### 📞 Test 6.1: System Overload Response
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Termín na zajtra na zajtra na zajtra na vstupné vyšetrenie konzultácia športová prehliadka" (confusing request)

❌ Expected: Agent asks for clarification
📋 Verify: Agent doesn't crash, asks clear questions
```

### 📞 Test 6.2: Very Long Names
```
Agent: "Meno?"
You: "Maximilian Alexander Ferdinand von Habsburg-Lothringen-Bonaparte-Windisch-Graetz"

✅ Expected: Handles long names gracefully
📋 Verify: Full name stored in calendar
```

### 📞 Test 6.3: Rapid Fire Information
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Vstupné vyšetrenie zajtra o deviatej Ján Rýchly plus štyri dva jedna deväť osem osem nula jeden dva tri VšZP" (all at once)

✅ Expected: Parses all information correctly
📋 Verify: All details captured accurately
```

### 📞 Test 6.4: Connection Issues Simulation
```
During conversation, test:
- Hanging up and calling back
- Poor connection quality
- Agent not responding

❌ Expected: Graceful fallback, restart conversation
📋 Verify: System recovers properly
```

### 📞 Test 6.5: Language Mixing
```
Agent: "Meno a telefón?"
You: "My name is John Smith, phone number plus four two one nine eight eight zero one two three four five six"

❌ Expected: Agent responds in Slovak, asks for Slovak
📋 Verify: Maintains Slovak conversation
```

---

## 📊 VERIFICATION CHECKLIST

After each test, verify:

### ✅ Calendar Check
- [ ] Appointment created/modified/deleted correctly
- [ ] Patient name with special characters preserved
- [ ] Phone number in +421xxxxxxxxx format
- [ ] Correct appointment type and time
- [ ] Order numbers assigned properly

### ✅ SMS Verification (if enabled)
- [ ] SMS sent to correct phone number
- [ ] Slovak text with proper diacritics
- [ ] All appointment details included
- [ ] Special instructions (fasting, cash payment)

### ✅ Security Verification
- [ ] Generic names rejected in reschedules
- [ ] Wrong phone numbers don't match patients
- [ ] No cross-patient data leakage
- [ ] Full names required for security operations

### ✅ Business Rules
- [ ] Weekend bookings rejected
- [ ] Holiday bookings rejected
- [ ] Business hours enforced
- [ ] Daily limits respected
- [ ] Appointment type requirements explained

---

## 🚀 AUTOMATED TEST RUNNER

### Quick Setup and Test
```bash
# 1. Setup test appointments
node setup-voice-testing-data.js

# 2. Start testing with your ElevenLabs agent
echo "🎤 Call your ElevenLabs number and use the conversation scripts above"
echo "📞 Agent phone: YOUR_ELEVENLABS_PHONE_NUMBER"
echo "📋 Follow the conversation scripts in order"

# 3. After testing, clean up
node cleanup-august-appointments.js  # Removes all test data
```

### Test Result Tracking
```bash
# Create test results log
echo "# ElevenLabs Voice Test Results" > voice_test_results.md
echo "Date: $(date)" >> voice_test_results.md
echo "" >> voice_test_results.md

# Use this template for each test
echo "## Test X.Y: [Test Name]
- ✅/❌ Result: 
- 📝 Notes: 
- 🕐 Duration: 
- 📋 Calendar Check: 
" >> voice_test_results.md
```

---

## 🎯 SUCCESS CRITERIA

Your ElevenLabs agent passes if:

1. **✅ Perfect Scenarios Work**: All basic booking/cancel/reschedule flows complete successfully
2. **🛡️ Security Protected**: Generic names rejected, wrong phones don't match
3. **🗣️ Slovak Language**: Proper diacritics, natural conversation flow
4. **⚡ Error Recovery**: Handles unclear input, asks for clarification
5. **📅 Business Rules**: Rejects weekends, holidays, enforces limits
6. **📱 SMS Integration**: Correct notifications with all details

---

**🎉 Your Rehacentrum voice agent is now ready for comprehensive testing!** 

Call your ElevenLabs number and work through these scenarios systematically. Each conversation script is designed to test specific functionality and edge cases.