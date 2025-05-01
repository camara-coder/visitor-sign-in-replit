const nodemailer = require('nodemailer');

// Create a test account if no SMTP credentials available
let transporter;

async function initializeEmailService() {
  try {
    // If SMTP environment variables are provided, use them
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
      
      console.log('Email service initialized with provided SMTP settings');
    } else {
      // Otherwise create a test account at ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Email service initialized with test account');
      console.log('Test account credentials:', testAccount.user, testAccount.pass);
    }
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    // Create a mock transporter that logs instead of sending
    transporter = {
      sendMail: (mailOptions) => {
        console.log('Email would be sent:', mailOptions);
        return Promise.resolve({ messageId: 'mock-message-id' });
      }
    };
  }
}

// Send welcome email to new visitor
async function sendVisitorWelcomeEmail(visitor, event) {
  if (!transporter) {
    console.log('Email service not initialized, initializing now...');
    await initializeEmailService();
  }
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'visitor-system@example.com',
      to: visitor.email,
      subject: `Thank you for signing in to ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d6efd;">Welcome, ${visitor.firstName}!</h2>
          <p>Thank you for signing in to <strong>${event.title}</strong>.</p>
          <p>Your registration details:</p>
          <ul>
            <li><strong>Name:</strong> ${visitor.firstName} ${visitor.lastName}</li>
            <li><strong>Email:</strong> ${visitor.email}</li>
            <li><strong>Check-in time:</strong> ${new Date(visitor.checkInTime).toLocaleString()}</li>
          </ul>
          <p>If you have any questions, please contact the event organizer.</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Welcome email sent to visitor:', visitor.email);
    
    // If using ethereal email, provide the preview URL
    if (info.messageId && info.previewURL) {
      console.log('Preview URL:', info.previewURL);
    }
    
    return { success: true, messageId: info.messageId, previewURL: info.previewURL };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send event notification to host/admin
async function sendEventNotification(user, event, action) {
  if (!transporter) {
    console.log('Email service not initialized, initializing now...');
    await initializeEmailService();
  }
  
  try {
    const actionText = action === 'create' ? 'created' : action === 'enable' ? 'enabled' : 'disabled';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'visitor-system@example.com',
      to: user.email || process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: `Event ${actionText}: ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d6efd;">Event Update</h2>
          <p>The event <strong>${event.title}</strong> has been ${actionText}.</p>
          <p>Event details:</p>
          <ul>
            <li><strong>Title:</strong> ${event.title}</li>
            <li><strong>Description:</strong> ${event.description || 'N/A'}</li>
            <li><strong>Location:</strong> ${event.location || 'N/A'}</li>
            <li><strong>Status:</strong> ${event.status}</li>
          </ul>
          <p>You can manage this event from your dashboard.</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Event notification email sent to:', user.email || process.env.ADMIN_EMAIL || 'admin@example.com');
    
    // If using ethereal email, provide the preview URL
    if (info.messageId && info.previewURL) {
      console.log('Preview URL:', info.previewURL);
    }
    
    return { success: true, messageId: info.messageId, previewURL: info.previewURL };
  } catch (error) {
    console.error('Failed to send event notification email:', error);
    return { success: false, error: error.message };
  }
}

// Send visitor notification to host/admin
async function sendVisitorNotification(user, visitor, event) {
  if (!transporter) {
    console.log('Email service not initialized, initializing now...');
    await initializeEmailService();
  }
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'visitor-system@example.com',
      to: user.email || process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: `New Visitor: ${visitor.firstName} ${visitor.lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d6efd;">New Visitor Registration</h2>
          <p>A new visitor has signed in to <strong>${event.title}</strong>.</p>
          <p>Visitor details:</p>
          <ul>
            <li><strong>Name:</strong> ${visitor.firstName} ${visitor.lastName}</li>
            <li><strong>Email:</strong> ${visitor.email}</li>
            <li><strong>Phone:</strong> ${visitor.phone || 'N/A'}</li>
            <li><strong>Check-in time:</strong> ${new Date(visitor.checkInTime).toLocaleString()}</li>
          </ul>
          <p>You can view all visitors on your dashboard.</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Visitor notification email sent to:', user.email || process.env.ADMIN_EMAIL || 'admin@example.com');
    
    // If using ethereal email, provide the preview URL
    if (info.messageId && info.previewURL) {
      console.log('Preview URL:', info.previewURL);
    }
    
    return { success: true, messageId: info.messageId, previewURL: info.previewURL };
  } catch (error) {
    console.error('Failed to send visitor notification email:', error);
    return { success: false, error: error.message };
  }
}

// Initialize email service on module load
initializeEmailService();

module.exports = {
  sendVisitorWelcomeEmail,
  sendEventNotification,
  sendVisitorNotification
};