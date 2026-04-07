require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

app.post('/api/book', async (req, res) => {
    const { name, phone, service, date, time } = req.body;

    if (!name || !phone || !service) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    try {
        // Only try to send an SMS if Twilio credentials are provided
        if (accountSid && accountSid !== 'your_twilio_account_sid_here') {
            const client = twilio(accountSid, authToken);
            
            const messageParams = {
                body: `Hello ${name}! Your Trusty Services service for ${service} is confirmed for ${date} during the ${time} slot. Our professional will be with you shortly.`,
                from: twilioPhoneNumber,
                to: phone
            };
            
            const message = await client.messages.create(messageParams);
            console.log(`Successfully sent SMS. SID: ${message.sid}`);
            
            res.json({ success: true, message: 'Booking confirmed and SMS sent.', sid: message.sid });
        } else {
            console.warn('Twilio credentials not configured. Skipping SMS.');
            // Send back a mock success response so the UI still works
            res.json({ success: true, message: 'Booking confirmed (SMS skipped - missing credentials).' });
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ success: false, message: 'Failed to send SMS.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Trusty Services backend server listening at http://localhost:${port}`);
    console.log(`Remember to configure your .env file with your Twilio credentials!`);
});
