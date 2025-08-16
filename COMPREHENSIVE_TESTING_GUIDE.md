# 🧪 COMPREHENSIVE TESTING GUIDE - Rehacentrum Booking System

**Last Updated**: August 2025  
**Purpose**: Complete edge case testing for ALL webhook endpoints, business rules, and voice AI scenarios

---

## 📋 SYSTEM OVERVIEW

### Webhook Endpoints (6 total)
1. `get_available_slots` - Check slot availability
2. `book_appointment` - Create new appointments  
3. `cancel_appointment` - Cancel existing appointments
4. `reschedule_appointment` - Move appointments to new times
5. `send_fallback_sms` - Send manual SMS notifications
6. `get_more_slots` - Get additional availability options

### Appointment Types & Constraints
| Type | Daily Limit | Duration | Schedule | Price | Insurance |
|------|-------------|----------|----------|-------|-----------|
| **Športová prehliadka** | 5/day | 20min | 07:00-08:40 (20min intervals) | 130€ | No |
| **Vstupné vyšetrenie** | 50/day | 30min | 09:00-11:30, 13:00-15:00 (10min intervals) | 0€ | Yes |
| **Kontrolné vyšetrenie** | 50/day | 30min | 09:00-11:30, 13:00-15:00 (10min intervals) | 0€ | Yes |
| **Zdravotnícke pomôcky** | 10/day | 30min | 09:00-11:30, 13:00-15:00 (10min intervals) | 0€ | Yes |
| **Konzultácia** | 20/day | 30min | 07:30-09:00, 15:00-16:00 (10min intervals) | 30€ | No |

### Business Rules
- **Working Days**: Monday-Friday only
- **Working Hours**: 07:00-16:00
- **Holiday System**: Slovak holidays (date-holidays library)
- **Advance Booking**: 1 hour minimum, 30 days maximum
- **Phone Format**: `+421xxxxxxxxx` (Slovak numbers only)

---

## 🎯 1. BASIC FUNCTIONALITY TESTS

### Setup Commands
```bash
# Test webhook base URL
WEBHOOK_URL="https://rehacentrum2-production.up.railway.app/api/booking/webhook"

# Helper function for all tests
test_webhook() {
  echo "🧪 Testing: $1"
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$2" \
    | head -100
  echo -e "\n────────────────────────────────────────\n"
}
```

### 1.1 Get Available Slots
```bash
# ✅ Valid request
test_webhook "Valid slots request" '{
  "action": "get_available_slots",
  "date": "2025-09-01",
  "appointment_type": "vstupne_vysetrenie"
}'

# ❌ Invalid appointment type
test_webhook "Invalid appointment type" '{
  "action": "get_available_slots", 
  "date": "2025-09-01",
  "appointment_type": "nonexistent_type"
}'

# ❌ Past date
test_webhook "Past date" '{
  "action": "get_available_slots",
  "date": "2025-01-01", 
  "appointment_type": "vstupne_vysetrenie"
}'
```

### 1.2 Book Appointment
```bash
# ✅ Valid booking
test_webhook "Valid booking" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-01T09:00:00",
  "patient_name": "Ján",
  "patient_surname": "Testovací", 
  "phone": "+421912345678",
  "insurance": "VšZP"
}'

# ❌ Missing required fields
test_webhook "Missing surname" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-01T09:10:00",
  "patient_name": "Ján",
  "phone": "+421912345678",
  "insurance": "VšZP"
}'
```

### 1.3 Cancel Appointment
```bash
# ✅ Valid cancellation (use real appointment)
test_webhook "Valid cancellation" '{
  "action": "cancel_appointment",
  "patient_name": "Ján Testovací",
  "phone": "+421912345678",
  "date": "2025-09-01"
}'

# ❌ Non-existent appointment
test_webhook "Non-existent appointment" '{
  "action": "cancel_appointment",
  "patient_name": "Neexistujúci Pacient",
  "phone": "+421999999999",
  "date": "2025-09-01"
}'
```

