#!/usr/bin/env node
/**
 * ElevenLabs Agent Update Script
 * Updates the agent prompt and tool configurations via ElevenLabs API
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_a9370c9db3530bf9d8339d23ca6a2e6cba66a78dae99c868';
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID; // You need to provide this

// Only check for AGENT_ID if not listing agents
if (!AGENT_ID && !process.argv.includes('--list')) {
  console.error('❌ Error: ELEVENLABS_AGENT_ID is required');
  console.log('Please set the ELEVENLABS_AGENT_ID environment variable or update this script');
  console.log('You can find your agent ID by running: node scripts/update-elevenlabs-agent.js --list');
  process.exit(1);
}

// Load the enhanced prompt
const promptPath = path.join(__dirname, '..', 'docs', 'elevenlabs', 'ELEVENLABS_AGENT_PROMPT.md');
const promptContent = fs.readFileSync(promptPath, 'utf8');

// Create the tool configuration
const toolConfig = {
  type: "webhook",
  name: "booking_system",
  description: "Systém rezervácií pre Rehacentrum - vyhľadávanie, rezervácia, zrušenie a presunutie termínov",
  response_timeout_secs: 30,
  disable_interruptions: false,
  force_pre_tool_speech: false,
  api_schema: {
    url: "https://rehacentrum2-production.up.railway.app/api/booking/webhook",
    method: "POST",
    request_body_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get_available_slots", "find_closest_slot", "book_appointment", "cancel_appointment", "reschedule_appointment", "send_fallback_sms", "get_more_slots"],
          description: "Akcia ktorú chcete vykonať"
        },
        date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Dátum v formáte YYYY-MM-DD"
        },
        appointment_type: {
          type: "string",
          enum: ["sportova_prehliadka", "vstupne_vysetrenie", "kontrolne_vysetrenie", "zdravotnicke_pomocky", "konzultacia"],
          description: "Typ vyšetrenia"
        },
        time: {
          type: "string",
          pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          description: "Špecifický čas pre kontrolu dostupnosti v formáte HH:MM (napr. 11:10, 08:00)"
        },
        preferred_time: {
          type: "string",
          description: "Prirodzené slovenské časové výrazy ako 'ráno', 'dopoludnia', 'poobede', 'večer'"
        },
        date_time: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$",
          description: "Dátum a čas termínu v ISO formáte (YYYY-MM-DDTHH:mm:ss)"
        },
        patient_name: {
          type: "string",
          description: "Meno pacienta (bez priezviska)"
        },
        patient_surname: {
          type: "string",
          description: "Priezvisko pacienta"
        },
        phone: {
          type: "string",
          pattern: "^\\+421\\d{9}$",
          description: "Telefónne číslo v formáte +421XXXXXXXXX"
        },
        insurance: {
          type: "string",
          description: "Názov poisťovne"
        },
        appointment_date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Dátum termínu v formáte YYYY-MM-DD"
        },
        old_date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Pôvodný dátum termínu v formáte YYYY-MM-DD"
        },
        new_date_time: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$",
          description: "Nový dátum a čas v ISO formáte (YYYY-MM-DDTHH:mm:ss)"
        },
        current_count: {
          type: "integer",
          description: "Počet už zobrazených termínov pre progresívne načítanie"
        },
        message: {
          type: "string",
          description: "Obsah SMS správy pre fallback"
        },
        days_to_search: {
          type: "integer",
          default: 7,
          description: "Počet dní na vyhľadávanie najbližšieho termínu"
        }
      },
      required: ["action"]
    }
  }
};

// Agent configuration update
const agentConfig = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: promptContent,
        llm: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 1000,
        tools: [toolConfig]
      },
      first_message: "Dobrý deň, ďakujem, že ste kontaktovali Rehacentrum Humenné, ako Vám môžem pomôcť?",
      language: "sk"
    },
    tts: {
      model_id: "eleven_turbo_v2_5",  // Fast model with good quality and Slovak support
      stability: 0.5,
      similarity_boost: 0.8,
      optimize_streaming_latency: 3
    },
    turn: {
      turn_timeout: 10,
      silence_end_call_timeout: 30,
      mode: "silence"
    }
  },
  name: "Rehacentrum Booking Assistant"
};

async function updateAgent() {
  console.log('🚀 Starting ElevenLabs agent update...');
  console.log(`📝 Agent ID: ${AGENT_ID}`);
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Agent updated successfully!');
    console.log('📊 Agent details:');
    console.log(`   - ID: ${result.agent_id}`);
    console.log(`   - Name: ${result.name}`);
    console.log(`   - Language: ${result.conversation_config?.agent?.language}`);
    console.log(`   - LLM Model: ${result.conversation_config?.agent?.prompt?.llm}`);
    
    // Save the response for reference
    fs.writeFileSync(
      path.join(__dirname, '..', 'docs', 'elevenlabs', 'agent-update-response.json'),
      JSON.stringify(result, null, 2)
    );
    
    console.log('\n📁 Response saved to: docs/elevenlabs/agent-update-response.json');
    
    // Display important changes
    console.log('\n🔧 Key updates applied:');
    console.log('   ✓ Enhanced prompt with mandatory tool usage rules');
    console.log('   ✓ Added time parameter for specific slot checking');
    console.log('   ✓ Improved handling of time changes and corrections');
    console.log('   ✓ Added critical rules to prevent assumptions about availability');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Test the agent with time-specific requests');
    console.log('   2. Verify tool calls are being made correctly');
    console.log('   3. Monitor webhook logs for proper parameter passing');
    
  } catch (error) {
    console.error('❌ Failed to update agent:', error.message);
    
    if (error.message.includes('404')) {
      console.log('\n⚠️  Agent not found. Please check your AGENT_ID');
      console.log('   You can find it in the ElevenLabs dashboard URL when viewing your agent');
    }
    
    process.exit(1);
  }
}

// List agents helper function
async function listAgents() {
  console.log('\n📋 Fetching your ElevenLabs agents...');
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`API Error ${response.status}`);
    }

    const data = await response.json();
    
    if (data.agents && data.agents.length > 0) {
      console.log('\n🤖 Available agents:');
      data.agents.forEach(agent => {
        console.log(`   - ${agent.name || 'Unnamed'}: ${agent.agent_id}`);
      });
      console.log('\nSet ELEVENLABS_AGENT_ID to one of these IDs and run the script again');
    } else {
      console.log('No agents found');
    }
  } catch (error) {
    console.error('Failed to list agents:', error.message);
  }
}

// Main execution
async function main() {
  if (process.argv.includes('--list')) {
    await listAgents();
  } else if (AGENT_ID) {
    await updateAgent();
  } else {
    console.log('To list your agents: node scripts/update-elevenlabs-agent.js --list');
    console.log('To update an agent: ELEVENLABS_AGENT_ID=your_id node scripts/update-elevenlabs-agent.js');
  }
}

// Add fetch polyfill for older Node versions
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main().catch(console.error);