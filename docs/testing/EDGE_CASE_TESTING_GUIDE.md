# 🧪 Edge Case Testing Guide - Appointment Rescheduling

## 🎯 Goal: Prevent Wrong Appointment Rescheduling

This guide ensures our disambiguation logic works perfectly and **NEVER reschedules someone else's appointment**.

## 📋 Test Data Setup

First, populate the calendar with edge case data:

```bash
node test-data-generator.js
```

This creates appointments for **Tuesday, August 19, 2025** with these edge cases:

| Time | Patient | Phone | Type | Notes |
|------|---------|-------|------|-------|
| 07:00 | Peter Novotný | +421905444444 | Športová prehliadka | First Peter |
| 07:30 | Ján Novák | +421910111111 | Konzultácia | First Ján |
| 08:00 | Ján Harmady | +421910223761 | Vstupné vyšetrenie | Second Ján |
| 08:30 | Ján Svoboda | +421910333333 | Kontrolné vyšetrenie | Third Ján |
| 09:00 | Peter Novotný | +421905555555 | Konzultácia | Second Peter (different person!) |
| 09:30 | Mária Kováčová | 0910666666 | Zdravotnícke pomôcky | No country code |
| 10:00 | Žofia Krásna | +421907777777 | Vstupné vyšetrenie | Special characters |
| 10:30 | Anna Nová | +421908888888 | Konzultácia | First Anna |
| 11:00 | Anna Stará | +421908999999 | Kontrolné vyšetrenie | Second Anna |

## 🧪 Critical Test Scenarios

### **TEST 1: Multiple "Ján" - Phone Required** ❌➡️✅

**Scenario**: Multiple patients named "Ján" on same day

```
User says: "Chcem prehodiť termín"
Agent: "Ako sa voláte a telefón?"
User: "Ján, plus 421 910 223 761"
Agent: "Na ktorý dátum máte termín?"
User: "19. augusta"
```

**Expected**: Should find Ján Harmady's 08:00 appointment (correct match by phone)
**Should NOT**: Match Ján Novák or Ján Svoboda

### **TEST 2: Generic Name Only** ❌➡️❌

```
User: "Ján, nemám telefón so sebou"
```

**Expected**: Should FAIL - "Pre presné vyhľadanie potrebujem správne telefónne číslo"
**Should NOT**: Pick any Ján randomly

### **TEST 3: Wrong Phone Number** ❌➡️❌

```
User: "Ján Harmady, plus 421 910 999 999" (wrong phone)
```

**Expected**: Should FAIL - "Pôvodný termín sa nenašiel"
**Should NOT**: Match other Ján appointments

### **TEST 4: Identical Names, Different People** ❌➡️✅

```
User: "Peter Novotný, plus 421 905 444 444"
Target: 07:00 Športová prehliadka
```

**Expected**: Should find CORRECT Peter (07:00)
**Should NOT**: Match the other Peter Novotný (09:00)

### **TEST 5: Phone Format Variations** ✅

```
User: "Mária Kováčová, 0910666666" (original format)
OR: "Mária Kováčová, +421910666666" (with country code)
```

**Expected**: Should find Mária's 09:30 appointment regardless of format

### **TEST 6: Voice Recognition Errors** ✅

```
User: "Sofia Krasna, plus 421 907 777 777" (voice misheard "Žofia Krásna")
```

**Expected**: Should still find Žofia's appointment via phone match

### **TEST 7: Partial Name + Phone** ✅

```
User: "Anna, plus 421 908 888 888"
```

**Expected**: Should find Anna Nová (10:30)
**Should NOT**: Match Anna Stará

## 🚨 CRITICAL SAFETY TESTS

### **SAFETY TEST A: Completely Wrong Info**

```
User: "Michal Novák, +421999888777" (doesn't exist)
```

**Expected**: "Pôvodný termín sa nenašiel"
**CRITICAL**: Must NOT match any existing appointment

### **SAFETY TEST B: Mixed Patient Info**

```
User: "Ján Novák, +421910223761" (Ján Novák's name + Ján Harmady's phone)
```

**Expected**: Should match by PHONE (Ján Harmady's appointment)
**Rationale**: Phone is more reliable than voice-transcribed names

### **SAFETY TEST C: Similar But Different**

```
User: "Peter Novák, +421905555555" (mixing up surnames + wrong Peter's phone)
```

**Expected**: Should find Peter Novotný with that phone (09:00)
**CRITICAL**: Should NOT find the other Peter

## 📱 Testing Commands

### 1. Generate Test Data
```bash
node test-data-generator.js
```

### 2. Test Direct API Calls
```bash
# Test reschedule endpoint directly
curl -X POST https://rehacentrum2-production.up.railway.app/api/booking/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reschedule_appointment",
    "patient_name": "Ján Harmady", 
    "phone": "+421910223761",
    "old_date": "2025-08-19",
    "new_date": "2025-08-20",
    "new_time": "09:00"
  }'
```

### 3. ElevenLabs Voice Testing

Use these exact conversation scripts with your ElevenLabs agent:

#### **Script 1: Correct Reschedule**
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem prehodiť termín"
Agent: "Ako sa voláte a telefón?"
You: "Ján Harmady, plus štyri dva jedna deväť sto dvadsaťdva tristosesťdesiatjeden"
Agent: "Na ktorý dátum máte termín?"
You: "Devätnásteho augusta"
Agent: "Na kedy presunúť?"
You: "Na dvadsiateho augusta o deviatej"
```

#### **Script 2: Multiple Match Prevention**
```
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem prehodiť termín"
Agent: "Ako sa voláte a telefón?"
You: "Ján, plus štyri dva jedna deväť sto deväť deväť deväť deväť deväť deväť" (wrong phone)
```
**Expected**: Should ask for correct phone or fail gracefully

## ✅ Success Criteria

- ✅ **Phone-first matching**: Always prioritizes phone over name
- ✅ **Ambiguity rejection**: Refuses to proceed with generic names when multiple matches
- ✅ **Wrong info protection**: Never matches incorrect patient information
- ✅ **Format tolerance**: Handles various phone number formats
- ✅ **Voice error resilience**: Works despite name transcription errors
- ✅ **Clear error messages**: Explains why search failed and what to do

## 🔍 Manual Verification

After each test, check the Google Calendar to verify:

1. **Correct appointment was found**: Check original appointment details
2. **Correct appointment was moved**: Verify new date/time
3. **Old appointment was deleted**: Original slot should be free
4. **Patient details preserved**: Full name maintained in new appointment
5. **No other appointments affected**: Other patients' appointments unchanged

## 🚨 Red Flags - Stop Testing If You See:

❌ Wrong patient's appointment gets rescheduled
❌ Multiple appointments affected by one reschedule
❌ Generic names like "Ján" match without phone verification
❌ System proceeds with ambiguous patient information
❌ Appointments rescheduled with incomplete verification

## 📊 Test Results Template

```
TEST: [Test Name]
DATE: [Date]
INPUT: [What you said to the agent]
EXPECTED: [What should happen]
ACTUAL: [What actually happened]
STATUS: ✅ PASS / ❌ FAIL
NOTES: [Any observations]
```

Remember: **Better to fail safely than reschedule wrong appointment!** 🛡️