### 1.4 Reschedule Appointment
```bash
# ✅ Valid reschedule (SECURITY TEST)
test_webhook "Valid reschedule with full name" '{
  "action": "reschedule_appointment",
  "patient_name": "Ján Testovací",
  "phone": "+421912345678",
  "old_date": "2025-09-01",
  "new_date": "2025-09-02",
  "new_time": "09:00"
}'

# 🚨 SECURITY: Generic name should fail
test_webhook "SECURITY: Generic name rejection" '{
  "action": "reschedule_appointment", 
  "patient_name": "Ján",
  "phone": "+421999999999",
  "old_date": "2025-09-01",
  "new_date": "2025-09-02", 
  "new_time": "09:00"
}'
```

---

## ⏰ 2. TIME CONSTRAINT EDGE CASES

### 2.1 Business Hours Validation
```bash
# ❌ Before business hours
test_webhook "Before business hours" '{
  "action": "get_available_slots",
  "date": "2025-09-01",
  "appointment_type": "sportova_prehliadka"
}' 
# Note: Should show 07:00 as earliest

# ❌ After business hours  
test_webhook "After business hours booking" '{
  "action": "book_appointment",
  "appointment_type": "konzultacia",
  "date_time": "2025-09-01T17:00:00",
  "patient_name": "Test",
  "patient_surname": "Patient",
  "phone": "+421912345678", 
  "insurance": "VšZP"
}'

# ❌ Lunch break conflicts
test_webhook "Lunch break slot" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie", 
  "date_time": "2025-09-01T12:00:00",
  "patient_name": "Test",
  "patient_surname": "Patient",
  "phone": "+421912345678",
  "insurance": "VšZP"
}'
```

### 2.2 Weekend & Holiday Testing
```bash
# ❌ Weekend booking (Saturday)
test_webhook "Saturday booking" '{
  "action": "get_available_slots",
  "date": "2025-09-06",
  "appointment_type": "vstupne_vysetrenie"
}'

# ❌ Sunday booking
test_webhook "Sunday booking" '{
  "action": "get_available_slots", 
  "date": "2025-09-07",
  "appointment_type": "vstupne_vysetrenie"
}'

# ❌ Slovak Holiday (Constitution Day - Sep 1st)
test_webhook "Slovak Holiday" '{
  "action": "get_available_slots",
  "date": "2025-09-01",
  "appointment_type": "vstupne_vysetrenie"
}'
# Note: Verify if Sep 1st is actually a holiday in Slovakia

# ❌ Christmas Day
test_webhook "Christmas Day" '{
  "action": "get_available_slots",
  "date": "2025-12-25", 
  "appointment_type": "vstupne_vysetrenie"
}'
```

### 2.3 Advance Booking Limits
```bash
# ❌ Too far in advance (31+ days)
test_webhook "Too far advance" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-10-01T09:00:00",
  "patient_name": "Test",
  "patient_surname": "Patient", 
  "phone": "+421912345678",
  "insurance": "VšZP"
}'

# ❌ Last minute (less than 1 hour)
NOW=$(date -u -d '+30 minutes' +'%Y-%m-%dT%H:%M:00')
test_webhook "Last minute booking" "{
  \"action\": \"book_appointment\",
  \"appointment_type\": \"vstupne_vysetrenie\", 
  \"date_time\": \"$NOW\",
  \"patient_name\": \"Test\",
  \"patient_surname\": \"Patient\",
  \"phone\": \"+421912345678\",
  \"insurance\": \"VšZP\"
}"
```

---

## 📊 3. CAPACITY & LIMITS TESTING

