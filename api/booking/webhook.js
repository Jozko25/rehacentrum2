const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Import services
const config = require('../../config');
const googleCalendar = require('../../googleCalendar');
const appointmentValidator = require('../../appointmentValidator');
const smsService = require('../../smsService');
const holidayService = require('../../holidayService');
const { addLog } = require('../../lib/logger');

// Function to log webhook calls to persistent storage
async function logWebhookCall(action, requestData, responseData) {
  try {
    const logData = {
      action,
      requestData,
      responseData,
      success: responseData.success || false
    };
    
    // Post to webhook storage endpoint
    const response = await fetch('https://rehacentrum.vercel.app/api/webhook-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
    
    if (response.ok) {
      console.log(`✅ Webhook log stored: ${action}`);
    } else {
      console.log(`❌ Failed to store webhook log: ${action}`);
    }
  } catch (error) {
    console.error('Failed to log webhook call:', error);
  }
}

dayjs.extend(utc);
dayjs.extend(timezone);

// Initialize services
let servicesInitialized = false;

async function initializeServices() {
  if (servicesInitialized) return;
  
  try {
    await googleCalendar.initialize();
    await smsService.initialize();
    servicesInitialized = true;
    console.log('ElevenLabs webhook services initialized');
  } catch (error) {
    console.error('Failed to initialize webhook services:', error);
    throw error;
  }
}

async function handleGetAvailableSlots(parameters) {
  const { date, appointment_type } = parameters;
  
  if (!date || !appointment_type) {
    return {
      success: false,
      message: "Potrebujem dátum a typ vyšetrenia na vyhľadanie voľných termínov."
    };
  }

  try {
    const typeValidation = appointmentValidator.validateAppointmentType(appointment_type);
    if (!typeValidation.isValid) {
      return {
        success: false,
        message: `Neplatný typ vyšetrenia. Dostupné typy sú: ${typeValidation.availableTypes.join(', ')}.`
      };
    }

    const availableSlots = await googleCalendar.getAvailableSlots(date, appointment_type);
    const typeConfig = config.appointmentTypes[appointment_type];
    const formattedDate = dayjs(date).format('DD.MM.YYYY');
    const dayName = dayjs(date).format('dddd');

    if (availableSlots.length === 0) {
      return {
        success: true,
        message: `Žiaľ, na ${dayName} ${formattedDate} nie sú dostupné žiadne voľné termíny pre ${typeConfig.name}.`
      };
    }

    const slotTimes = availableSlots.slice(0, 10).map(slot => slot.time).join(', ');
    const priceInfo = typeConfig.price === 0 ? 'hradí poisťovňa' : `${typeConfig.price}€`;
    
    return {
      success: true,
      message: `Na ${dayName} ${formattedDate} sú dostupné tieto termíny pre ${typeConfig.name}: ${slotTimes}. Cena: ${priceInfo}.`
    };
  } catch (error) {
    return {
      success: false,
      message: "Došlo k chybe pri vyhľadávaní voľných termínov. Skúste to prosím znovu."
    };
  }
}

async function handleFindClosestSlot(parameters) {
  const { appointment_type, preferred_date, days_to_search = 7 } = parameters;
  
  if (!appointment_type) {
    return {
      success: false,
      message: "Potrebujem typ vyšetrenia na vyhľadanie najbližšieho termínu."
    };
  }

  try {
    const typeValidation = appointmentValidator.validateAppointmentType(appointment_type);
    if (!typeValidation.isValid) {
      return {
        success: false,
        message: `Neplatný typ vyšetrenia. Dostupné typy sú: ${typeValidation.availableTypes.join(', ')}.`
      };
    }

    const startDate = preferred_date ? dayjs(preferred_date) : dayjs().tz(config.calendar.timeZone);
    let foundSlot = null;
    
    for (let i = 0; i < days_to_search; i++) {
      const checkDate = startDate.add(i, 'day');
      const dateString = checkDate.format('YYYY-MM-DD');
      
      if (await holidayService.isWorkingDay(dateString)) {
        const slots = await googleCalendar.getAvailableSlots(dateString, appointment_type);
        if (slots.length > 0) {
          const typeConfig = config.appointmentTypes[appointment_type];
          foundSlot = {
            date: dateString,
            day_name: checkDate.format('dddd'),
            time: slots[0].time,
            datetime: slots[0].datetime,
            days_from_preferred: i,
            appointment_type: typeConfig.name,
            price: `${typeConfig.price}€`,
            insurance_covered: typeConfig.insurance
          };
          break;
        }
      }
    }
    
    if (foundSlot) {
      const formattedDate = dayjs(foundSlot.date).format('DD.MM.YYYY');
      const priceInfo = foundSlot.price === '0€' ? 'hradí poisťovňa' : foundSlot.price;
      const dayPrefix = foundSlot.days_from_preferred === 0 ? 'dnes' : 
                       foundSlot.days_from_preferred === 1 ? 'zajtra' : 
                       `za ${foundSlot.days_from_preferred} dní`;
      
      return {
        success: true,
        message: `Najbližší voľný termín pre ${foundSlot.appointment_type} je ${dayPrefix} (${foundSlot.day_name} ${formattedDate}) o ${foundSlot.time}. Cena: ${priceInfo}.`
      };
    } else {
      return {
        success: true,
        message: `Žiaľ, v najbližších ${days_to_search} dňoch nie sú dostupné žiadne voľné termíny pre ${config.appointmentTypes[appointment_type].name}.`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Došlo k chybe pri vyhľadávaní najbližšieho termínu. Skúste to prosím znovu."
    };
  }
}

async function handleBookAppointment(parameters) {
  const { 
    appointment_type, 
    date_time, 
    patient_name, 
    patient_surname, 
    phone, 
    insurance, 
    email, 
    birth_id 
  } = parameters;
  
  if (!appointment_type || !date_time || !patient_name || !patient_surname || !phone || !insurance) {
    return {
      success: false,
      message: "Na rezerváciu termínu potrebujem tieto údaje: typ vyšetrenia, dátum a čas, meno, priezvisko, telefónne číslo a poisťovňu."
    };
  }

  try {
    const patientData = {
      name: patient_name,
      surname: patient_surname,
      phone: phone,
      insurance: insurance,
      email: email || '',
      birthId: birth_id || ''
    };

    // Validate complete appointment
    const validation = await appointmentValidator.validateCompleteAppointment({
      patientData,
      appointmentType: appointment_type,
      dateTime: date_time
    });
    
    if (!validation.isValid) {
      const alternatives = await appointmentValidator.findAlternativeSlots(
        appointment_type,
        dayjs(date_time).format('YYYY-MM-DD'),
        5
      );
      
      const errorMessage = `Termín sa nepodarilo rezervovať: ${validation.errors.join(', ')}`;
      const altText = alternatives.length > 0 ? 
        ` Alternatívne termíny: ${alternatives.slice(0, 3).map(alt => 
          `${alt.dayName} ${dayjs(alt.date).format('DD.MM.')} (${alt.slots.slice(0, 2).map(s => s.time).join(', ')})`
        ).join('; ')}.` : '';
      
      return {
        success: false,
        message: errorMessage + altText
      };
    }
    
    // Get order number
    const date = dayjs(date_time).format('YYYY-MM-DD');
    const orderNumber = await googleCalendar.getOrderNumber(appointment_type, date);
    
    // Create calendar event
    const typeConfig = config.appointmentTypes[appointment_type];
    const eventData = {
      appointmentType: appointment_type,
      patientName: `${patient_name} ${patient_surname}`,
      phone: phone,
      insurance: insurance,
      email: email,
      birthId: birth_id,
      dateTime: date_time,
      duration: typeConfig.duration,
      price: typeConfig.price,
      colorId: typeConfig.color,
      orderNumber
    };
    
    const event = await googleCalendar.createEvent(eventData);
    
    // Send SMS confirmation if enabled
    let smsResult = null;
    if (smsService.getStatus().enabled) {
      const smsData = {
        ...eventData,
        dateShort: dayjs(date_time).format('D.M.'),
        time: dayjs(date_time).format('HH:mm')
      };
      smsResult = await smsService.sendAppointmentConfirmation(smsData);
    }
    
    const formattedDate = dayjs(date_time).format('DD.MM.YYYY');
    const formattedTime = dayjs(date_time).format('HH:mm');
    const dayName = dayjs(date_time).format('dddd');
    const priceInfo = typeConfig.price === 0 ? 'hradí poisťovňa' : `${typeConfig.price}€`;
    
    return {
      success: true,
      message: `Termín bol úspešne rezervovaný. ${patient_name} ${patient_surname} má objednaný ${typeConfig.name} na ${dayName} ${formattedDate} o ${formattedTime}. Poradové číslo: ${orderNumber}. Cena: ${priceInfo}. ${smsResult?.success ? 'SMS potvrdenie bolo odoslané.' : ''}`
    };
  } catch (error) {
    return {
      success: false,
      message: "Došlo k chybe pri rezervácii termínu. Skúste to prosím znovu."
    };
  }
}

async function handleCancelAppointment(parameters) {
  const { patient_name, phone, appointment_date } = parameters;
  
  if (!patient_name || !phone || !appointment_date) {
    return {
      success: false,
      message: "Na zrušenie termínu potrebujem meno pacienta, telefónne číslo a dátum termínu."
    };
  }

  try {
    // Find the appointment
    const event = await googleCalendar.findEventByPatient(patient_name, phone, appointment_date);
    
    if (!event) {
      return {
        success: false,
        message: "Termín sa nenašiel. Skontrolujte prosím meno, telefónne číslo a dátum termínu."
      };
    }
    
    // Delete the event
    await googleCalendar.deleteEvent(event.id);
    
    // Send cancellation SMS if enabled
    let smsResult = null;
    if (smsService.getStatus().enabled) {
      const appointmentData = {
        patientName: patient_name,
        phone: phone,
        date: dayjs(appointment_date).format('DD.MM.YYYY'),
        time: dayjs(event.start.dateTime).format('HH:mm')
      };
      smsResult = await smsService.sendCancellationNotification(appointmentData);
    }
    
    const formattedDate = dayjs(appointment_date).format('DD.MM.YYYY');
    const formattedTime = dayjs(event.start.dateTime).format('HH:mm');
    const smsText = smsResult?.success ? ' SMS potvrdenie o zrušení bolo odoslané.' : '';
    
    return {
      success: true,
      message: `Termín bol úspešne zrušený. ${patient_name} mal objednaný termín na ${formattedDate} o ${formattedTime}.${smsText}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleRescheduleAppointment(parameters) {
  const { patient_name, phone, old_date, new_date_time } = parameters;
  
  if (!patient_name || !phone || !old_date || !new_date_time) {
    return {
      success: false,
      message: "Na presunutie termínu potrebujem meno pacienta, telefónne číslo, pôvodný dátum a nový dátum s časom."
    };
  }

  try {
    // Find the existing appointment
    const existingEvent = await googleCalendar.findEventByPatient(patient_name, phone, old_date);
    
    if (!existingEvent) {
      return {
        success: false,
        error: "Pôvodný termín sa nenašiel"
      };
    }
    
    // Extract appointment type from existing event
    const summary = existingEvent.summary || '';
    const appointmentType = Object.keys(config.appointmentTypes).find(type => 
      summary.includes(type.toUpperCase())
    );
    
    if (!appointmentType) {
      return {
        success: false,
        error: "Nepodarilo sa určiť typ termínu"
      };
    }
    
    // Validate new slot
    const slotValidation = await appointmentValidator.validateSlotAvailability(new_date_time, appointmentType);
    if (!slotValidation.isValid) {
      return {
        success: false,
        error: slotValidation.error,
        alternatives: slotValidation.availableSlots
      };
    }
    
    // Delete old appointment
    await googleCalendar.deleteEvent(existingEvent.id);
    
    // Create new appointment
    const typeConfig = config.appointmentTypes[appointmentType];
    const newOrderNumber = await googleCalendar.getOrderNumber(appointmentType, dayjs(new_date_time).format('YYYY-MM-DD'));
    
    const eventData = {
      appointmentType: appointmentType,
      patientName: patient_name,
      phone: phone,
      insurance: 'Existing patient', // Preserve from original
      dateTime: new_date_time,
      duration: typeConfig.duration,
      price: typeConfig.price,
      colorId: typeConfig.color,
      orderNumber: newOrderNumber
    };
    
    const newEvent = await googleCalendar.createEvent(eventData);
    
    // Send reschedule SMS if enabled
    let smsResult = null;
    if (smsService.getStatus().enabled) {
      const oldAppointment = {
        date: dayjs(old_date).format('DD.MM.YYYY'),
        time: dayjs(existingEvent.start.dateTime).format('HH:mm')
      };
      
      const newAppointment = {
        patientName: patient_name,
        phone: phone,
        date: dayjs(new_date_time).format('DD.MM.YYYY'),
        time: dayjs(new_date_time).format('HH:mm'),
        orderNumber: newOrderNumber
      };
      
      smsResult = await smsService.sendRescheduleNotification(oldAppointment, newAppointment);
    }
    
    const oldDate = dayjs(old_date).format('DD.MM.YYYY');
    const oldTime = dayjs(existingEvent.start.dateTime).format('HH:mm');
    const newDate = dayjs(new_date_time).format('DD.MM.YYYY');
    const newTime = dayjs(new_date_time).format('HH:mm');
    const newDayName = dayjs(new_date_time).format('dddd');
    const smsText = smsResult?.success ? ' SMS potvrdenie o presunutí bolo odoslané.' : '';
    
    return {
      success: true,
      message: `Termín bol úspešne presunutý. Pôvodný termín ${oldDate} o ${oldTime} bol presunutý na ${newDayName} ${newDate} o ${newTime}. Nové poradové číslo: ${newOrderNumber}.${smsText}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleSendFallbackSms(parameters) {
  const { phone, message } = parameters;
  
  if (!phone || !message) {
    return {
      success: false,
      message: "Na odoslanie SMS potrebujem telefónne číslo a správu."
    };
  }

  try {
    const result = await smsService.sendFallbackMessage({ phone }, message);
    
    return {
      success: result.success,
      message: result.success ? 
        `SMS správa bola úspešne odoslaná na číslo ${phone}.` : 
        `SMS sa nepodarilo odoslať na číslo ${phone}. ${result.reason || 'Skúste to prosím znovu.'}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main webhook handler
module.exports = async (req, res) => {
  // Initialize services on first request
  await initializeServices();
  
  // Log the incoming webhook request
  const requestData = {
    method: req.method,
    path: req.url,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  };
  
  if (req.method !== 'POST') {
    const errorResponse = { 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    };
    
    addLog('webhook', `${req.method} ${req.url} - 405`, null, requestData, errorResponse);
    return res.status(405).json(errorResponse);
  }

  try {
    const { action, parameters } = req.body;
    
    if (!action) {
      const errorResponse = {
        error: 'Missing action parameter',
        supported_actions: [
          'get_available_slots',
          'find_closest_slot', 
          'book_appointment',
          'cancel_appointment',
          'reschedule_appointment',
          'send_fallback_sms'
        ]
      };
      
      addLog('webhook', `${req.method} ${req.url} - 400 (no action)`, null, requestData, errorResponse);
      return res.status(400).json(errorResponse);
    }

    addLog('webhook', `ElevenLabs webhook: ${action}`, parameters);
    
    let result;
    
    switch (action) {
      case 'get_available_slots':
        result = await handleGetAvailableSlots(parameters || {});
        break;
        
      case 'find_closest_slot':
        result = await handleFindClosestSlot(parameters || {});
        break;
        
      case 'book_appointment':
        result = await handleBookAppointment(parameters || {});
        break;
        
      case 'cancel_appointment':
        result = await handleCancelAppointment(parameters || {});
        break;
        
      case 'reschedule_appointment':
        result = await handleRescheduleAppointment(parameters || {});
        break;
        
      case 'send_fallback_sms':
        result = await handleSendFallbackSms(parameters || {});
        break;
        
      default:
        result = {
          success: false,
          error: `Unsupported action: ${action}`,
          supported_actions: [
            'get_available_slots',
            'find_closest_slot',
            'book_appointment', 
            'cancel_appointment',
            'reschedule_appointment',
            'send_fallback_sms'
          ]
        };
    }
    
    // Log the webhook call
    await logWebhookCall(action, requestData, result);
    addLog('webhook', `${action} - ${result.success ? 'SUCCESS' : 'ERROR'}`, null, requestData, result);
    
    res.json(result);
  } catch (error) {
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: 'Došlo k chybe. Skúste to prosím znovu.'
    };
    
    addLog('webhook', `${req.method} ${req.url} - 500 (${error.message})`, null, requestData, errorResponse);
    
    res.status(500).json(errorResponse);
  }
};