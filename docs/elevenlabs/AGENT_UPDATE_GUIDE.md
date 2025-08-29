# ElevenLabs Agent Update Guide

## Overview
This guide explains how to programmatically update your ElevenLabs conversational AI agent with enhanced prompts and tool configurations.

## Prerequisites
- ElevenLabs API Key (stored in script or as environment variable)
- Agent ID from ElevenLabs dashboard

## Update Script
Located at: `scripts/update-elevenlabs-agent.js`

## Usage

### 1. List Available Agents
```bash
node scripts/update-elevenlabs-agent.js --list
```

### 2. Update Specific Agent
```bash
ELEVENLABS_AGENT_ID=agent_01jzgbszdyewstsdexn9xv17r9 node scripts/update-elevenlabs-agent.js
```

### 3. Update with Custom API Key
```bash
ELEVENLABS_API_KEY=your_api_key ELEVENLABS_AGENT_ID=your_agent_id node scripts/update-elevenlabs-agent.js
```

## What Gets Updated

### Enhanced Prompt Features
- **Mandatory Tool Usage**: Agent MUST use tools for all availability checks
- **No Assumptions**: Cannot say "is occupied" without checking via tool
- **Time Change Handling**: Automatically checks new times when patient changes request
- **Error Correction**: Immediately verifies when patient corrects availability info

### Tool Configuration Updates
- Added `time` parameter for specific time checking (e.g., "11:10")
- Added `preferred_time` for natural language time expressions
- Enhanced parameter validation with regex patterns
- Complete webhook schema for all booking operations

### Key Improvements Applied
✅ **Critical Rule**: NEVER say "je obsadené" without using get_available_slots tool
✅ **Time Changes**: When patient changes time (e.g., "nie 9:00, ale 11:00"), immediately check new time
✅ **Corrections**: When patient corrects availability, immediately verify with tool
✅ **Natural Flow**: Uses tools silently without announcing to patient

## Configuration Files

### Source Files
- **Prompt**: `docs/elevenlabs/ELEVENLABS_AGENT_PROMPT.md`
- **Tools Config**: `docs/elevenlabs/ELEVENLABS_CONFIG.md`

### Output Files
- **Update Response**: `docs/elevenlabs/agent-update-response.json`

## Testing the Updated Agent

### Test Scenario 1: Time Change
```
User: "Chcem termín o 9:00"
Agent: [Checks availability for 9:00]
User: "Nie, radšej o 11:10"
Agent: [MUST check availability for 11:10 with tool]
```

### Test Scenario 2: Availability Correction
```
Agent: "O 11:00 je obsadené"
User: "Nie, o 11:10 máte voľné"
Agent: [MUST immediately verify with get_available_slots tool]
```

### Test Scenario 3: Specific Time Request
```
User: "Máte voľné o 8:00?"
Agent: [MUST use get_available_slots with time="08:00"]
```

## Webhook Parameters

The enhanced webhook now accepts these key parameters:

### For Availability Checking
- `action`: "get_available_slots"
- `date`: "YYYY-MM-DD"
- `appointment_type`: Type of appointment
- `time`: "HH:MM" (optional, for specific time)
- `preferred_time`: Natural language time expression

### For Booking
- `action`: "book_appointment"
- `date_time`: "YYYY-MM-DDTHH:mm:ss"
- `patient_name`, `patient_surname`, `phone`, `insurance`

## Troubleshooting

### Error: Agent not found
- Verify agent ID using `--list` command
- Check if API key has access to the agent

### Error: Invalid model
- Ensure using supported TTS models: eleven_turbo_v2_5, eleven_flash_v2_5

### Tool not calling
- Verify webhook URL is correct: https://rehacentrum2-production.up.railway.app/api/booking/webhook
- Check agent prompt includes mandatory tool usage rules
- Monitor webhook logs for incoming requests

## Success Indicators

After successful update:
1. ✅ Agent responds to time changes with tool calls
2. ✅ Never assumes availability without checking
3. ✅ Handles specific time requests correctly
4. ✅ Webhook receives proper parameters including `time`

## Next Steps

1. **Test the agent** with various time-specific scenarios
2. **Monitor webhook logs** to verify proper tool usage
3. **Fine-tune** if needed by running update script again

## Support

For issues with:
- **Webhook API**: Check `api/booking/webhook.js`
- **Agent Prompt**: Edit `docs/elevenlabs/ELEVENLABS_AGENT_PROMPT.md`
- **Tool Config**: Update in script or via dashboard

---

Last Updated: August 2025
Agent ID: agent_01jzgbszdyewstsdexn9xv17r9