### 3.1 Daily Limit Testing
```bash
# Create script to test daily limits
cat > test_daily_limits.sh << 'EOF'
#!/bin/bash
WEBHOOK_URL="https://rehacentrum2-production.up.railway.app/api/booking/webhook"

echo "🧪 Testing Daily Limits for Športová prehliadka (limit: 5/day)"

# Book 6 appointments to exceed limit
for i in {1..6}; do
  TIME=$(printf "07:%02d:00" $((i*20)))
  echo "Booking #$i at $TIME"
  
  curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"book_appointment\",
      \"appointment_type\": \"sportova_prehliadka\",
      \"date_time\": \"2025-09-02T$TIME\",
      \"patient_name\": \"Test$i\",
      \"patient_surname\": \"Patient$i\",
      \"phone\": \"+42191234567$i\",
      \"insurance\": \"VšZP\"
    }"
  echo -e "\n"
  sleep 1
done
EOF

chmod +x test_daily_limits.sh
./test_daily_limits.sh
```

### 3.2 Time Slot Conflicts
```bash
# ❌ Double booking same time
test_webhook "Double booking attempt" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-03T09:00:00",
  "patient_name": "Duplicate",
  "patient_surname": "Test",
  "phone": "+421987654321", 
  "insurance": "VšZP"
}'

# Run twice to test conflict detection
test_webhook "Double booking attempt #2" '{
  "action": "book_appointment", 
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-03T09:00:00",
  "patient_name": "Another",
  "patient_surname": "Duplicate",
  "phone": "+421987654322",
  "insurance": "VšZP"
}'
```

### 3.3 Appointment Duration Overlaps  
```bash
# ❌ Overlapping appointments (30min + 30min in 20min slot)
test_webhook "Overlapping appointment 1" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-03T09:10:00",
  "patient_name": "Overlap",
  "patient_surname": "Test1", 
  "phone": "+421555666777",
  "insurance": "VšZP"
}'

test_webhook "Overlapping appointment 2" '{
  "action": "book_appointment",
  "appointment_type": "kontrolne_vysetrenie", 
  "date_time": "2025-09-03T09:20:00",
  "patient_name": "Overlap",
  "patient_surname": "Test2",
  "phone": "+421555666778",
  "insurance": "VšZP"
}'
```

---

## 👤 4. PATIENT DATA EDGE CASES

### 4.1 Name Variations
```bash
# ✅ Special characters in names
test_webhook "Special characters" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-04T09:00:00",
  "patient_name": "Žofia",
  "patient_surname": "Kráľová-Nová",
  "phone": "+421911111111",
  "insurance": "VšZP" 
}'

# ✅ Very long names
test_webhook "Long names" '{
  "action": "book_appointment", 
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-04T09:10:00",
  "patient_name": "Maximilian Alexander",
  "patient_surname": "von Habsburg-Lothringen",
  "phone": "+421922222222",
  "insurance": "VšZP"
}'

# ❌ Single character names
test_webhook "Single character name" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie", 
  "date_time": "2025-09-04T09:20:00",
  "patient_name": "A",
  "patient_surname": "B",
  "phone": "+421933333333",
  "insurance": "VšZP"
}'
```

### 4.2 Phone Number Variations
```bash
# ❌ Invalid phone formats
test_webhook "Invalid phone - no country code" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-04T09:30:00", 
  "patient_name": "Test",
  "patient_surname": "Phone",
  "phone": "0912345678",
  "insurance": "VšZP"
}'

# ❌ Wrong country code
test_webhook "Wrong country code" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-04T09:40:00",
  "patient_name": "Test", 
  "patient_surname": "Phone2",
  "phone": "+420912345678",
  "insurance": "VšZP"
}'

# ❌ Too short number
test_webhook "Too short phone" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-04T09:50:00",
  "patient_name": "Test",
  "patient_surname": "Phone3",
  "phone": "+42191234",
  "insurance": "VšZP"
}'

# ✅ Phone with spaces/dashes (should be normalized)
test_webhook "Phone with formatting" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie", 
  "date_time": "2025-09-04T10:00:00",
  "patient_name": "Test",
  "patient_surname": "PhoneFormat",
  "phone": "+421 91-234-5678",
  "insurance": "VšZP"
}'
```

