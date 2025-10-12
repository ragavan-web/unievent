const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // 1. EVENTS TABLE (NEW COLUMN: registration_closed)
        db.run(`CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT NOT NULL, 
            department TEXT NOT NULL,
            date TEXT NOT NULL,
            venue TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            description TEXT,
            photo_url TEXT,
            max_comps_per_student INTEGER DEFAULT 2,
            organizer_id INTEGER,
            registration_closed INTEGER DEFAULT 0,
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        )`);

        // 2. COMPETITIONS TABLE (With ON DELETE CASCADE)
        db.run(`CREATE TABLE IF NOT EXISTS competitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            comp_name TEXT NOT NULL,
            comp_description TEXT,
            comp_type TEXT NOT NULL, 
            coordinator_phone TEXT,
            team_min INTEGER DEFAULT 1,
            team_max INTEGER DEFAULT 1,
            payment_required BOOLEAN DEFAULT 0,
            registration_fee INTEGER DEFAULT 0,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )`);

        // 3. USERS TABLE (Unchanged)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT, 
            regno TEXT UNIQUE, 
            department TEXT NOT NULL,
            year INTEGER, 
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student'
        )`);
        
        // 4. REGISTRATIONS TABLE (With ON DELETE CASCADE)
        db.run(`CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            comp_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            registration_date DATE NOT NULL,
            UNIQUE(user_id, comp_id), 
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (comp_id) REFERENCES competitions(id),
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )`);

        // Check and add `registration_closed` column if it's missing (for existing databases)
        db.serialize(() => {
            db.all("PRAGMA table_info(events);", [], (err, rows) => {
                if (err) {
                    console.error('Failed to read events table info:', err.message);
                    return;
                }
                const cols = rows.map(r => r.name);
                if (!cols.includes('registration_closed')) {
                    console.log("Adding 'registration_closed' column to events table.");
                    db.run("ALTER TABLE events ADD COLUMN registration_closed INTEGER DEFAULT 0;", (err2) => {
                        if (err2) {
                            console.error("Error adding registration_closed column:", err2.message);
                        } else {
                            console.log("'registration_closed' column added successfully.");
                        }
                    });
                }
            });
        });
    }
});

module.exports = db;