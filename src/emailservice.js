// src/emailService.js - EmailJS Integration for Notifications
import emailjs from 'emailjs-com';

// EmailJS Configuration - GET THESE FROM EMAILJS.COM
const EMAILJS_CONFIG = {
  publicKey: 'YOUR_PUBLIC_KEY',      // From EmailJS Account page
  serviceId: 'YOUR_SERVICE_ID',      // From EmailJS Email Services
  templateId: 'YOUR_TEMPLATE_ID'     // From EmailJS Email Templates
};

// Initialize EmailJS
export const initEmailJS = () => {
  emailjs.init(EMAILJS_CONFIG.publicKey);
};

// Send chat notification to admin
export const sendChatNotification = async (adminEmail, adminName, clientName, chatId, isAssignedAdmin = true) => {
  try {
    const chatLink = `${window.location.origin}/Homework-Helpers/?chat=${chatId}`;
    
    const templateParams = {
      to_email: adminEmail,
      admin_name: adminName,
      client_name: clientName,
      chat_link: chatLink,
      is_assigned: isAssignedAdmin ? 'yes' : 'no',
      assigned_admin: isAssignedAdmin ? adminName : ''
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send notification to all admins
export const notifyAllAdmins = async (admins, clientName, requestedAdminName, chatId) => {
  try {
    const promises = admins.map(admin => {
      const isAssigned = admin.name === requestedAdminName;
      return sendChatNotification(
        admin.email,
        admin.name,
        clientName,
        chatId,
        isAssigned
      );
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error notifying admins:', error);
    return false;
  }
};

// Send custom email notification
export const sendCustomNotification = async (toEmail, subject, message) => {
  try {
    const templateParams = {
      to_email: toEmail,
      subject: subject,
      message: message
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      'custom_template', // You'll need to create this template
      templateParams
    );

    console.log('Custom email sent:', response);
    return true;
  } catch (error) {
    console.error('Error sending custom email:', error);
    return false;
  }
};

export default {
  initEmailJS,
  sendChatNotification,
  notifyAllAdmins,
  sendCustomNotification
};
