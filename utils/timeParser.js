/**
 * Slovak Natural Language Time Parser
 * Converts Slovak time descriptions to specific time ranges
 */

/**
 * Parse Slovak time descriptions to time ranges
 * @param {string} timeDescription - Slovak time description
 * @returns {object} - { startTime: string, endTime: string, preferredTime: string }
 */
function parseNaturalTime(timeDescription) {
  if (!timeDescription || typeof timeDescription !== 'string') {
    return null;
  }

  const normalized = timeDescription.toLowerCase().trim();
  
  // Define time mappings for Slovak terms
  const timeMappings = {
    // Morning variations
    'ráno': { startTime: '07:00', endTime: '09:00', preferredTime: 'morning' },
    'skoro ráno': { startTime: '07:00', endTime: '08:00', preferredTime: 'morning' },
    'včas ráno': { startTime: '07:00', endTime: '08:00', preferredTime: 'morning' },
    'dopoludnia': { startTime: '09:00', endTime: '12:00', preferredTime: 'morning' },
    'predpoludním': { startTime: '09:00', endTime: '12:00', preferredTime: 'morning' },
    'doobeda': { startTime: '09:00', endTime: '12:00', preferredTime: 'morning' },
    
    // Afternoon variations
    'poobede': { startTime: '13:00', endTime: '15:00', preferredTime: 'afternoon' },
    'popoludní': { startTime: '13:00', endTime: '17:00', preferredTime: 'afternoon' },
    'po obede': { startTime: '13:00', endTime: '15:00', preferredTime: 'afternoon' },
    'odpoledne': { startTime: '13:00', endTime: '17:00', preferredTime: 'afternoon' },
    'večer': { startTime: '17:00', endTime: '20:00', preferredTime: 'afternoon' },
    
    // Specific meal-related times
    'po raňajkách': { startTime: '08:00', endTime: '10:00', preferredTime: 'morning' },
    'pred obedom': { startTime: '11:00', endTime: '12:00', preferredTime: 'morning' },
    'po obede': { startTime: '13:00', endTime: '14:00', preferredTime: 'afternoon' },
    
    // English terms (for compatibility)
    'morning': { startTime: '07:00', endTime: '12:00', preferredTime: 'morning' },
    'afternoon': { startTime: '13:00', endTime: '17:00', preferredTime: 'afternoon' },
    'evening': { startTime: '17:00', endTime: '20:00', preferredTime: 'afternoon' }
  };

  // Check for exact matches
  for (const [term, timeRange] of Object.entries(timeMappings)) {
    if (normalized.includes(term)) {
      return timeRange;
    }
  }

  // Check for time patterns (e.g., "o deviatej", "o 14:00")
  const timePatterns = [
    // Slovak hour descriptions
    { pattern: /o\s+(\d{1,2})(:\d{2})?\s*(hodine|hod\.?)?/, extract: (match) => {
      const hour = parseInt(match[1]);
      const minute = match[2] ? match[2].substring(1) : '00';
      if (hour >= 0 && hour < 24) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
        return {
          startTime: timeStr,
          endTime: timeStr,
          preferredTime: hour < 12 ? 'morning' : 'afternoon'
        };
      }
    }},
    // Written hour names
    { pattern: /o\s+(prvej|druhej|tretej|štvrtej|piatej|šiestej|siedmej|ôsmej|deviatej|desiatej|jedenástej|dvanástej)/, 
      extract: (match) => {
        const hourMap = {
          'prvej': 13, 'druhej': 14, 'tretej': 15, 'štvrtej': 16, 'piatej': 17,
          'šiestej': 6, 'siedmej': 7, 'ôsmej': 8, 'deviatej': 9, 
          'desiatej': 10, 'jedenástej': 11, 'dvanástej': 12
        };
        const hour = hourMap[match[1]];
        if (hour) {
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          return {
            startTime: timeStr,
            endTime: timeStr,
            preferredTime: hour < 12 ? 'morning' : 'afternoon'
          };
        }
      }
    }
  ];

  // Try to match patterns
  for (const { pattern, extract } of timePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const result = extract(match);
      if (result) return result;
    }
  }

  // Check for relative time descriptions
  if (normalized.includes('hneď') || normalized.includes('čím skôr') || normalized.includes('urgent')) {
    return { 
      startTime: '07:00', 
      endTime: '17:00', 
      preferredTime: 'morning',
      urgent: true 
    };
  }

  return null;
}

/**
 * Convert parsed time to appointment search parameters
 * @param {string} timeDescription - Slovak time description
 * @param {string} appointmentType - Type of appointment
 * @returns {object} - Search parameters for appointment slots
 */
function getTimeSearchParams(timeDescription, appointmentType) {
  const parsed = parseNaturalTime(timeDescription);
  
  if (!parsed) {
    return { preferredTime: null };
  }

  // For specific times (when startTime equals endTime)
  if (parsed.startTime === parsed.endTime) {
    return { 
      time: parsed.startTime,
      preferredTime: parsed.preferredTime 
    };
  }

  // For time ranges, return the range
  return {
    timeRangeStart: parsed.startTime,
    timeRangeEnd: parsed.endTime,
    preferredTime: parsed.preferredTime,
    urgent: parsed.urgent || false
  };
}

/**
 * Check if a time slot falls within a natural language time description
 * @param {string} slotTime - Time slot in HH:mm format
 * @param {string} timeDescription - Slovak time description
 * @returns {boolean} - Whether the slot matches the description
 */
function matchesNaturalTime(slotTime, timeDescription) {
  const parsed = parseNaturalTime(timeDescription);
  if (!parsed) return true; // If can't parse, accept any time

  const [slotHour, slotMinute] = slotTime.split(':').map(Number);
  const [startHour, startMinute] = parsed.startTime.split(':').map(Number);
  const [endHour, endMinute] = parsed.endTime.split(':').map(Number);

  const slotMinutes = slotHour * 60 + slotMinute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  return slotMinutes >= startMinutes && slotMinutes <= endMinutes;
}

module.exports = {
  parseNaturalTime,
  getTimeSearchParams,
  matchesNaturalTime
};