### 4.3 Insurance Variations
```bash
# ✅ Different insurance companies
for insurance in "VšZP" "Dôvera" "Union" "NCZI"; do
  test_webhook "Insurance: $insurance" "{
    \"action\": \"book_appointment\",
    \"appointment_type\": \"vstupne_vysetrenie\",
    \"date_time\": \"2025-09-05T09:00:00\",
    \"patient_name\": \"Test\",
    \"patient_surname\": \"Insurance$insurance\",
    \"phone\": \"+421944444444\",
    \"insurance\": \"$insurance\"
  }"
done

# ❌ Invalid insurance for paid appointment
test_webhook "Insurance for paid appointment" '{
  "action": "book_appointment",
  "appointment_type": "sportova_prehliadka",
  "date_time": "2025-09-05T07:00:00", 
  "patient_name": "Test",
  "patient_surname": "WrongInsurance",
  "phone": "+421955555555",
  "insurance": "VšZP"
}'
```

### 4.4 Duplicate Patient Detection  
```bash
# Same name, different phone
test_webhook "Same name, different phone 1" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-05T10:00:00",
  "patient_name": "Ján",
  "patient_surname": "Novák", 
  "phone": "+421966666666",
  "insurance": "VšZP"
}'

test_webhook "Same name, different phone 2" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-05T10:10:00",
  "patient_name": "Ján",
  "patient_surname": "Novák",
  "phone": "+421977777777", 
  "insurance": "VšZP"
}'

# Same phone, different name (should fail)
test_webhook "Same phone, different name" '{
  "action": "book_appointment",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-05T10:20:00",
  "patient_name": "Peter",
  "patient_surname": "Novák",
  "phone": "+421966666666",
  "insurance": "VšZP"
}'
```

---

## 🤖 5. ELEVENLABS VOICE AI TESTING

### 5.1 Perfect Scenarios (Should Work)
```
🎯 TEST SCENARIO 1: Perfect Booking
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcel by som si objednať termín na vstupné vyšetrenie"
Agent: "Na aký dátum a čas by ste mali záujem?"
You: "Na štvrtok piateho septembra o deviatej ráno"
Agent: "Ako sa voláte a aké je vaše telefónne číslo?"
You: "Volám sa Ján Novák, telefón plus štyri dva jedna deväť jeden dva tri štyri päť šesť sedem osem"
Agent: "Aká je vaša poisťovňa?"
You: "VšZP"
Expected: Successful booking with SMS confirmation

🎯 TEST SCENARIO 2: Perfect Cancellation  
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem zrušiť môj termín"
Agent: "Ako sa voláte a aké je vaše telefónne číslo?"
You: "Ján Novák, plus štyri dva jedna deväť jeden dva tri štyri päť šesť sedem osem"
Agent: "Na aký dátum máte termín?"
You: "Na piateho septembra"
Expected: Finds and cancels appointment

🎯 TEST SCENARIO 3: Perfect Reschedule
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcel by som presunúť môj termín"
Agent: "Ako sa voláte a aké je vaše telefónne číslo?"
You: "Ján Novák, plus štyri dva jedna deväť jeden dva tri štyri päť šesť sedem osem" 
Agent: "Na aký dátum máte súčasný termín a na kedy ho chcete presunúť?"
You: "Mám termín na piateho septembra a chcem ho presunúť na šiesteho septembra o desiatej"
Expected: Successful reschedule
```

