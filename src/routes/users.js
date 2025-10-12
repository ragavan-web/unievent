const express = require('express');
const router = express.Router();
const db = require('../models/db'); 

// Global object to store temporary OTPs { [email]: { otp: '1234', timestamp: Date.now(), validUntil: timestamp } }
const otpStore = {};

// Helper function to generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// ==========================================================
// 1. STUDENT REGISTRATION
// ... (Unchanged) ...
// ==========================================================
router.post('/register/student', (req, res) => {
    const { name, email, phone, regno, department, year, password, 'confirm-password': confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const stmt = db.prepare(`
        INSERT INTO users (name, email, phone, regno, department, year, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(name, email, phone, regno, department, year, password, 'student', function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                 return res.status(409).json({ error: 'Registration failed. That Email or Register Number is already in use.' });
            }
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'A server error occurred during registration.' });
        }
        res.status(201).json({ message: 'Registration successful!' });
    });

    stmt.finalize();
});

// ==========================================================
// 2. ORGANIZER REGISTRATION
// ... (Unchanged) ...
// ==========================================================
router.post('/register/organizer', (req, res) => {
    const { name, email, department, password, 'confirm-password': confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }
    
    const stmt = db.prepare(`
        INSERT INTO users (name, email, department, password, role)
        VALUES (?, ?, ?, ?, 'organizer')
    `);

    stmt.run(name, email, department, password, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                 return res.status(409).json({ error: 'Registration failed. That Email is already in use.' });
            }
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'A server error occurred during registration.' });
        }
        res.status(201).json({ message: 'Organizer registration successful!' });
    });

    stmt.finalize();
});


// ==========================================================
// 3. STUDENT LOGIN (FIXED HERE)
// ==========================================================
router.post('/login/student', (req, res) => {
    const { identifier, password } = req.body;

    // CRITICAL FIX: Add 'year' to the SELECT statement
    const query = 'SELECT id, name, password, year FROM users WHERE (regno = ? OR email = ?) AND role = ?';
    db.get(query, [identifier, identifier, 'student'], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'A server error occurred during login.' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid Register Number or Email.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Incorrect Password.' });
        }

        // Authentication successful: Return ID, Name, and Year
        res.json({ 
            message: 'Login successful', 
            name: user.name,
            userId: user.id,
            year: user.year // <-- Now returned in the response
        });
    });
});

// ==========================================================
// 4. ORGANIZER LOGIN
// ... (Unchanged) ...
// ==========================================================
router.post('/login/organizer', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT id, name, department, password FROM users WHERE email = ? AND role = ?';
    db.get(query, [email, 'organizer'], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'A server error occurred during login.' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Successful login for organizer
        res.json({ 
            message: 'Login successful', 
            name: user.name,
            userId: user.id,
            department: user.department 
        });
    });
});

// ==========================================================
// 5. GET STUDENT PROFILE DETAILS
// ... (Unchanged) ...
// ==========================================================
router.get('/profile/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.get('SELECT name, email, phone, regno, department, year FROM users WHERE id = ? AND role = "student"', [userId], (err, user) => {
        if (err) {
            console.error('Profile Fetch Error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve profile data.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Student profile not found.' });
        }
        res.json(user);
    });
});


// ==========================================================
// 6. UPDATE STUDENT PROFILE DETAILS (PUT ENDPOINT)
// ... (Unchanged) ...
// ==========================================================
router.put('/profile', (req, res) => {
    const { userId, name, regno, email, phone, department, year } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required for update.' });
    }

    const query = `
        UPDATE users
        SET name = ?, regno = ?, email = ?, phone = ?, department = ?, year = ?
        WHERE id = ? AND role = 'student'
    `;

    db.run(query, 
        [name, regno, email, phone, department, year, userId], 
        function(err) {
            if (err) {
                console.error('Profile Update Error:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Update failed: That Email or Register Number is already in use.' });
                }
                return res.status(500).json({ error: 'Failed to update profile due to a server error.' });
            }

            if (this.changes === 0) {
                 return res.status(404).json({ error: 'Profile not found or no changes made.' });
            }

            res.json({ message: 'Profile updated successfully!' });
        }
    );
});


// ==========================================================
// 7. FORGOT PASSWORD FLOW 
// ... (Unchanged) ...
// ==========================================================
router.post('/request-otp', (req, res) => {
    const { email, phone } = req.body;
    db.get('SELECT email, phone FROM users WHERE email = ? AND phone = ?', [email, phone], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Email and Phone number combination not found.' });
        }
        
        const otp = generateOTP();
        otpStore[email] = {
            otp: otp,
            timestamp: Date.now(),
            validUntil: Date.now() + 5 * 60 * 1000 
        };

        console.log(`\n============================================`);
        console.log(`[OTP GENERATED] To: ${email} | Phone: ${phone}`);
        console.log(`[OTP CODE]: ${otp}`);
        console.log(`(OTP is valid for 5 minutes)`);
        console.log(`============================================\n`);

        res.json({ message: `OTP sent successfully to ${email} and ${phone}.`, email: email });
    });
});

router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedOtpData = otpStore[email];

    if (!storedOtpData) {
         return res.status(400).json({ error: 'OTP is expired or invalid. Please request a new one.' });
    }
    
    if (storedOtpData.timestamp < (Date.now() - 5 * 60 * 1000)) {
        delete otpStore[email];
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (storedOtpData.otp === otp) {
        delete otpStore[email]; 
        res.json({ message: 'OTP verified successfully.', email: email });
    } else {
        res.status(401).json({ error: 'Invalid OTP entered.' });
    }
});

router.post('/reset-password', (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match.' });
    }
    
    db.run('UPDATE users SET password = ? WHERE email = ?', [newPassword, email], function(err) {
        if (err) {
            console.error('Database error during password reset:', err.message);
            return res.status(500).json({ error: 'Password reset failed due to a server error.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found or password was not changed.' });
        }
        res.json({ message: 'Password reset successful. Please log in with your new password.' });
    });
});


// ==========================================================
// 8. COMPETITION REGISTRATION (Unchanged)
// ==========================================================
router.post('/register', (req, res) => {
    const { event_id, comp_id, user_id } = req.body; 

    if (!user_id || isNaN(user_id)) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    db.get('SELECT id FROM registrations WHERE user_id = ? AND comp_id = ?', [user_id, comp_id], (err, registration) => {
        if (err) {
            return res.status(500).json({ error: 'Database check failed.' });
        }
        if (registration) {
            return res.status(409).json({ error: 'You are already registered for this competition.' });
        }

        db.get('SELECT max_comps_per_student FROM events WHERE id = ?', [event_id], (err, event) => {
            if (err || !event) {
                return res.status(500).json({ error: 'Event data lookup failed.' });
            }
            const maxComps = event.max_comps_per_student;

            db.get('SELECT COUNT(*) AS count FROM registrations WHERE user_id = ? AND event_id = ?', [user_id, event_id], (err, countResult) => {
                if (err) {
                    return res.status(500).json({ error: 'Registration count failed.' });
                }
                
                if (countResult.count >= maxComps) {
                    return res.status(403).json({ error: `Limit exceeded. You can only register for a maximum of ${maxComps} competitions in this event.` });
                }

                db.run(
                    'INSERT INTO registrations (user_id, comp_id, event_id, registration_date) VALUES (?, ?, ?, DATE("now"))',
                    [user_id, comp_id, event_id],
                    function(err) {
                        if (err) {
                            console.error('Registration Insert Error:', err.message);
                            return res.status(500).json({ error: 'Registration failed at insertion.' });
                        }
                        res.status(201).json({ message: 'Registration successful! See you at the event!' });
                    }
                );
            });
        });
    });
});


// ==========================================================
// 9. FETCH MY REGISTRATIONS (Unchanged)
// ...
// ==========================================================
router.get('/my-registrations/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT 
            r.registration_date,
            e.title AS event_title,
            e.date AS event_date,
            c.comp_name,
            c.comp_type,
            c.coordinator_phone,
            c.registration_fee
        FROM registrations r
        JOIN competitions c ON r.comp_id = c.id
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = ?
        ORDER BY e.date ASC
    `;

    db.all(query, [userId], (err, registrations) => {
        if (err) {
            console.error('My Registrations Fetch Error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve your registrations.' });
        }
        res.json(registrations);
    });
});


// ==========================================================
// 10. CHECK REGISTRATION STATUS (Unchanged)
// ...
// ==========================================================
router.get('/check-status/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `SELECT comp_id, event_id FROM registrations WHERE user_id = ?`;
    
    db.all(query, [userId], (err, status) => {
        if (err) {
            console.error('Registration Status Check Error:', err.message);
            return res.status(500).json({ error: 'Failed to check registration status.' });
        }
        res.json(status);
    });
});


module.exports = router;
