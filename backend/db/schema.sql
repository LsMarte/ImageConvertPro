-- Image Converter Pro Database Schema

-- Conversions table - stores all image conversion records
CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    filename_original TEXT NOT NULL,
    filename_converted TEXT NOT NULL,
    format_input TEXT NOT NULL,
    format_output TEXT NOT NULL,
    quality INTEGER DEFAULT 85,
    original_size INTEGER NOT NULL,
    converted_size INTEGER NOT NULL,
    width_original INTEGER,
    height_original INTEGER,
    width_resized INTEGER,
    height_resized INTEGER,
    duration_ms INTEGER,
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(filename_converted)
);

-- User sessions table - tracks user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    total_conversions INTEGER DEFAULT 0,
    total_bytes_processed INTEGER DEFAULT 0,
    total_bytes_output INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Batch conversions table - tracks batch jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    session_id TEXT NOT NULL,
    format_output TEXT NOT NULL,
    quality INTEGER DEFAULT 85,
    total_files INTEGER,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);

-- Statistics table - daily/hourly statistics
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE,
    total_conversions INTEGER DEFAULT 0,
    total_bytes_processed INTEGER DEFAULT 0,
    avg_conversion_time_ms REAL,
    most_used_format TEXT,
    unique_sessions INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_format ON conversions(format_output);
CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_batch_id ON batch_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
