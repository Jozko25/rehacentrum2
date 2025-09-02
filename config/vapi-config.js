const config = {
  // VAPI.ai API Configuration
  api: {
    baseUrl: 'https://api.vapi.ai',
    apiKey: process.env.VAPI_API_KEY,
    enabled: process.env.VAPI_ENABLED === 'true',
  },
  
  // Assistant Configuration
  assistant: {
    id: process.env.VAPI_ASSISTANT_ID,
    name: 'Rehacentrum Booking Assistant',
    language: 'sk', // Slovak
    voice: {
      provider: 'elevenlabs', // Can use ElevenLabs voices through VAPI
      voiceId: process.env.VAPI_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Default voice
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true
    },
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
      emotionRecognitionEnabled: true
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'sk',
      smartFormat: true,
      punctuate: true
    },
    firstMessage: "Dobrý deň, volajte do Rehacentra Humenné. Som Vaša asistentka pre rezervácie. Ako Vám môžem pomôcť?",
    voicemailMessage: "Ďakujeme za váš hovor. Momentálne nie sme dostupní. Skúste to prosím neskôr alebo nás kontaktujte cez našu webovú stránku.",
    endCallMessage: "Ďakujem za váš hovor. Maj sa pekne!",
    backgroundSound: "office",
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    modelOutputInMessagesEnabled: true
  },
  
  // Phone Configuration
  phone: {
    number: process.env.VAPI_PHONE_NUMBER,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    provider: 'twilio'
  },
  
  // Webhook Configuration
  webhook: {
    url: process.env.VAPI_WEBHOOK_URL || 'https://rehacentrum2-production.up.railway.app/api/booking/vapi-webhook',
    secret: process.env.VAPI_WEBHOOK_SECRET,
    timeoutSeconds: 30
  },
  
  // Health Monitoring
  healthCheck: {
    enabled: process.env.AUTO_FAILOVER_ENABLED === 'true',
    elevenlabsHealthCheckInterval: parseInt(process.env.ELEVENLABS_HEALTH_CHECK_INTERVAL) || 30000,
    elevenlabsHealthEndpoint: 'https://api.elevenlabs.io/v1/models',
    maxRetries: 3,
    retryInterval: 5000
  },
  
  // Platform Management
  platform: {
    forcePlatform: process.env.FORCE_PLATFORM || 'auto', // auto, elevenlabs, vapi
    priorityPlatform: 'elevenlabs', // Primary platform
    fallbackPlatform: 'vapi' // Fallback platform
  },
  
  // Call Recording & Analytics
  recording: {
    enabled: false, // Set to true if you want call recordings
    provider: 'vapi'
  },
  
  // Advanced Features
  features: {
    callTransfer: false,
    voicemail: true,
    callScreening: false,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800, // 30 minutes max call duration
    backgroundSound: 'office'
  }
};

module.exports = config;