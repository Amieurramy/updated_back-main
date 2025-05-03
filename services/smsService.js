import { Vonage } from '@vonage/server-sdk';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

export const sendOTP = async (mobileNumber, countryCode, otp) => {
  try {
    // Format number (remove + if present)
    const formattedCountryCode = countryCode.replace('+', '');
    const to = `${formattedCountryCode}${mobileNumber}`;
    const from = process.env.VONAGE_SENDER_NAME || 'YourApp';

    // Vonage now uses sms.sendSms() method
    const response = await vonage.sms.send({
      from,
      to,
      text: `Your verification code: ${otp}`
    });

    // Check response
    if (response.messages[0].status === '0') {
      console.log(`SMS sent to ${to}, ID: ${response.messages[0]['message-id']}`);
      return {
        success: true,
        messageId: response.messages[0]['message-id'],
        to: to,
      };
    } else {
      console.error('Vonage delivery failed:', response.messages[0]['error-text']);
      return {
        success: false,
        error: response.messages[0]['error-text'],
      };
    }
  } catch (error) {
    console.error('Vonage API error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};