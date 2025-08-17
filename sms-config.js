/**
 * SMS Configuration for Rehacentrum API
 * 
 * This file contains all SMS templates and settings for different appointment types.
 * You can easily modify SMS messages here without touching the main config.
 * 
 * Available placeholders:
 * - {patient_name}: Patient's full name
 * - {date_short}: Date in format D.M.YYYY (e.g., 18.8.2025)
 * - {time}: Time in format HH:mm (e.g., 15:30)
 * - {order_number}: Order number for appointments that use them
 * 
 * NOTE: Keep messages as single sentences to avoid multiple SMS segments (saves costs)
 */

const smsConfig = {
  // General SMS settings
  settings: {
    enabled: process.env.TWILIO_ENABLED === 'true',
    defaultSender: 'Rehacentrum Humenné',
    maxLength: 160, // Standard SMS length for single segment
    timezone: 'Europe/Bratislava'
  },

  // SMS templates for each appointment type
  templates: {
    sportova_prehliadka: {
      template: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín športovej prehliadky {date_short} o {time}. Cena 130€ v hotovosti. Príďte nalačno (8 hodín), prineste si jedlo, vodu a oblečenie na prezlečenie. Rehacentrum Humenné',
      description: 'Sports examination - requires fasting, cash payment',
      requiresOrderNumber: false,
      estimatedLength: 205
    },

    vstupne_vysetrenie: {
      template: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín vstupného vyšetrenia {date_short} o {time}. Poradové číslo: {order_number}. Hradí poisťovňa. Prineste si poukaz a zdravotnú kartičku. Rehacentrum Humenné',
      description: 'Initial examination - insurance covered, requires referral',
      requiresOrderNumber: true,
      estimatedLength: 188
    },

    kontrolne_vysetrenie: {
      template: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín kontrolného vyšetrenia {date_short} o {time}. Poradové číslo: {order_number}. Hradí poisťovňa. Prineste si zdravotnú kartičku a výsledky testov. Rehacentrum Humenné',
      description: 'Follow-up examination - insurance covered, requires test results',
      requiresOrderNumber: true,
      estimatedLength: 196
    },

    zdravotnicke_pomocky: {
      template: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín na zdravotnícke pomôcky {date_short} o {time}. Poradové číslo: {order_number}. Hradí poisťovňa. Prineste si zdravotnú kartičku a lekárske správy. Rehacentrum Humenné',
      description: 'Medical aids - insurance covered, requires medical reports',
      requiresOrderNumber: true,
      estimatedLength: 194
    },

    konzultacia: {
      template: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín konzultácie {date_short} o {time}. Poradové číslo: {order_number}. Cena 30€ v hotovosti. Rehacentrum Humenné',
      description: 'Consultation - cash payment required',
      requiresOrderNumber: true,
      estimatedLength: 147
    }
  },

  // Fallback template if appointment type not found
  fallbackTemplate: 'Dobrý deň {patient_name}, potvrdzujeme Vám termín {date_short} o {time}. Rehacentrum Humenné',

  // SMS templates for other notifications
  notifications: {
    cancellation: 'Dobrý deň {patient_name}, Váš termín na {date_short} o {time} bol zrušený. Pre ďalšie informácie nás kontaktujte. Rehacentrum Humenné',
    
    reschedule: 'Dobrý deň {patient_name}, Váš termín bol presunutý z {old_date} {old_time} na {new_date} o {new_time}. Poradové číslo: {order_number}. Rehacentrum Humenné',
    
    reminder: 'Dobrý deň {patient_name}, pripomíname Vám termín zajtra {date_short} o {time}. Tešíme sa na Vás. Rehacentrum Humenné',
    
    test: 'Testovacia správa z Rehacentrum API - {timestamp}'
  },

  // Validation settings
  validation: {
    phoneFormat: /^\+421\d{9}$/,
    maxMessageLength: 160,
    allowedCharacters: /^[a-zA-ZáčďéěíľňóôŕšťúýžÁČĎÉĚÍĽŇÓÔŔŠŤÚÝŽ0-9\s\.,!?():€+\-/]+$/
  }
};

/**
 * Get SMS template for appointment type
 * @param {string} appointmentType - The appointment type key
 * @returns {object} Template configuration
 */
function getSMSTemplate(appointmentType) {
  return smsConfig.templates[appointmentType] || {
    template: smsConfig.fallbackTemplate,
    description: 'Fallback template',
    requiresOrderNumber: false,
    estimatedLength: 100
  };
}

/**
 * Format SMS message with data
 * @param {string} appointmentType - The appointment type key
 * @param {object} data - Data to fill in template
 * @returns {string} Formatted SMS message
 */
function formatSMSMessage(appointmentType, data) {
  const templateConfig = getSMSTemplate(appointmentType);
  let message = templateConfig.template;

  // Replace placeholders
  message = message.replace('{patient_name}', data.patientName || data.patient_name || 'Pacient');
  message = message.replace('{date_short}', data.dateShort || data.date_short || '');
  message = message.replace('{time}', data.time || '');
  message = message.replace('{order_number}', data.orderNumber || data.order_number || 'N/A');
  
  // For notifications
  message = message.replace('{old_date}', data.oldDate || '');
  message = message.replace('{old_time}', data.oldTime || '');
  message = message.replace('{new_date}', data.newDate || '');
  message = message.replace('{new_time}', data.newTime || '');
  message = message.replace('{timestamp}', new Date().toLocaleString('sk-SK'));

  return message;
}

/**
 * Validate SMS message
 * @param {string} message - The SMS message
 * @returns {object} Validation result
 */
function validateSMSMessage(message) {
  const isValidLength = message.length <= smsConfig.validation.maxMessageLength;
  const hasValidCharacters = smsConfig.validation.allowedCharacters.test(message);
  
  return {
    valid: isValidLength && hasValidCharacters,
    length: message.length,
    maxLength: smsConfig.validation.maxMessageLength,
    validCharacters: hasValidCharacters,
    segmentCount: Math.ceil(message.length / 160)
  };
}

module.exports = {
  smsConfig,
  getSMSTemplate,
  formatSMSMessage,
  validateSMSMessage
};