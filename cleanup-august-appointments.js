#!/usr/bin/env node

/**
 * Clean up all August 2025 test appointments from Google Calendar
 * This removes all the edge case test data created during development
 */

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Configuration
const config = {
  calendar: {
    calendarId: 'airecepcia@gmail.com',
    timeZone: 'Europe/Bratislava'
  }
};

let calendar;

async function initializeGoogleCalendar() {
  console.log('🔧 Initializing Google Calendar service...');
  
  try {
    let auth;
    
    // Try credentials file first (local development)
    try {
      const credentials = require('./credentials.json');
      console.log('📁 Using credentials from file (local development)');
      console.log('✅ Successfully loaded credentials from file');
      
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      console.log('🔐 Creating GoogleAuth with credentials...');
    } catch (fileError) {
      console.log('📁 Credentials file not found, using environment variables');
      // Fall back to environment variables (production)
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    }
    
    console.log('🌐 Getting auth client...');
    const authClient = await auth.getClient();
    console.log('✅ Auth client obtained successfully');
    
    calendar = google.calendar({ version: 'v3', auth: authClient });
    console.log('✅ Google Calendar service initialized successfully');
    
    return calendar;
  } catch (error) {
    console.error('❌ Failed to initialize Google Calendar:', error.message);
    throw error;
  }
}

async function getEventsInAugust() {
  console.log('📅 Getting all August 2025 events...');
  
  const startDate = '2025-08-01T00:00:00.000Z';
  const endDate = '2025-08-31T23:59:59.999Z';
  
  try {
    const response = await calendar.events.list({
      calendarId: config.calendar.calendarId,
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const events = response.data.items || [];
    console.log(`✅ Found ${events.length} events in August 2025`);
    return events;
  } catch (error) {
    console.error('❌ Error fetching August events:', error.message);
    throw error;
  }
}

async function deleteEvent(eventId, eventTitle) {
  try {
    await calendar.events.delete({
      calendarId: config.calendar.calendarId,
      eventId: eventId
    });
    console.log(`✅ Deleted: ${eventTitle}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete ${eventTitle}:`, error.message);
    return false;
  }
}

async function cleanupAugustAppointments() {
  console.log('🧹 Starting August 2025 appointments cleanup...');
  
  try {
    await initializeGoogleCalendar();
    const events = await getEventsInAugust();
    
    if (events.length === 0) {
      console.log('✅ No August appointments found - calendar is already clean!');
      return;
    }
    
    console.log(`🗑️  Deleting ${events.length} August appointments...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const event of events) {
      const title = event.summary || 'Untitled Event';
      const startTime = event.start.dateTime || event.start.date;
      const eventInfo = `${title} (${dayjs(startTime).tz(config.calendar.timeZone).format('DD.MM.YYYY HH:mm')})`;
      
      const success = await deleteEvent(event.id, eventInfo);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\\n📋 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${successCount} appointments`);
    if (failCount > 0) {
      console.log(`❌ Failed to delete: ${failCount} appointments`);
    }
    console.log('🎉 August calendar cleanup completed!');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupAugustAppointments();
}

module.exports = { cleanupAugustAppointments };