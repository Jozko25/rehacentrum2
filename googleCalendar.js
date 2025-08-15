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
      console.log('🔧 Initializing Google Calendar service...');
      
      // Try environment variables first (for production)
      let credentials;
      if (process.env.GOOGLE_CREDENTIALS) {
        console.log('📝 Using GOOGLE_CREDENTIALS from environment');
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
      
      console.log('✅ Google Calendar service initialized successfully');
      
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