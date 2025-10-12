const express = require('express');
const router = express.Router();
const db = require('../models/db');

const checkOverlap = (start_time, end_time, existing_start, existing_end) => {
    return (start_time < existing_end && end_time > existing_start);
};

// 1. VENUE CONFLICT CHECK API ENDPOINT
router.post('/check-conflict', (req, res) => {
    const { date, venue, start_time, end_time } = req.body;

    const query = `
        SELECT start_time, end_time 
        FROM events 
        WHERE date = ? AND venue = ?
    `;

    db.all(query, [date, venue], (err, rows) => {
        if (err) {
            console.error('Database error during conflict check:', err.message);
            return res.status(500).json({ error: 'Server error during conflict check.' });
        }

        const isConflict = rows.some(event => 
            checkOverlap(start_time, end_time, event.start_time, event.end_time)
        );

        res.json({ isConflict: isConflict });
    });
});

// 2. EVENT ADDITION API ENDPOINT (Transactional)
router.post('/add', (req, res) => {
    const { 
        title, type, department, description, photo_url,
        date, venue, start_time, end_time, 
        max_comps_per_student, organizer_id, 
        competitions
    } = req.body;

    // Server-side Conflict Check
    const conflictCheckQuery = `
        SELECT start_time, end_time 
        FROM events 
        WHERE date = ? AND venue = ?
    `;
    
    db.all(conflictCheckQuery, [date, venue], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Server error during final conflict check.' });
        }
        
        const isConflict = rows.some(event => 
            checkOverlap(start_time, end_time, event.start_time, event.end_time)
        );

        if (isConflict) {
            console.log('Submission blocked: Venue conflict detected.');
            return res.status(409).json({ error: 'Venue conflict detected. Please select a different time or venue.' });
        }

        // --- Start Database Transaction ---
        db.serialize(() => {
            db.run('BEGIN TRANSACTION;', (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to start transaction.' });
                }

                // 1. Insert Main Event into 'events' table
                const eventStmt = db.prepare(`
                    INSERT INTO events (
                        title, type, department, description, photo_url,
                        date, venue, start_time, end_time, max_comps_per_student, organizer_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                eventStmt.run(
                    title, type, department, description, photo_url,
                    date, venue, start_time, end_time, max_comps_per_student, organizer_id, 
                    function(err) {
                        if (err) {
                            console.error('Event Insert Error:', err.message);
                            return db.run('ROLLBACK;', () => res.status(500).json({ error: 'Failed to save main event.' }));
                        }
                        
                        const eventId = this.lastID;
                        let success = true;

                        // 2. Loop through and insert all Competitions
                        competitions.forEach(comp => {
                            if (!success) return; 

                            const compStmt = db.prepare(`
                                INSERT INTO competitions (
                                    event_id, comp_name, comp_description, comp_type, coordinator_phone,
                                    team_min, team_max, payment_required, registration_fee
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `);
                            
                            compStmt.run(
                                eventId, comp.comp_name, comp.comp_description, comp.comp_type, comp.coordinator_phone,
                                comp.team_min, comp.team_max, comp.payment_required, comp.registration_fee,
                                function(compErr) {
                                    if (compErr) {
                                        success = false;
                                        console.error('Competition Insert Error:', compErr.message);
                                        db.run('ROLLBACK;', () => res.status(500).json({ error: 'Failed to save all competitions.' }));
                                    }
                                }
                            );
                            compStmt.finalize();
                        });

                        // 3. Commit Transaction if everything succeeded
                        if (success) {
                            db.run('COMMIT;', () => {
                                res.status(201).json({ 
                                    message: `Event "${title}" submitted successfully with ${competitions.length} competitions!`, 
                                    eventId: eventId 
                                });
                            });
                        }
                    }
                );
                eventStmt.finalize();
            }); 
        }); 
    }); 
});


// 3. FETCH ALL EVENTS WITH COMPETITIONS (For Students - Filtering)
router.get('/all', (req, res) => {
    const { department, type } = req.query; 
    
    let baseQuery = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (department && department !== 'all') {
        baseQuery += ' AND department = ?';
        params.push(department);
    }
    if (type && type !== 'all') {
        baseQuery += ' AND type = ?';
        params.push(type);
    }
    
    db.all(baseQuery, params, (err, events) => {
        if (err) {
            console.error('Filtered Event Fetch Error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch events.' });
        }

        if (events.length === 0) {
            return res.json([]);
        }

        db.all('SELECT * FROM competitions', (err, competitions) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch competitions.' });
            }

            const eventsWithCompetitions = events.map(event => {
                event.competitions = competitions.filter(comp => comp.event_id === event.id);
                return event;
            });

            res.json(eventsWithCompetitions);
        });
    });
});


// 4. ORGANIZER DASHBOARD SUMMARY
router.get('/summary/:department', (req, res) => {
    const department = req.params.department;
    
    db.get('SELECT COUNT(*) AS totalEvents FROM events WHERE department = ?', [department], (err, eventCount) => {
        if (err) return res.status(500).json({ error: 'DB Error fetching event count.' });

        db.get(`
            SELECT COUNT(r.id) AS totalRegistrations
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE e.department = ?
        `, [department], (err, regCount) => {
            if (err) return res.status(500).json({ error: 'DB Error fetching registration count.' });

            res.json({
                totalActiveEvents: eventCount.totalEvents, 
                eventsPendingApproval: 0, 
                totalRegistrations: regCount.totalRegistrations
            });
        });
    });
});


// 5. FETCH ORGANIZER'S EVENTS WITH STATS (Filter by organizer_id)
router.get('/department/:department/:organizerId', (req, res) => {
    const department = req.params.department;
    const organizerId = req.params.organizerId; 

    const query = `
        SELECT 
            e.id, 
            e.title, 
            e.date, 
            e.start_time, 
            e.end_time,
            e.venue,
            e.registration_closed,
            COUNT(DISTINCT c.id) AS totalComps,
            COUNT(r.id) AS totalRegistrations
        FROM events e
        LEFT JOIN competitions c ON e.id = c.event_id
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.organizer_id = ? 
        GROUP BY e.id, e.title, e.date, e.start_time, e.end_time, e.venue
        ORDER BY e.date DESC
    `;

    db.all(query, [organizerId], (err, events) => {
        if (err) {
            console.error('Organizer Event Fetch Error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch department events.' });
        }
        
        events.forEach(e => {
            e.totalComps = e.totalComps || 0;
            e.totalRegistrations = e.totalRegistrations || 0;
        });

        res.json(events);
    });
});


// 6. FETCH REGISTRATIONS FOR ONE EVENT (Organizer Report)
router.get('/registrations/:eventId', (req, res) => {
    const eventId = req.params.eventId;

    const query = `
        SELECT 
            r.registration_date, 
            u.name AS student_name, 
            u.regno, 
            u.department AS student_dept,
            u.phone,
            c.comp_name,
            c.comp_type,
            c.registration_fee
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        JOIN competitions c ON r.comp_id = c.id
        WHERE r.event_id = ?
        ORDER BY c.comp_name ASC, u.name ASC
    `;

    db.all(query, [eventId], (err, registrants) => {
        if (err) {
            console.error('Registration Detail Fetch Error:', err.message);
            return res.status(500).json({ error: 'Failed to fetch registration details.' });
        }
        res.json(registrants);
    });
});


// 7. COMPETITION REGISTRATION
router.post('/register', (req, res) => {
    const { event_id, comp_id, user_id } = req.body; 

    if (!user_id || isNaN(user_id)) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    db.get('SELECT registration_closed FROM events WHERE id = ?', [event_id], (err, event) => {
        if (err || !event) {
            return res.status(500).json({ error: 'Event data lookup failed.' });
        }
        
        if (event.registration_closed === 1) {
            return res.status(403).json({ error: 'Registration for this event is now closed.' });
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
});


// 8. FETCH MY REGISTRATIONS (For Student's "My Registrations" Page)
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


// 9. CHECK REGISTRATION STATUS (For Student Dashboard Badge)
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


// ADDED: Close registration for an event
router.post("/close/:id", (req, res) => {
    const eventId = req.params.id;
    const sql = "UPDATE events SET registration_closed = 1 WHERE id = ?";
    db.run(sql, [eventId], function (err) {
        if (err) {
            console.error("Error closing registration:", err.message);
            return res.status(500).json({ message: "Error closing registration" });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Event not found or already closed." });
        }
        return res.json({ message: "Registration closed successfully" });
    });
});

// ADDED: Delete an event completely
router.delete("/delete/:id", (req, res) => {
    const eventId = req.params.id;
    const sql = "DELETE FROM events WHERE id = ?";
    db.run(sql, [eventId], function (err) {
        if (err) {
            console.error("Error deleting event:", err.message);
            return res.status(500).json({ message: "Error deleting event" });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Event not found." });
        }
        return res.json({ message: "Event deleted successfully" });
    });
});

module.exports = router;