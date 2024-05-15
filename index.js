// index.js

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Create MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'appadmin',
    password: 'Admin123',
    database: 'otp_generator',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Generate OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit numeric OTP
}

// Endpoint to generate OTP
app.post('/otp/generate', (req, res) => {
    const { mobileNumber } = req.body;
    const otp = generateOTP();

    // Save OTP to database with expiry time
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    pool.query('INSERT INTO otps (mobile_number, otp, expiry_time) VALUES (?, ?, ?)', [mobileNumber, otp, expiryTime], (error, results, fields) => {
        if (error) {
            console.error('Failed to generate OTP:', error);
            res.status(500).json({ error: 'Failed to generate OTP' });
        } else {
            console.log(`OTP ${otp} generated for mobile number ${mobileNumber}`);
            res.status(201).json({ otp, expiryTime });
        }
    });
});

// Endpoint to verify OTP
app.post('/otp/verify', (req, res) => {
    const { mobileNumber, otp } = req.body;

    // Check if OTP exists and is not expired
    const currentTime = new Date();
    pool.query('SELECT * FROM otps WHERE mobile_number = ? AND otp = ? AND expiry_time > ?', [mobileNumber, otp, currentTime], (error, results, fields) => {
        if (error) {
            console.error('Failed to verify OTP:', error);
            res.status(500).json({ error: 'Failed to verify OTP' });
        } else {
            if (results.length > 0) {
                // OTP is valid, delete it from database
                pool.query('DELETE FROM otps WHERE mobile_number = ? AND otp = ?', [mobileNumber, otp], (error, results, fields) => {
                    if (error) {
                        console.error('Failed to delete OTP:', error);
                    }
                });
                res.status(200).json({ message: 'OTP verified successfully' });
            } else {
                // OTP not found, expired, or incorrect
                res.status(400).json({ error: 'Invalid or expired OTP' });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
