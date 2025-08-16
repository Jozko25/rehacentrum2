const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const localeData = require('dayjs/plugin/localeData');
require('dayjs/locale/sk');

// Configure dayjs with Slovak locale
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.locale('sk');

// Import services
const config = require('../../config');
const googleCalendar = require('../../googleCalendar');
const appointmentValidator = require('../../appointmentValidator');
const smsService = require('../../smsService');
const holidayService = require('../../holidayService');
const { addLog } = require('../../lib/logger');

// Handle getting more available slots
async function handleGetMoreSlots(parameters) {
  const { date, appointment_type, current_count = 2 } = parameters;
  
  if (!date || !appointment_type) {
    return {
      success: false,
      message: "Došla k chybe"
    };
  }

  try {
    const typeValidation = appointmentValidator.validateAppointmentType(appointment_type);
    if (!typeValidation.isValid) {
      return {
        success: false,
        message: "Došla k chybe"
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

    // Show one more slot than currently shown
    const newCount = current_count + 1;
    const slotsToShow = availableSlots.slice(0, newCount);
    
    if (slotsToShow.length <= current_count) {
      return {
        success: true,
        message: `To sú všetky dostupné termíny pre ${typeConfig.name} na ${dayName} ${formattedDate}.`
      };
    }

    const slotTimes = slotsToShow.map(slot => slot.time).join(', ');

    
    let message = `Na ${dayName} ${formattedDate} sú dostupné tieto termíny pre ${typeConfig.name}: ${slotTimes}.`;
    
    // Add hint if there are more slots available
    if (availableSlots.length > slotsToShow.length) {
      message += ` Máme ešte ďalšie voľné termíny ak potrebujete.`;
    }
    
    return {
      success: true,
      message: message
    };
  } catch (error) {
    return {
      success: false,
      message: "Došla k chybe"
    };
  }
}

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
  const { date, appointment_type, offset = 0, show_more = false } = parameters;
  
  if (!date || !appointment_type) {
    return {
      success: false,
      message: "Došla k chybe"
    };
  }

  try {
    const typeValidation = appointmentValidator.validateAppointmentType(appointment_type);
    if (!typeValidation.isValid) {
      return {
        success: false,
        message: "Došla k chybe"
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

    // Progressive slot loading
    let slotsToShow;
    if (show_more && offset > 0) {
      // Show one additional slot when requesting more
      slotsToShow = availableSlots.slice(0, offset + 1);
    } else {
      // Show first 2 slots initially
      slotsToShow = availableSlots.slice(0, 2);
    }

    const slotTimes = slotsToShow.map(slot => slot.time).join(', ');

    
    let message = `Na ${dayName} ${formattedDate} sú dostupné tieto termíny pre ${typeConfig.name}: ${slotTimes}.`;
    
    // Add hint if there are more slots available
    if (availableSlots.length > slotsToShow.length) {
      message += ` Máme ešte ďalšie voľné termíny ak potrebujete.`;
    }
    
    return {
      success: true,
      message: message
    };
  } catch (error) {
    return {
      success: false,
      message: "Došla k chybe"
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

      const dayPrefix = foundSlot.days_from_preferred === 0 ? 'dnes' : 
                       foundSlot.days_from_preferred === 1 ? 'zajtra' : 
                       `za ${foundSlot.days_from_preferred} dní`;
      
      return {
        success: true,
        message: `Najbližší voľný termín pre ${foundSlot.appointment_type} je ${dayPrefix} (${foundSlot.day_name} ${formattedDate}) o ${foundSlot.time}.`
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
      message: "Došla k chybe"
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
    insurance
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
      insurance: insurance
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
    
    // Final check to prevent duplicates
    const finalAvailabilityCheck = await appointmentValidator.validateSlotAvailability(date_time, appointment_type);
    if (!finalAvailabilityCheck.isValid) {
      return {
        success: false,
        message: "Termín už nie je dostupný. Niekto iný ho medzitým rezervoval."
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

    
    return {
      success: true,
      message: `Termín bol úspešne rezervovaný. ${patient_name} ${patient_surname} má objednaný ${typeConfig.name} na ${dayName} ${formattedDate} o ${formattedTime}. Poradové číslo: ${orderNumber}. ${smsResult?.success ? 'SMS potvrdenie bolo odoslané.' : ''}`
    };
  } catch (error) {
    return {
      success: false,
      message: "Došla k chybe"
    };
  }
}

async function handleCancelAppointment(parameters) {
  const { patient_name, full_patient_name, phone, appointment_date } = parameters;
  const patientName = patient_name || full_patient_name;
  
  if (!patientName || !phone || !appointment_date) {
    return {
      success: false,
      message: "Na zrušenie termínu potrebujem meno pacienta, telefónne číslo a dátum termínu."
    };
  }

  try {
    // Find the appointment
    const event = await googleCalendar.findEventByPatient(patientName, phone, appointment_date);
    
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
  const { patient_name, full_patient_name, phone, old_date, new_date_time, new_date, new_time } = parameters;
  const patientName = patient_name || full_patient_name;
  
  // Handle both formats: combined new_date_time or separate new_date + new_time
  let finalNewDateTime = new_date_time;
  if (!finalNewDateTime && new_date && new_time) {
    finalNewDateTime = `${new_date}T${new_time}:00`;
  }
  
  if (!patientName || !phone || !old_date || !finalNewDateTime) {
    return {
      success: false,
      message: "Na presunutie termínu potrebujem meno pacienta, telefónne číslo, pôvodný dátum a nový dátum s časom."
    };
  }

  try {
    // SECURITY: Reject generic single names immediately
    const nameParts = patientName.trim().split(/\s+/);
    if (nameParts.length === 1 && nameParts[0].length <= 4) {
      return {
        success: false,
        error: "Pre bezpečnosť potrebujem celé meno a priezvisko pre presunutie termínu."
      };
    }

    // Find the existing appointment
    const existingEvent = await googleCalendar.findEventByPatient(patientName, phone, old_date);
    
    if (!existingEvent) {
      // SECURITY: NO NAME FALLBACK MATCHING - only phone-based hints
      const allEvents = await googleCalendar.getEventsForDay(old_date);
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Only check for phone matches - NO name-based suggestions
      const phoneMatches = allEvents.filter(event => {
        const description = event.description || '';
        const eventPhone = description.match(/Telefón:\s*([^\n]+)/)?.[1]?.replace(/[\s\-\(\)]/g, '') || '';
        return eventPhone.includes(cleanPhone.slice(-6)); // Last 6 digits
      });
      
      let errorMessage = "Pôvodný termín sa nenašiel.";
      
      if (phoneMatches.length > 0) {
        errorMessage += " Našiel som termín s podobným telefónom - skontrolujte presný formát čísla a celé meno.";
      } else {
        errorMessage += " Skontrolujte presné meno, priezvisko, telefón a dátum.";
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    // Extract appointment type from existing event
    const summary = existingEvent.summary || '';
    const appointmentType = Object.keys(config.appointmentTypes).find(type => {
      const typeName = config.appointmentTypes[type].name;
      return summary.includes(typeName);
    });
    
    if (!appointmentType) {
      return {
        success: false,
        error: "Nepodarilo sa určiť typ termínu z pôvodného záznamu."
      };
    }
    
    // Validate new slot
    const slotValidation = await appointmentValidator.validateSlotAvailability(finalNewDateTime, appointmentType);
    if (!slotValidation.isValid) {
      return {
        success: false,
        error: slotValidation.error,
        alternatives: slotValidation.availableSlots
      };
    }
    
    // Delete old appointment
    await googleCalendar.deleteEvent(existingEvent.id);
    
    // Extract full patient name from original event (preserve full name format)
    const originalDescription = existingEvent.description || '';
    const originalPatientMatch = originalDescription.match(/Pacient:\s*([^\n]+)/);
    const fullOriginalName = originalPatientMatch ? originalPatientMatch[1].trim() : patientName;
    
    // Create new appointment
    const typeConfig = config.appointmentTypes[appointmentType];
    const newOrderNumber = await googleCalendar.getOrderNumber(appointmentType, dayjs(finalNewDateTime).format('YYYY-MM-DD'));
    
    const eventData = {
      appointmentType: appointmentType,
      patientName: fullOriginalName, // Use full name from original event
      phone: phone,
      insurance: 'Existing patient', // Preserve from original
      dateTime: finalNewDateTime,
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
        patientName: patientName,
        phone: phone,
        date: dayjs(finalNewDateTime).format('DD.MM.YYYY'),
        time: dayjs(finalNewDateTime).format('HH:mm'),
        orderNumber: newOrderNumber
      };
      
      smsResult = await smsService.sendRescheduleNotification(oldAppointment, newAppointment);
    }
    
    const oldDate = dayjs(old_date).format('DD.MM.YYYY');
    const oldTime = dayjs(existingEvent.start.dateTime).tz(config.calendar.timeZone).format('HH:mm');
    const newDate = dayjs(finalNewDateTime).format('DD.MM.YYYY');
    const newTime = dayjs(finalNewDateTime).format('HH:mm');
    const newDayName = dayjs(finalNewDateTime).format('dddd');
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
    const errorMessage = 'Došla k chybe';
    const errorResponse = { 
      error: 'Method not allowed',
      message: errorMessage
    };
    
    addLog('webhook', `${req.method} ${req.url} - 405`, null, requestData, errorResponse);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(405).send(errorMessage);
  }

  try {
    // Handle both old format {action, parameters} and new format with action in body
    let action, parameters;
    
    if (req.body.action && req.body.parameters) {
      // Old format
      action = req.body.action;
      parameters = req.body.parameters;
    } else if (req.body.action) {
      // New format - action is in body, other fields are parameters
      action = req.body.action;
      parameters = { ...req.body };
      delete parameters.action;
    } else {
      const errorMessage = 'Došla k chybe';
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
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send(errorMessage);
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
        
      case 'get_more_slots':
        result = await handleGetMoreSlots(parameters || {});
        break;
        
      default:
        result = {
          success: false,
          message: 'Došla k chybe'
        };
    }
    
    // Log the webhook call
    await logWebhookCall(action, requestData, result);
    addLog('webhook', `${action} - ${result.success ? 'SUCCESS' : 'ERROR'}`, null, requestData, result);
    
    // Return plain text response instead of JSON
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(result.message || result.error || 'Neočakávaná chyba');
  } catch (error) {
    const errorMessage = 'Došla k chybe';
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: errorMessage
    };
    
    addLog('webhook', `${req.method} ${req.url} - 500 (${error.message})`, null, requestData, errorResponse);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send(errorMessage);
  }
};