const Holidays = require('date-holidays');
const dayjs = require('dayjs');

class HolidayService {
  constructor() {
    // Initialize for Slovakia
    this.holidays = new Holidays('SK');
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  async isHoliday(date) {
    // TEMPORARILY DISABLED - always return false to allow booking
    return false;
    
    /* ORIGINAL CODE:
    const dateString = dayjs(date).format('YYYY-MM-DD');
    const year = dayjs(date).year();
    
    // Check cache first
    const cacheKey = `${year}-holidays`;
    const now = Date.now();
    
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
      const yearHolidays = this.cache.get(cacheKey);
      return yearHolidays.has(dateString);
    }
    
    // Get holidays for the year
    const yearHolidays = this.getHolidaysForYear(year);
    
    // Cache for 24 hours
    this.cache.set(cacheKey, yearHolidays);
    this.cacheExpiry.set(cacheKey, now + (24 * 60 * 60 * 1000));
    
    return yearHolidays.has(dateString);
    */
  }

  getHolidaysForYear(year) {
    const holidayDates = new Set();
    const yearHolidays = this.holidays.getHolidays(year);
    
    yearHolidays.forEach(holiday => {
      const date = dayjs(holiday.date).format('YYYY-MM-DD');
      holidayDates.add(date);
    });
    
    return holidayDates;
  }

  async getUpcomingHolidays(days = 30) {
    const today = dayjs();
    const endDate = today.add(days, 'day');
    const upcoming = [];
    
    let currentDate = today;
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
      const isHoliday = await this.isHoliday(currentDate.format('YYYY-MM-DD'));
      
      if (isHoliday) {
        const year = currentDate.year();
        const yearHolidays = this.holidays.getHolidays(year);
        const holidayInfo = yearHolidays.find(h => 
          dayjs(h.date).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')
        );
        
        upcoming.push({
          date: currentDate.format('YYYY-MM-DD'),
          name: holidayInfo ? holidayInfo.name : 'Unknown Holiday',
          dayName: currentDate.format('dddd')
        });
      }
      
      currentDate = currentDate.add(1, 'day');
    }
    
    return upcoming;
  }

  async getHolidaysInMonth(year, month) {
    const startOfMonth = dayjs(`${year}-${month.toString().padStart(2, '0')}-01`);
    const endOfMonth = startOfMonth.endOf('month');
    const holidays = [];
    
    let currentDate = startOfMonth;
    while (currentDate.isBefore(endOfMonth) || currentDate.isSame(endOfMonth)) {
      const isHoliday = await this.isHoliday(currentDate.format('YYYY-MM-DD'));
      
      if (isHoliday) {
        const yearHolidays = this.holidays.getHolidays(year);
        const holidayInfo = yearHolidays.find(h => 
          dayjs(h.date).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')
        );
        
        holidays.push({
          date: currentDate.format('YYYY-MM-DD'),
          name: holidayInfo ? holidayInfo.name : 'Unknown Holiday',
          dayName: currentDate.format('dddd')
        });
      }
      
      currentDate = currentDate.add(1, 'day');
    }
    
    return holidays;
  }

  getHolidayInfo(date) {
    const year = dayjs(date).year();
    const yearHolidays = this.holidays.getHolidays(year);
    const targetDate = dayjs(date).format('YYYY-MM-DD');
    
    const holidayInfo = yearHolidays.find(h => 
      dayjs(h.date).format('YYYY-MM-DD') === targetDate
    );
    
    if (holidayInfo) {
      return {
        name: holidayInfo.name,
        date: targetDate,
        type: holidayInfo.type || 'public',
        substitute: holidayInfo.substitute || false
      };
    }
    
    return null;
  }

  // Slovak specific holidays that might not be in the library
  getSlovakSpecificHolidays(year) {
    const specific = [
      {
        date: `${year}-01-01`,
        name: 'Deň vzniku Slovenskej republiky'
      },
      {
        date: `${year}-01-06`,
        name: 'Zjavenie Pána (Traja králi)'
      },
      {
        date: `${year}-05-01`,
        name: 'Sviatok práce'
      },
      {
        date: `${year}-05-08`,
        name: 'Deň víťazstva nad fašizmom'
      },
      {
        date: `${year}-07-05`,
        name: 'Sviatok svätého Cyrila a Metoda'
      },
      {
        date: `${year}-08-29`,
        name: 'Výročie Slovenského národného povstania'
      },
      {
        date: `${year}-09-01`,
        name: 'Deň Ústavy Slovenskej republiky'
      },
      {
        date: `${year}-09-15`,
        name: 'Sedembolestná Panna Mária'
      },
      {
        date: `${year}-11-01`,
        name: 'Sviatok Všetkých svätých'
      },
      {
        date: `${year}-11-17`,
        name: 'Deň boja za slobodu a demokraciu'
      },
      {
        date: `${year}-12-24`,
        name: 'Štedrý deň'
      },
      {
        date: `${year}-12-25`,
        name: 'Prvý sviatok vianočný'
      },
      {
        date: `${year}-12-26`,
        name: 'Druhý sviatok vianočný'
      }
    ];
    
    return specific;
  }

  async isWorkingDay(date) {
    const dayOfWeek = dayjs(date).day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isHoliday = await this.isHoliday(date);
    
    return !isWeekend && !isHoliday;
  }

  async getNextWorkingDay(date) {
    let nextDay = dayjs(date).add(1, 'day');
    
    while (!(await this.isWorkingDay(nextDay.format('YYYY-MM-DD')))) {
      nextDay = nextDay.add(1, 'day');
    }
    
    return nextDay.format('YYYY-MM-DD');
  }

  async getPreviousWorkingDay(date) {
    let prevDay = dayjs(date).subtract(1, 'day');
    
    while (!(await this.isWorkingDay(prevDay.format('YYYY-MM-DD')))) {
      prevDay = prevDay.subtract(1, 'day');
    }
    
    return prevDay.format('YYYY-MM-DD');
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cachedYears: Array.from(this.cache.keys())
    };
  }
}

module.exports = new HolidayService();