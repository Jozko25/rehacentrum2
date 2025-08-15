const twilio = require('twilio');
const dayjs = require('dayjs');
const config = require('./config');

class SMSService {
  constructor() {
    this.client = null;
    this.enabled = config.sms.enabled;
    this.initialized = false;
  }

  async initialize() {
    if (!this.enabled) {
      console.log('SMS service is disabled (TWILIO_ENABLED=false)');
      return false;
    }

    if (!config.sms.accountSid || !config.sms.authToken) {
      console.warn('Twilio credentials not provided - SMS service disabled');
      this.enabled = false;
      return false;
    }

    try {
      this.client = twilio(config.sms.accountSid, config.sms.authToken);
      
      // Test the connection
      await this.client.api.accounts(config.sms.accountSid).fetch();
      
      this.initialized = true;
      console.log('SMS service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SMS service:', error.message);
      this.enabled = false;
      return false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized && this.enabled) {
      await this.initialize();
    }
  }

  async sendAppointmentConfirmation(appointmentData) {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      console.log('SMS service disabled - skipping SMS notification');
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const message = this.formatAppointmentMessage(appointmentData);
      
      const result = await this.client.messages.create({
        body: message,
        from: config.sms.phoneNumber,
        to: appointmentData.phone
      });

      console.log(`SMS sent successfully to ${appointmentData.phone}, SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        message: message,
        sentAt: dayjs().toISOString()
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendCancellationNotification(appointmentData) {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      console.log('SMS service disabled - skipping cancellation SMS');
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const message = `Dobrý deň ${appointmentData.patientName}, Váš termín na ${appointmentData.date} o ${appointmentData.time} bol zrušený. Rehacentrum Humenné`;
      
      const result = await this.client.messages.create({
        body: message,
        from: config.sms.phoneNumber,
        to: appointmentData.phone
      });

      console.log(`Cancellation SMS sent to ${appointmentData.phone}, SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        message: message,
        sentAt: dayjs().toISOString()
      };
    } catch (error) {
      console.error('Failed to send cancellation SMS:', error);
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendRescheduleNotification(oldAppointment, newAppointment) {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      console.log('SMS service disabled - skipping reschedule SMS');
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const message = `Dobrý deň ${newAppointment.patientName}, Váš termín bol presunutý z ${oldAppointment.date} ${oldAppointment.time} na ${newAppointment.date} o ${newAppointment.time}. Poradové číslo: ${newAppointment.orderNumber}. Rehacentrum Humenné`;
      
      const result = await this.client.messages.create({
        body: message,
        from: config.sms.phoneNumber,
        to: newAppointment.phone
      });

      console.log(`Reschedule SMS sent to ${newAppointment.phone}, SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        message: message,
        sentAt: dayjs().toISOString()
      };
    } catch (error) {
      console.error('Failed to send reschedule SMS:', error);
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendFallbackMessage(patientData, message) {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      console.log('SMS service disabled - skipping fallback SMS');
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const fullMessage = `${message} Rehacentrum Humenné`;
      
      const result = await this.client.messages.create({
        body: fullMessage,
        from: config.sms.phoneNumber,
        to: patientData.phone
      });

      console.log(`Fallback SMS sent to ${patientData.phone}, SID: ${result.sid}`);
      
      return {
        success: true,
        sid: result.sid,
        message: fullMessage,
        sentAt: dayjs().toISOString()
      };
    } catch (error) {
      console.error('Failed to send fallback SMS:', error);
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendTestMessage(phoneNumber, message = 'Test message from Rehacentrum API') {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const result = await this.client.messages.create({
        body: `${message} - ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
        from: config.sms.phoneNumber,
        to: phoneNumber
      });

      return {
        success: true,
        sid: result.sid,
        sentAt: dayjs().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  formatAppointmentMessage(appointmentData) {
    const typeConfig = config.appointmentTypes[appointmentData.appointmentType];
    if (!typeConfig || !typeConfig.smsTemplate) {
      return `Dobrý deň ${appointmentData.patientName}, Váš termín bol rezervovaný na ${appointmentData.dateShort} o ${appointmentData.time}. Rehacentrum Humenné`;
    }

    return typeConfig.smsTemplate
      .replace('{patient_name}', appointmentData.patientName)
      .replace('{date_short}', appointmentData.dateShort)
      .replace('{time}', appointmentData.time)
      .replace('{order_number}', appointmentData.orderNumber || 'N/A');
  }

  getStatus() {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      hasCredentials: !!(config.sms.accountSid && config.sms.authToken),
      phoneNumber: config.sms.phoneNumber
    };
  }

  formatPhoneNumber(phone) {
    // Ensure phone number is in correct format
    if (phone.startsWith('+421')) {
      return phone;
    }
    
    if (phone.startsWith('421')) {
      return '+' + phone;
    }
    
    if (phone.startsWith('0')) {
      return '+421' + phone.substring(1);
    }
    
    return '+421' + phone;
  }

  validatePhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
    return config.validation.phoneFormat.test(formatted);
  }
}

module.exports = new SMSService();