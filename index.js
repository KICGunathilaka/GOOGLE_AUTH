const express = require('express');
const bodyParser = require('body-parser');
const otplib = require('otplib');
const qr = require('qrcode');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Use JSON parsing middleware
app.use(bodyParser.json());

// Mock user database (replace with your actual DB if needed)
const users = [
    { username: 'testuser', password: 'password123', secret: null }
];

// Login endpoint to handle username and password
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log(`Login attempt with username: ${username} and password: ${password}`);

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        if (!user.secret) {
            // Generate a secret for 2FA if the user doesn't have one
            const secret = otplib.authenticator.generateSecret();
            user.secret = secret;  // Save secret in the "database"
            console.log(`Generated new 2FA secret: ${secret}`);
        }

        // Generate OTP URL for Google Authenticator
        const otpUrl = otplib.authenticator.keyuri(username, 'MyApp', user.secret);

        // Generate QR code from OTP URL
        qr.toDataURL(otpUrl, (err, qrCodeUrl) => {
            if (err) {
                return res.status(500).json({ message: 'Error generating QR code' });
            }

            // Send QR code URL to frontend
            res.json({ otpRequired: true, qrUrl: qrCodeUrl });
        });
    } else {
        res.json({ message: '❌ Invalid credentials' });
    }
});

// Verify OTP endpoint
app.post('/verify-otp', (req, res) => {
    const { username, otp } = req.body;

    console.log(`OTP verification attempt for username: ${username}`);

    const user = users.find(u => u.username === username);

    if (user && user.secret) {
        const isValid = otplib.authenticator.verify({ token: otp, secret: user.secret });

        if (isValid) {
            res.json({ message: '✅ Login success' });
        } else {
            res.json({ message: '❌ Invalid OTP' });
        }
    } else {
        res.json({ message: '❌ User not found or 2FA not set up' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
