import sqlite3
import os

DB_PATH = 'swiftfix.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Removed destructive DROP commands to preserve data for testing
    pass

    # Clients table
    cursor.execute('''
    CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL
    )
    ''')
    
    # Providers table
    cursor.execute('''
    CREATE TABLE providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        service_type TEXT NOT NULL,
        pincode TEXT NOT NULL,
        experience TEXT,
        rate TEXT,
        bio TEXT,
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT 0
    )
    ''')
    
    # Bookings table
    cursor.execute('''
    CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_id INTEGER,
        provider_id INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        photo_url TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (provider_id) REFERENCES providers (id),
        FOREIGN KEY (client_id) REFERENCES clients (id)
    )
    ''')

    # Reviews table
    cursor.execute('''
    CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL UNIQUE,
        client_id INTEGER NOT NULL,
        provider_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings (id),
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (provider_id) REFERENCES providers (id)
    )
    ''')
    
    # OTP Store table (for forgot password)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS otp_store (
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        otp TEXT NOT NULL,
        expiry INTEGER NOT NULL,
        PRIMARY KEY (email, role)
    )
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized successfully at {os.path.abspath(DB_PATH)}")

if __name__ == '__main__':
    init_db()
