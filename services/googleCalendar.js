const { google } = require('googleapis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('../config/config');

dayjs.extend(utc);
dayjs.extend(timezone);

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Google Calendar service...');
      
      // Try Railway build command file first (most reliable)
      let credentials;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && require('fs').existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.log('📁 Using GOOGLE_APPLICATION_CREDENTIALS file from Railway build command');
        try {
          credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
          console.log('✅ Successfully loaded credentials from Railway build file');
          console.log('🔑 Credential keys:', Object.keys(credentials));
        } catch (fileError) {
          console.error('❌ Failed to load credentials from file:', fileError);
          throw fileError;
        }
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.log('📝 Using GOOGLE_APPLICATION_CREDENTIALS_JSON from environment (fallback)');
        try {
          credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          console.log('✅ Successfully parsed GOOGLE_APPLICATION_CREDENTIALS_JSON');
          console.log('🔑 Credential keys:', Object.keys(credentials));
        } catch (parseError) {
          console.error('❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseError);
          throw parseError;
        }
      } else if (process.env.GOOGLE_CREDENTIALS) {
        console.log('📝 Using GOOGLE_CREDENTIALS from environment (fallback)');
        try {
          credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
          console.log('✅ Successfully parsed GOOGLE_CREDENTIALS JSON');
          console.log('🔑 Credential keys:', Object.keys(credentials));
          
          // Check if private_key looks valid
          if (credentials.private_key) {
            const pkeyStart = credentials.private_key.substring(0, 50);
            console.log('🔐 Private key starts with:', pkeyStart);
            
            // Check for proper line breaks
            if (credentials.private_key.includes('\\n')) {
              console.log('⚠️  Private key contains \\n - might need unescaping');
              credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
              console.log('🔧 Converted \\n to actual newlines');
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse GOOGLE_CREDENTIALS JSON:', parseError);
          throw parseError;
        }
      } else {
        console.log('📁 Using credentials from file (local development)');
        // Fallback to file (for local development)
        try {
          credentials = require(config.calendar.credentials);
          console.log('✅ Successfully loaded credentials from file');
        } catch (error) {
          console.error('❌ Credentials file not found:', error);
          throw new Error('Google credentials not found. Set GOOGLE_CREDENTIALS environment variable or provide credentials.json file.');
        }
      }
      
      console.log('🔐 Creating GoogleAuth with credentials...');
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      console.log('🌐 Getting auth client...');
      const authClient = await this.auth.getClient();
      console.log('✅ Auth client obtained successfully');
      
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
      this.initialized = true;
      
      console.log('✅ Google Calendar service initialized successfully - timezone fix active');
      
      // Test the connection with a simple API call
      console.log('🧪 Testing calendar connection...');
      try {
        const testResponse = await this.calendar.calendarList.list({ maxResults: 1 });
        console.log('✅ Calendar connection test successful');
      } catch (testError) {
        console.error('❌ Calendar connection test failed:', testError.message);
        throw testError;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar service:', error.message);
      console.error('🔍 Full error:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async createEvent(eventData) {
    await this.ensureInitialized();
    
    try {
      // Get appointment type configuration for proper Slovak name
      const typeConfig = config.appointmentTypes[eventData.appointmentType];
      const appointmentName = typeConfig ? typeConfig.name : eventData.appointmentType;
      
      // Manual timezone handling to ensure correct calendar time
      const startDateTime = eventData.dateTime + '+02:00';
      const endDateTime = dayjs(eventData.dateTime)
        .add(eventData.duration || 30, 'minute')
        .format('YYYY-MM-DDTHH:mm:ss') + '+02:00';
      

      
      const event = {
        summary: `${appointmentName} - ${eventData.patientName}`,
        description: this.formatEventDescription(eventData),
        start: {
          dateTime: startDateTime,
          timeZone: config.calendar.timeZone
        },
        end: {
          dateTime: endDateTime,
          timeZone: config.calendar.timeZone
        },
        colorId: eventData.colorId || typeConfig?.color || '1'
      };

      const response = await this.calendar.events.insert({
        calendarId: config.calendar.calendarId,
        resource: event
      });

      console.log('Event created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async getEvents(startDate, endDate) {
    await this.ensureInitialized();
    
    try {
      console.log(`📅 Getting events from ${startDate} to ${endDate}`);
      const response = await this.calendar.events.list({
        calendarId: config.calendar.calendarId,
        timeMin: dayjs(startDate).tz(config.calendar.timeZone).startOf('day').toISOString(),
        timeMax: dayjs(endDate).tz(config.calendar.timeZone).endOf('day').toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      console.log(`✅ Retrieved ${response.data.items?.length || 0} events`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ Failed to retrieve calendar events:', error.message);
      console.error('🔍 Full error:', error);
      throw error;
    }
  }

  async getEventsForDay(date) {
    const events = await this.getEvents(date, date);
    return events;
  }

  async deleteEvent(eventId) {
    await this.ensureInitialized();
    
    try {
      await this.calendar.events.delete({
        calendarId: config.calendar.calendarId,
        eventId: eventId
      });
      
      console.log('Event deleted successfully:', eventId);
      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  async deleteAllEventsForDate(date) {
    await this.ensureInitialized();
    
    try {
      console.log(`🗑️ Getting all events for ${date} to delete...`);
      const events = await this.getEventsForDay(date);
      
      if (events.length === 0) {
        console.log(`✅ No events found on ${date} to delete`);
        return { deleted: 0, message: `No events found on ${date}` };
      }

      console.log(`🗑️ Found ${events.length} events to delete on ${date}`);
      let deletedCount = 0;
      const deletedEvents = [];

      for (const event of events) {
        try {
          await this.deleteEvent(event.id);
          deletedCount++;
          deletedEvents.push({
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date
          });
          console.log(`✅ Deleted event: ${event.summary} (${event.id})`);
        } catch (error) {
          console.error(`❌ Failed to delete event ${event.id}:`, error.message);
        }
      }

      console.log(`🎉 Successfully deleted ${deletedCount}/${events.length} events from ${date}`);
      return {
        deleted: deletedCount,
        total: events.length,
        date: date,
        deletedEvents: deletedEvents,
        message: `Successfully deleted ${deletedCount} events from ${date}`
      };
    } catch (error) {
      console.error('Failed to delete events for date:', error);
      throw error;
    }
  }

  async updateEvent(eventId, updateData) {
    await this.ensureInitialized();
    
    try {
      const event = await this.calendar.events.get({
        calendarId: config.calendar.calendarId,
        eventId: eventId
      });

      const updatedEvent = {
        ...event.data,
        ...updateData
      };

      const response = await this.calendar.events.update({
        calendarId: config.calendar.calendarId,
        eventId: eventId,
        resource: updatedEvent
      });

      console.log('Event updated successfully:', eventId);
      return response.data;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  async findEventByPatient(patientName, phone, appointmentDate) {
    const events = await this.getEventsForDay(appointmentDate);
    
    // Clean phone number for comparison (remove spaces, dashes, etc)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // First priority: Exact phone match (most reliable)
    let exactPhoneMatch = events.find(event => {
      const description = event.description || '';
      const eventPhone = description.match(/Telefón:\s*([^\n]+)/)?.[1]?.replace(/[\s\-\(\)]/g, '') || '';
      return eventPhone === cleanPhone;
    });
    
    if (exactPhoneMatch) return exactPhoneMatch;
    
    // Second priority: Partial phone match (last 6 digits - handles country code differences)
    if (cleanPhone.length >= 6) {
      const lastSixDigits = cleanPhone.slice(-6);
      let partialPhoneMatch = events.find(event => {
        const description = event.description || '';
        const eventPhone = description.match(/Telefón:\s*([^\n]+)/)?.[1]?.replace(/[\s\-\(\)]/g, '') || '';
        return eventPhone.endsWith(lastSixDigits);
      });
      
      if (partialPhoneMatch) return partialPhoneMatch;
    }
    
    // Third priority: Name matching, but only if it's quite specific
    const nameParts = patientName.toLowerCase().trim().split(/\s+/);
    
    // Only proceed with name matching if we have a surname or specific enough name
    if (nameParts.length < 2 && nameParts[0].length < 4) {
      return null; // Too generic (like just "Ján")
    }
    
    const nameMatches = events.filter(event => {
      const summary = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const fullText = summary + ' ' + description;
      
      // For multiple name parts, require higher match rate
      let requiredMatchRate = nameParts.length >= 2 ? 0.8 : 1.0;
      
      const matchedParts = nameParts.filter(part => 
        part.length > 1 && fullText.includes(part)
      );
      
      return matchedParts.length >= Math.ceil(nameParts.length * requiredMatchRate);
    });
    
    // If multiple name matches, return null to force phone-based search
    if (nameMatches.length > 1) {
      return null;
    }
    
    return nameMatches.length === 1 ? nameMatches[0] : null;
  }

  formatEventDescription(eventData) {
    const orderNumber = eventData.orderNumber ? `🔢 PORADOVÉ ČÍSLO: ${eventData.orderNumber}\n\n` : '';
    const priceText = eventData.price === 0 ? 'hradí poisťovňa' : `${eventData.price}€`;
    
    return `${orderNumber}Typ vyšetrenia: ${eventData.appointmentType}
Pacient: ${eventData.patientName}
Telefón: ${eventData.phone}
Poisťovňa: ${eventData.insurance || 'N/A'}
Trvanie: ${eventData.duration || 30} minút
Cena: ${priceText}
Vytvorené: ${dayjs().tz(config.calendar.timeZone).format('DD.MM.YYYY HH:mm:ss')}`;
  }

  async getOrderNumber(appointmentType, date, appointmentDateTime) {
    // Sports examinations don't get order numbers
    const typeConfig = config.appointmentTypes[appointmentType];
    if (!typeConfig || !typeConfig.orderNumbers) {
      return null;
    }

    const events = await this.getEventsForDay(date);
    
    // Filter events that have order numbers (exclude sports exams and other non-numbered types)
    const orderedEvents = events.filter(event => {
      if (!event.start || !event.start.dateTime) return false;
      
      // Check if this event type uses order numbers
      const eventAppointmentType = Object.keys(config.appointmentTypes).find(type => {
        const typeName = config.appointmentTypes[type].name;
        return event.summary && event.summary.includes(typeName);
      });
      
      return eventAppointmentType && config.appointmentTypes[eventAppointmentType].orderNumbers;
    });

    // Sort events by time to get proper chronological order
    orderedEvents.sort((a, b) => {
      const timeA = dayjs(a.start.dateTime);
      const timeB = dayjs(b.start.dateTime);
      return timeA.isBefore(timeB) ? -1 : 1;
    });

    // Find the position where this new appointment should be inserted
    const appointmentTime = dayjs(appointmentDateTime);
    let orderNumber = 1;
    
    for (const event of orderedEvents) {
      const eventTime = dayjs(event.start.dateTime);
      if (appointmentTime.isAfter(eventTime)) {
        orderNumber++;
      } else {
        break;
      }
    }
    
    return orderNumber;
  }

  async isVacationDay(date) {
    const events = await this.getEventsForDay(date);
    return events.some(event => 
      event.summary && event.summary.includes(config.businessRules.vacationKeyword)
    );
  }

  async getAvailableSlots(date, appointmentType) {
    const typeConfig = config.appointmentTypes[appointmentType];
    if (!typeConfig) {
      throw new Error(`Invalid appointment type: ${appointmentType}`);
    }

    // Check if it's a working day first
    const holidayService = require('./holidayService');
    const isWorking = await holidayService.isWorkingDay(date);
    if (!isWorking) {
      return []; // Return no slots for non-working days
    }

    const events = await this.getEventsForDay(date);
    const typeEvents = events.filter(event => 
      event.summary && event.summary.includes(appointmentType.toUpperCase())
    );

    if (typeEvents.length >= typeConfig.dailyLimit) {
      return [];
    }

    const availableSlots = [];
    const occupiedTimes = new Set();

    events.forEach(event => {
      if (event.start && event.start.dateTime) {
        const startTime = dayjs(event.start.dateTime).tz(config.calendar.timeZone);
        occupiedTimes.add(startTime.format('HH:mm'));
      }
    });

    typeConfig.schedule.forEach(schedule => {
      console.log(`🕐 Processing schedule: ${schedule.start}-${schedule.end} for ${appointmentType}`);
      // Create times in local timezone without conversion
      let currentTime = dayjs(`${date} ${schedule.start}`, 'YYYY-MM-DD HH:mm', config.calendar.timeZone);
      const endTime = dayjs(`${date} ${schedule.end}`, 'YYYY-MM-DD HH:mm', config.calendar.timeZone);
      console.log(`🕐 Start time: ${currentTime.format('HH:mm')}, End time: ${endTime.format('HH:mm')}`);

      // Generate slots with both predefined intervals AND every 10-minute slot
      const allPossibleTimes = new Set();
      
      // Add predefined interval slots
      let intervalTime = currentTime.clone();
      while (intervalTime.isBefore(endTime)) {
        allPossibleTimes.add(intervalTime.format('HH:mm'));
        intervalTime = intervalTime.add(schedule.interval, 'minute');
      }
      
      // Add every 10-minute slot to cover user requests like 8:00
      let tenMinTime = currentTime.clone();
      while (tenMinTime.isBefore(endTime)) {
        allPossibleTimes.add(tenMinTime.format('HH:mm'));
        tenMinTime = tenMinTime.add(10, 'minute');
      }
      
      // Generate available slots from all possible times
      Array.from(allPossibleTimes).sort().forEach(timeSlot => {
        if (!occupiedTimes.has(timeSlot)) {
          const slotDateTime = dayjs(`${date} ${timeSlot}`, 'YYYY-MM-DD HH:mm', config.calendar.timeZone);
          availableSlots.push({
            time: timeSlot,
            datetime: slotDateTime.format(), // Use local timezone format with DST awareness
            available: true
          });
        }
      });
    });

    return availableSlots;
  }
}

module.exports = new GoogleCalendarService();