### 5.2 Voice Recognition Challenges
```
🧪 TEST SCENARIO 4: Ambiguous Names (SECURITY TEST)
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem presunúť termín"
Agent: "Ako sa voláte a aké je vaše telefónne číslo?"
You: "Ján, plus štyri dva jedna deväť deväť deväť deväť deväť deväť deväť deväť deväť"
Expected: Should request full name and reject wrong phone

🧪 TEST SCENARIO 5: Mishearing Dates
Agent: "Dobrý deň, ako môžem pomôcť?"
You: "Chcem termín na vstupné vyšetrenie"
Agent: "Na aký dátum?"
You: "Na utorok" (without specifying which Tuesday)
Expected: Should ask for specific date

🧪 TEST SCENARIO 6: Phone Number Confusion
Agent: "Aké je vaše telefónne číslo?"
You: "Nula deväť jedna dva tri štyri päť šesť sedem osem" (missing +421)
Expected: Should recognize and add country code or request correct format

🧪 TEST SCENARIO 7: Multiple Appointment Types
Agent: "Aký typ vyšetrenia potrebujete?"
You: "Neviem, čo potrebujem presne"
Expected: Should explain available types and their purposes
```

### 5.3 Edge Cases for Voice AI
```
🔬 TEST SCENARIO 8: Insurance Confusion
You: "Mám Dôveru" vs "Mám dôveru" (trust vs insurance company)
Expected: Should recognize context (insurance)

🔬 TEST SCENARIO 9: Date Format Variations  
You: "Piateho deviateho" vs "Piatok deviateho septembra" vs "5.9."
Expected: Should handle all Slovak date formats

🔬 TEST SCENARIO 10: Time Variations
You: "O deviatej" vs "O deväť hodín" vs "Ráno o deviatej"
Expected: Should recognize 09:00

🔬 TEST SCENARIO 11: Name Pronunciations
You: "Žofia Kráľová" vs "Sofia Kralova" (accented vs non-accented)
Expected: Should handle Slovak diacritics

🔬 TEST SCENARIO 12: Interruptions/Corrections
You: "Volám sa Ján... vlastne Peter Novák"
Expected: Should use final corrected information
```

---

## 🚨 6. STRESS & ERROR TESTING

### 6.1 Network & API Stress Tests
```bash
# Concurrent booking attempts
cat > stress_test.sh << 'EOF'
#!/bin/bash
WEBHOOK_URL="https://rehacentrum2-production.up.railway.app/api/booking/webhook"

echo "🚨 Stress Testing: 20 concurrent requests"

for i in {1..20}; do
  (
    curl -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"action\": \"get_available_slots\",
        \"date\": \"2025-09-10\",
        \"appointment_type\": \"vstupne_vysetrenie\"
      }" &
  )
done
wait
echo "Stress test completed"
EOF

chmod +x stress_test.sh  
./stress_test.sh
```

### 6.2 Malformed Request Testing
```bash
# ❌ Invalid JSON
echo "🧪 Testing malformed JSON"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "book_appointment", "invalid": json}'

# ❌ Missing action parameter
test_webhook "Missing action" '{
  "date": "2025-09-01",
  "appointment_type": "vstupne_vysetrenie"
}'

# ❌ Wrong HTTP method
echo "🧪 Testing wrong HTTP method"
curl -X GET "$WEBHOOK_URL"

# ❌ Extremely large request
test_webhook "Large request" "{
  \"action\": \"book_appointment\",
  \"patient_name\": \"$(python3 -c 'print("A" * 10000)')\",
  \"appointment_type\": \"vstupne_vysetrenie\"
}"
```

### 6.3 Calendar API Failure Simulation
```bash
# Test with invalid calendar access (temporarily)
# Note: This would require modifying credentials temporarily

# ❌ Database/Calendar unavailable
echo "🧪 Testing during calendar downtime"
# (Would need to simulate by blocking Google API access)
```

---

## 📈 7. PERFORMANCE & MONITORING

### 7.1 Response Time Testing
```bash
# Time all operations
cat > performance_test.sh << 'EOF'
#!/bin/bash
WEBHOOK_URL="https://rehacentrum2-production.up.railway.app/api/booking/webhook"

operations=(
  "get_available_slots"
  "book_appointment"  
  "cancel_appointment"
  "reschedule_appointment"
)

for op in "${operations[@]}"; do
  echo "⏱️ Testing $op performance"
  time curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"$op\", \"date\": \"2025-09-15\"}" \
    > /dev/null 2>&1
  echo ""
done
EOF

chmod +x performance_test.sh
./performance_test.sh
```

