const { google } = require('googleapis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('./config');

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
      // Try environment variables first (for production)
      let credentials;
      if (process.env.GOOGLE_CREDENTIALS) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      } else {
        // Fallback to file (for local development)
        try {
          credentials = require(config.calendar.credentials);
        } catch (error) {
          throw new Error('Google credentials not found. Set GOOGLE_CREDENTIALS environment variable or provide credentials.json file.');
        }
      }
      
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      const authClient = await this.auth.getClient();
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
      this.initialized = true;
      
      console.log('Google Calendar service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
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
      const event = {
        summary: `${eventData.appointmentType.toUpperCase()} - ${eventData.patientName}`,
        description: this.formatEventDescription(eventData),
        start: {
          dateTime: dayjs(eventData.dateTime).tz(config.calendar.timeZone).format(),
          timeZone: config.calendar.timeZone
        },
        end: {
          dateTime: dayjs(eventData.dateTime)
            .add(eventData.duration || 30, 'minute')
            .tz(config.calendar.timeZone)
            .format(),
          timeZone: config.calendar.timeZone
        },
        colorId: eventData.colorId || '1'
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
      const response = await this.calendar.events.list({
        calendarId: config.calendar.calendarId,
        timeMin: dayjs(startDate).tz(config.calendar.timeZone).startOf('day').toISOString(),
        timeMax: dayjs(endDate).tz(config.calendar.timeZone).endOf('day').toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to retrieve calendar events:', error);
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
    
    return events.find(event => {
      const summary = event.summary || '';
      const description = event.description || '';
      
      return summary.includes(patientName) || 
             description.includes(patientName) || 
             description.includes(phone);
    });
  }

  formatEventDescription(eventData) {
    const orderNumber = eventData.orderNumber ? `🔢 PORADOVÉ ČÍSLO: ${eventData.orderNumber}\n\n` : '';
    
    return `${orderNumber}Appointment Type: ${eventData.appointmentType}
Patient: ${eventData.patientName}
Phone: ${eventData.phone}
Insurance: ${eventData.insurance || 'N/A'}
Email: ${eventData.email || 'N/A'}
Birth ID: ${eventData.birthId || 'N/A'}
Duration: ${eventData.duration || 30} minutes
Price: ${eventData.price || 0}€
Created: ${dayjs().tz(config.calendar.timeZone).format('YYYY-MM-DD HH:mm:ss')}`;
  }

  async getOrderNumber(appointmentType, date) {
    const events = await this.getEventsForDay(date);
    const typeEvents = events.filter(event => 
      event.summary && event.summary.includes(appointmentType.toUpperCase())
    );
    
    return typeEvents.length + 1;
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
      let currentTime = dayjs(`${date} ${schedule.start}`, 'YYYY-MM-DD HH:mm')
        .tz(config.calendar.timeZone);
      const endTime = dayjs(`${date} ${schedule.end}`, 'YYYY-MM-DD HH:mm')
        .tz(config.calendar.timeZone);

      while (currentTime.isBefore(endTime)) {
        const timeSlot = currentTime.format('HH:mm');
        
        if (!occupiedTimes.has(timeSlot)) {
          availableSlots.push({
            time: timeSlot,
            datetime: currentTime.toISOString(),
            available: true
          });
        }

        currentTime = currentTime.add(schedule.interval, 'minute');
      }
    });

    return availableSlots;
  }
}

module.exports = new GoogleCalendarService();