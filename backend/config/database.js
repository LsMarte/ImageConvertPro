const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'converter.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

/**
 * Initialize database connection and create tables
 */
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Database connection error:', err);
                reject(err);
            } else {
                console.log('✅ Database connected:', DB_PATH);
                
                // Enable foreign keys
                db.run('PRAGMA foreign_keys = ON', (err) => {
                    if (err) {
                        console.error('❌ Error enabling foreign keys:', err);
                        reject(err);
                    } else {
                        // Read and execute schema
                        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
                        db.exec(schema, (err) => {
                            if (err) {
                                console.error('❌ Error creating schema:', err);
                                reject(err);
                            } else {
                                console.log('✅ Database schema initialized');
                                resolve(db);
                            }
                        });
                    }
                });
            }
        });
    });
};

/**
 * Get database instance
 */
const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};

/**
 * Run query with parameters
 */
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Query error:', err, 'SQL:', sql);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

/**
 * Run insert/update/delete with parameters
 */
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Execute error:', err, 'SQL:', sql);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

/**
 * Execute single query
 */
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('❌ Query error:', err, 'SQL:', sql);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

/**
 * Close database connection
 */
const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                    reject(err);
                } else {
                    console.log('✅ Database closed');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

module.exports = {
    initDatabase,
    getDatabase,
    query,
    run,
    get,
    closeDatabase
};