### 7.2 Memory Usage Monitoring
```bash
# Monitor system resources during heavy load
htop &
./stress_test.sh
```

---

## 🎭 8. SECURITY TESTING

### 8.1 Injection Attempts
```bash
# ❌ SQL Injection attempts (even though using Google Calendar API)
test_webhook "SQL injection attempt" '{
  "action": "book_appointment",
  "patient_name": "Robert\"; DROP TABLE appointments; --",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-15T09:00:00"
}'

# ❌ Script injection
test_webhook "Script injection" '{
  "action": "book_appointment", 
  "patient_name": "<script>alert(\"xss\")</script>",
  "appointment_type": "vstupne_vysetrenie",
  "date_time": "2025-09-15T09:10:00"
}'
```

### 8.2 Phone-Based Security (Critical)
```bash
# 🚨 Wrong patient matching attempts
test_webhook "SECURITY: Wrong phone + generic name" '{
  "action": "reschedule_appointment",
  "patient_name": "Ján",
  "phone": "+421000000000",
  "old_date": "2025-09-15"
}'

# Should return: "Pre bezpečnosť potrebujem celé meno a priezvisko"

test_webhook "SECURITY: Partial phone matching" '{
  "action": "cancel_appointment",
  "patient_name": "Test Patient", 
  "phone": "+421912345",
  "date": "2025-09-15"
}'

# Should fail due to incomplete phone number
```

---

## 📊 9. COMPREHENSIVE TEST EXECUTION

### 9.1 Full Test Suite Runner
```bash
cat > run_all_tests.sh << 'EOF'
#!/bin/bash

echo "🧪 REHACENTRUM COMPREHENSIVE TEST SUITE"
echo "========================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WEBHOOK_URL="https://rehacentrum2-production.up.railway.app/api/booking/webhook"
PASSED=0
FAILED=0
TOTAL=0

# Test function with result tracking
run_test() {
  local test_name="$1"
  local test_data="$2" 
  local expected_result="$3"
  
  TOTAL=$((TOTAL + 1))
  echo -e "\n${YELLOW}🧪 Test #$TOTAL: $test_name${NC}"
  
  response=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$test_data")
  
  echo "Response: $response"
  
  # Simple result validation
  if [[ "$response" == *"$expected_result"* ]]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  echo "────────────────────────────────────────"
}

# Core functionality tests
run_test "Valid slot request" \
  '{"action": "get_available_slots", "date": "2025-09-20", "appointment_type": "vstupne_vysetrenie"}' \
  "dostupné"

run_test "Invalid appointment type" \
  '{"action": "get_available_slots", "date": "2025-09-20", "appointment_type": "invalid"}' \
  "Neznámy"

run_test "Weekend booking rejection" \
  '{"action": "get_available_slots", "date": "2025-09-21", "appointment_type": "vstupne_vysetrenie"}' \
  "pracovný"

run_test "Generic name security" \
  '{"action": "reschedule_appointment", "patient_name": "Ján", "phone": "+421999999999", "old_date": "2025-09-20"}' \
  "celé meno"

run_test "Invalid phone format" \
  '{"action": "book_appointment", "appointment_type": "vstupne_vysetrenie", "date_time": "2025-09-20T09:00:00", "patient_name": "Test", "patient_surname": "Patient", "phone": "0912345678", "insurance": "VšZP"}' \
  "telefón"

# Summary
echo -e "\n${YELLOW}📋 TEST SUMMARY${NC}"
echo "================================"
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
EOF

chmod +x run_all_tests.sh
./run_all_tests.sh
```

---

## 🎯 10. REAL-WORLD SCENARIOS

