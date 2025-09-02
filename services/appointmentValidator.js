const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const weekday = require('dayjs/plugin/weekday');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const config = require('../config/config');
const googleCalendar = require('./googleCalendar');
const holidayService = require('./holidayService');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

class AppointmentValidator {
  
  // Normalize Slovak appointment names to internal codes
  // STRICT MATCHING: Only exact official names (case + accent insensitive)
  normalizeAppointmentType(appointmentType) {
    if (!appointmentType) return null;
    
    // Normalize for comparison: lowercase + remove accents
    const normalize = (str) => {
      return str.toLowerCase()
        .trim()
        .replace(/[áä]/g, 'a')
        .replace(/[éě]/g, 'e') 
        .replace(/[íî]/g, 'i')
        .replace(/[óô]/g, 'o')
        .replace(/[úů]/g, 'u')
        .replace(/[ýÿ]/g, 'y')
        .replace(/ť/g, 't')
        .replace(/ň/g, 'n')
        .replace(/š/g, 's')
        .replace(/č/g, 'c')
        .replace(/ž/g, 'z')
        .replace(/ď/g, 'd')
        .replace(/ľ/g, 'l')
        .replace(/ŕ/g, 'r');
    };
    
    const normalizedInput = normalize(appointmentType);
    
    // EXACT MATCHES ONLY - Official Slovak appointment names
    const exactMatches = {
      // Vstupné vyšetrenie variations
      'vstupne vysetrenie': 'vstupne_vysetrenie',
      
      // Kontrolné vyšetrenie variations  
      'kontrolne vysetrenie': 'kontrolne_vysetrenie',
      
      // Športová prehliadka variations
      'sportova prehliadka': 'sportova_prehliadka',
      
      // Zdravotnícke pomôcky variations
      'zdravotnicke pomocky': 'zdravotnicke_pomocky',
      
      // Konzultácia variations
      'konzultacia': 'konzultacia'
    };
    
    // Check exact match
    if (exactMatches[normalizedInput]) {
      console.log(`🔄 Normalized "${appointmentType}" → "${exactMatches[normalizedInput]}"`);
      return exactMatches[normalizedInput];
    }
    
    // If already in correct internal format, return as-is
    if (config.appointmentTypes[appointmentType]) {
      return appointmentType;
    }
    
    // No match found - return original (will likely fail validation)
    console.log(`❌ No normalization found for "${appointmentType}"`);
    return appointmentType;
  }
  
