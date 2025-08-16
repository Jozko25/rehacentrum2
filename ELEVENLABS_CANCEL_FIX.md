# 🚨 ELEVENLABS CANCEL APPOINTMENT FIX

## Issue Identified
Your ElevenLabs agent is failing to cancel appointments with error:
`"Undefined parameters passed: dict_keys(['appointment_date'])"`

## Root Cause
The tool configuration in ElevenLabs doesn't properly map the `appointment_date` parameter for the `cancel_appointment` action.

## Fix Required

### Option 1: Update ElevenLabs Tool Configuration
In your ElevenLabs agent tool configuration, ensure the webhook tool has these parameters properly configured:

```json
{
  "name": "booking_system",
  "type": "webhook", 
  "url": "https://rehacentrum2-production.up.railway.app/api/booking/webhook",
  "method": "POST",
  "parameters": {
    "action": {
      "type": "string",
      "description": "Action type: cancel_appointment, book_appointment, etc.",
      "required": true
    },
    "patient_name": {
      "type": "string", 
      "description": "Patient full name",
      "required": false
    },
    "phone": {
      "type": "string",
      "description": "Patient phone number", 
      "required": false
    },
    "appointment_date": {
      "type": "string",
      "description": "Appointment date in YYYY-MM-DD format",
      "required": false
    }
  }
}
```

### Option 2: Alternative Parameter Name
If ElevenLabs doesn't accept `appointment_date`, try using `date` instead and update your agent prompt to use `date` parameter for cancellations.

## Testing the Fix

### Manual Test (should work):
```bash
curl -X POST https://rehacentrum2-production.up.railway.app/api/booking/webhook \
  -H "Content-Type: application/json" \
  -d '{"action": "cancel_appointment", "patient_name": "Jan Harmady", "phone": "+421910223761", "appointment_date": "2025-08-18"}'
```

### Agent Test Script:
```
You: "Chcem zrušiť môj termín"
Agent: "Meno a telefón?"
You: "Jan Harmady, +421910223761"  
Agent: "Dátum termínu?"
You: "18. augusta 2025"
```

**Expected**: Should work without "Undefined parameters" error

## Agent Prompt Update

Also update your agent prompt to be more specific about date format:

```
### 4. cancel_appointment
- **Účel**: Zrušenie existujúceho termínu
- **Parametre**: 
  - `patient_name`: Celé meno pacienta
  - `phone`: Telefónne číslo pacienta  
  - `appointment_date`: Dátum termínu vo formáte YYYY-MM-DD
- **Odpoveď**: Potvrdenie zrušenia s detailmi pôvodného termínu

**PRÍKLAD POUŽITIA:**
```
{
  "action": "cancel_appointment",
  "patient_name": "Jan Harmady", 
  "phone": "+421910223761",
  "appointment_date": "2025-08-18"
}
```

## Immediate Actions Required

1. **Check ElevenLabs Tool Configuration**: Ensure `appointment_date` parameter is properly configured
2. **Test Manual API Call**: Verify the API works (it should - our tests passed)
3. **Update Agent Tool Schema**: Make sure parameter mapping is correct
4. **Test with Agent**: Try the cancellation conversation again

The webhook API is working correctly - this is purely an ElevenLabs tool configuration issue.