### 10.1 Peak Usage Simulation
```bash
# Simulate busy Monday morning
echo "🏥 Simulating Monday 9 AM rush"
for i in {1..10}; do
  test_webhook "Rush hour booking #$i" "{
    \"action\": \"book_appointment\",
    \"appointment_type\": \"vstupne_vysetrenie\",
    \"date_time\": \"2025-09-22T09:$((i*10)):00\", 
    \"patient_name\": \"Patient$i\",
    \"patient_surname\": \"Rush\",
    \"phone\": \"+42191234567$i\",
    \"insurance\": \"VšZP\"
  }"
  sleep 0.5
done
```

### 10.2 Customer Journey Testing
```bash
# Full customer journey: Book → Reschedule → Cancel
echo "🚶 Testing complete customer journey"

# 1. Book appointment
CUSTOMER_PHONE="+421800123456"
test_webhook "Journey: Book" "{
  \"action\": \"book_appointment\",
  \"appointment_type\": \"vstupne_vysetrenie\",
  \"date_time\": \"2025-09-25T09:00:00\",
  \"patient_name\": \"Journey\",
  \"patient_surname\": \"Test\",
  \"phone\": \"$CUSTOMER_PHONE\",
  \"insurance\": \"VšZP\"
}"

sleep 2

# 2. Reschedule appointment  
test_webhook "Journey: Reschedule" "{
  \"action\": \"reschedule_appointment\",
  \"patient_name\": \"Journey Test\",
  \"phone\": \"$CUSTOMER_PHONE\",
  \"old_date\": \"2025-09-25\",
  \"new_date\": \"2025-09-26\", 
  \"new_time\": \"10:00\"
}"

sleep 2

# 3. Cancel appointment
test_webhook "Journey: Cancel" "{
  \"action\": \"cancel_appointment\",
  \"patient_name\": \"Journey Test\",
  \"phone\": \"$CUSTOMER_PHONE\",
  \"date\": \"2025-09-26\"
}"
```

---

## 📝 TESTING CHECKLIST

### ✅ Pre-Testing Setup
- [ ] Clean calendar (August appointments removed)
- [ ] Webhook URL accessible
- [ ] Test dates in future (avoid past dates)
- [ ] ElevenLabs agent configured
- [ ] SMS service enabled (optional)

### ✅ Basic Functionality
- [ ] All 6 webhook endpoints respond
- [ ] Valid requests succeed
- [ ] Invalid requests fail gracefully
- [ ] Error messages in Slovak

### ✅ Business Rules
- [ ] Working hours enforced (07:00-16:00)
- [ ] Weekend bookings rejected
- [ ] Holiday bookings rejected  
- [ ] Daily limits respected
- [ ] Advance booking limits enforced

### ✅ Security
- [ ] Generic names rejected in reschedule
- [ ] Phone validation working
- [ ] No cross-patient data leakage
- [ ] SQL injection protected
- [ ] XSS attempts blocked

### ✅ Voice AI Integration
- [ ] Perfect scenarios work
- [ ] Ambiguous input handled
- [ ] Slovak language recognition
- [ ] Date/time parsing accurate
- [ ] Error recovery functional

### ✅ Performance
- [ ] Response times < 3 seconds
- [ ] Concurrent requests handled
- [ ] Memory usage stable
- [ ] Error rates acceptable

---

## 🚀 AUTOMATED TESTING EXECUTION

```bash
# One-command full test execution
curl -o comprehensive_test.sh https://raw.githubusercontent.com/yourusername/rehacentrum2/main/comprehensive_test.sh
chmod +x comprehensive_test.sh
./comprehensive_test.sh --full --report

# Specific test categories
./comprehensive_test.sh --security-only
./comprehensive_test.sh --voice-ai-only  
./comprehensive_test.sh --performance-only
```

---

**🛡️ Remember: This system handles real patient data. Test responsibly and never use real patient information in testing scenarios!**