  validatePatientData(patientData) {
    const errors = [];
    const { requiredFields, phoneFormat } = config.validation;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!patientData[field] || patientData[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    // Validate phone format
    if (patientData.phone && !phoneFormat.test(patientData.phone)) {
      errors.push('Phone number must be in format +421XXXXXXXXX');
    }
    
    // Validate name length
    if (patientData.name && patientData.name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (patientData.surname && patientData.surname.length < 2) {
      errors.push('Surname must be at least 2 characters long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateAppointmentType(appointmentType) {
    if (!appointmentType) {
      return { isValid: false, error: 'Appointment type is required' };
    }
    
    // Normalize the appointment type first
    const normalizedType = this.normalizeAppointmentType(appointmentType);
    
    if (!config.appointmentTypes[normalizedType]) {
      return { 
        isValid: false, 
        error: `Invalid appointment type: ${appointmentType}`,
        availableTypes: Object.keys(config.appointmentTypes)
      };
    }
    
    return { isValid: true, normalizedType };
  }
  
  async validateDateTime(dateTime, appointmentType) {
    // Parse the datetime and extract just the time for validation  
    const appointmentDate = dayjs(dateTime);
    const now = dayjs().tz(config.calendar.timeZone);
    const typeConfig = config.appointmentTypes[appointmentType];
    
    // Check if date is in the past
    if (appointmentDate.isBefore(now, 'minute')) {
      return { 
        isValid: false, 
        error: 'Cannot book appointments in the past' 
      };
    }
    
    // Check minimum advance booking
    const minAdvanceTime = now.add(config.businessRules.minAdvanceBooking, 'hour');
    if (appointmentDate.isBefore(minAdvanceTime)) {
      return { 
        isValid: false, 
        error: `Appointments must be booked at least ${config.businessRules.minAdvanceBooking} hour(s) in advance` 
      };
    }
    
    // Check maximum advance booking
    const maxAdvanceTime = now.add(config.businessRules.maxAdvanceBooking, 'day');
    if (appointmentDate.isAfter(maxAdvanceTime)) {
      return { 
        isValid: false, 
        error: `Appointments can only be booked up to ${config.businessRules.maxAdvanceBooking} days in advance` 
      };
    }
    
    // Check if it's a working day
    const dayOfWeek = appointmentDate.day();
    if (!config.businessRules.workDays.includes(dayOfWeek)) {
      return { 
        isValid: false, 
        error: 'Appointments are only available Monday to Friday' 
      };
    }
    
    // Check if it's a holiday
    const isHoliday = await holidayService.isHoliday(appointmentDate.format('YYYY-MM-DD'));
    if (isHoliday) {
      return { 
        isValid: false, 
        error: 'No appointments available on public holidays' 
      };
    }
    
    // Check if it's a vacation day
    const isVacation = await googleCalendar.isVacationDay(appointmentDate.format('YYYY-MM-DD'));
    if (isVacation) {
      return { 
        isValid: false, 
        error: 'No appointments available on vacation days' 
      };
    }
    
    // Extract time from the datetime string, ignoring timezone conversion
    const appointmentTime = dayjs(dateTime).format('HH:mm');
    const isValidTime = typeConfig.schedule.some(schedule => {
      const startTime = dayjs(`2000-01-01 ${schedule.start}`);
      const endTime = dayjs(`2000-01-01 ${schedule.end}`);
      const currentTime = dayjs(`2000-01-01 ${appointmentTime}`);
      
      return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(endTime);
    });
    
    if (!isValidTime) {
      return { 
        isValid: false, 
        error: `Invalid time slot for ${typeConfig.name}. Time ${appointmentTime} not in range ${typeConfig.schedule.map(s => `${s.start}-${s.end}`).join(', ')}`,
        availableSchedule: typeConfig.schedule
      };
    }
    
    // Check if time slot aligns with intervals
    const isValidInterval = typeConfig.schedule.some(schedule => {
      const startTime = dayjs(`2000-01-01 ${schedule.start}`);
      const currentTime = dayjs(`2000-01-01 ${appointmentTime}`);
      const diffMinutes = currentTime.diff(startTime, 'minute');
      
      return diffMinutes % schedule.interval === 0;
    });
    
    if (!isValidInterval) {
      return { 
        isValid: false, 
        error: `Time slot ${appointmentTime} does not align with intervals. Available intervals: ${typeConfig.schedule.map(s => `${s.start} every ${s.interval}min`).join(', ')}`,
        scheduleInfo: typeConfig.schedule
      };
    }
    
    return { isValid: true };
  }
  
  async validateSlotAvailability(dateTime, appointmentType) {
    const date = dayjs(dateTime).format('YYYY-MM-DD');
    const time = dayjs(dateTime).format('HH:mm');
    
    const availableSlots = await googleCalendar.getAvailableSlots(date, appointmentType);
    const slotAvailable = availableSlots.some(slot => slot.time === time);
    
    if (!slotAvailable) {
      return { 
        isValid: false, 
        error: 'Time slot is not available',
        availableSlots: availableSlots.slice(0, 5) // Return first 5 available slots
      };
    }
    
    return { isValid: true };
  }
  
  async validateDailyLimit(date, appointmentType) {
    const typeConfig = config.appointmentTypes[appointmentType];
    const events = await googleCalendar.getEventsForDay(date);
    
    // Filter events by the actual Slovak appointment name that appears in calendar summaries
    // Event summaries are formatted as: "Appointment Name - Patient Name"
    const typeEvents = events.filter(event => {
      if (!event.summary) return false;
      
      // Check if the event summary starts with the Slovak appointment type name
      return event.summary.startsWith(typeConfig.name + ' -') || 
             event.summary.includes(typeConfig.name);
    });
    
    console.log(`🔍 Daily limit check for ${appointmentType} (${typeConfig.name}):`, {
      date,
      totalEvents: events.length,
      filteredEvents: typeEvents.length,
      limit: typeConfig.dailyLimit,
      eventSummaries: events.map(e => e.summary),
      matchedEvents: typeEvents.map(e => e.summary)
    });
    
    if (typeEvents.length >= typeConfig.dailyLimit) {
      return { 
        isValid: false, 
        error: `Denný limit bol dosiahnutý pre ${typeConfig.name} (${typeConfig.dailyLimit} termínov za deň). Skúste iný deň.`,
        currentCount: typeEvents.length,
        limit: typeConfig.dailyLimit
      };
    }
    
    return { isValid: true };
  }
  
  async validateCompleteAppointment(appointmentData) {
    const { patientData, appointmentType, dateTime } = appointmentData;
    const errors = [];
    
    // Validate patient data
    const patientValidation = this.validatePatientData(patientData);
    if (!patientValidation.isValid) {
      errors.push(...patientValidation.errors);
    }
    
    // Validate appointment type
    const typeValidation = this.validateAppointmentType(appointmentType);
    if (!typeValidation.isValid) {
      errors.push(typeValidation.error);
      return { isValid: false, errors };
    }
    
    // Validate date and time
    const dateTimeValidation = await this.validateDateTime(dateTime, appointmentType);
    if (!dateTimeValidation.isValid) {
      errors.push(dateTimeValidation.error);
    }
    
    // Validate daily limit
    const date = dayjs(dateTime).format('YYYY-MM-DD');
    const limitValidation = await this.validateDailyLimit(date, appointmentType);
    if (!limitValidation.isValid) {
      errors.push(limitValidation.error);
    }
    
    // Validate slot availability
    const slotValidation = await this.validateSlotAvailability(dateTime, appointmentType);
    if (!slotValidation.isValid) {
      errors.push(slotValidation.error);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: slotValidation.availableSlots || []
    };
  }
  
  async findAlternativeSlots(appointmentType, preferredDate, daysToSearch = 7) {
    const alternatives = [];
    const startDate = dayjs(preferredDate).tz(config.calendar.timeZone);
    
    for (let i = 0; i < daysToSearch; i++) {
      const checkDate = startDate.add(i, 'day');
      const dateString = checkDate.format('YYYY-MM-DD');
      
      // Skip weekends
      if (!config.businessRules.workDays.includes(checkDate.day())) {
        continue;
      }
      
      // Skip holidays
      const isHoliday = await holidayService.isHoliday(dateString);
      if (isHoliday) {
        continue;
      }
      
      // Skip vacation days
      const isVacation = await googleCalendar.isVacationDay(dateString);
      if (isVacation) {
        continue;
      }
      
      // Get available slots
      const availableSlots = await googleCalendar.getAvailableSlots(dateString, appointmentType);
      
      if (availableSlots.length > 0) {
        alternatives.push({
          date: dateString,
          dayName: checkDate.format('dddd'),
          slots: availableSlots.slice(0, 3) // First 3 slots
        });
      }
      
      // Stop if we have enough alternatives
      if (alternatives.length >= 5) {
        break;
      }
    }
    
    return alternatives;
  }
  
  formatValidationError(error, appointmentType) {
    const typeConfig = config.appointmentTypes[appointmentType];
    
    return {
      error: error,
      appointmentType: typeConfig ? typeConfig.name : appointmentType,
      requirements: typeConfig ? typeConfig.requirements : [],
      schedule: typeConfig ? typeConfig.schedule : [],
      price: typeConfig ? `${typeConfig.price}€` : 'N/A',
      insurance: typeConfig ? typeConfig.insurance : false
    };
  }
}

module.exports = new AppointmentValidator();