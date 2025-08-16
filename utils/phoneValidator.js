/**
 * Phone number validation and formatting utility for Slovak numbers
 * Handles conversion from local format (0910...) to international (+421910...)
 */

const config = require('../config');

class PhoneValidator {
  
  /**
   * Format phone number to international Slovak format
   * @param {string} phone - Input phone number in various formats
   * @returns {string} - Formatted phone number (+421xxxxxxxxx)
   */
  formatPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return null;
    }
    
    // Remove all spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Already in correct international format
    if (cleaned.startsWith('+421')) {
      return cleaned;
    }
    
    // Format: 421xxxxxxxxx (missing +)
    if (cleaned.startsWith('421') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    // Slovak local format: 0xxxxxxxxx (must be exactly 10 digits, remove leading 0)
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+421' + cleaned.substring(1); // Remove the 0, so 0910223761 becomes +421910223761
    }
    
    // International format without +: 9xxxxxxxxx (must be exactly 9 digits and start with 9)
    if (cleaned.length === 9 && /^9\d{8}$/.test(cleaned)) {
      return '+421' + cleaned;
    }
    
    // Return original if no pattern matches (will fail validation)
    return cleaned;
  }
  
  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {object} - {isValid: boolean, formatted: string|null, error: string|null}
   */
  validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        formatted: null,
        error: 'Telefónne číslo je povinné'
      };
    }
    
    const formatted = this.formatPhoneNumber(phone);
    
    if (!formatted) {
      return {
        isValid: false,
        formatted: null,
        error: 'Neplatný formát telefónneho čísla'
      };
    }
    
    // Check against Slovak phone number pattern
    const isValid = config.validation.phoneFormat.test(formatted);
    
    if (!isValid) {
      return {
        isValid: false,
        formatted: null,
        error: 'Telefónne číslo musí byť slovenské číslo vo formáte +421xxxxxxxxx alebo 0xxxxxxxxx'
      };
    }
    
    return {
      isValid: true,
      formatted: formatted,
      error: null
    };
  }
  
  /**
   * Validate and format phone number - throws error if invalid
   * @param {string} phone - Phone number to validate
   * @returns {string} - Formatted phone number
   * @throws {Error} - If phone number is invalid
   */
  validateAndFormat(phone) {
    const result = this.validatePhoneNumber(phone);
    
    if (!result.isValid) {
      throw new Error(result.error);
    }
    
    return result.formatted;
  }
  
  /**
   * Check if two phone numbers are the same (handles different formats)
   * @param {string} phone1 - First phone number
   * @param {string} phone2 - Second phone number  
   * @returns {boolean} - True if they represent the same number
   */
  arePhoneNumbersEqual(phone1, phone2) {
    const formatted1 = this.formatPhoneNumber(phone1);
    const formatted2 = this.formatPhoneNumber(phone2);
    
    return formatted1 && formatted2 && formatted1 === formatted2;
  }
  
  /**
   * Get the last N digits of a phone number for partial matching
   * @param {string} phone - Phone number
   * @param {number} digits - Number of digits to return (default: 6)
   * @returns {string|null} - Last N digits or null if invalid
   */
  getLastDigits(phone, digits = 6) {
    const formatted = this.formatPhoneNumber(phone);
    if (!formatted || formatted.length < digits) {
      return null;
    }
    
    return formatted.slice(-digits);
  }
}

module.exports = new PhoneValidator();