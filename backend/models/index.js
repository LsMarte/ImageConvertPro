const db = require('../config/database');

/**
 * Conversion Model - handles conversion records
 */
class Conversion {
    /**
     * Create a new conversion record
     */
    static async create(data) {
        const sql = `
            INSERT INTO conversions (
                session_id, filename_original, filename_converted, 
                format_input, format_output, quality, 
                original_size, converted_size, 
                width_original, height_original, 
                width_resized, height_resized, 
                duration_ms, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return db.run(sql, [
            data.sessionId,
            data.originalFilename,
            data.convertedFilename,
            data.inputFormat,
            data.outputFormat,
            data.quality || 85,
            data.originalSize,
            data.convertedSize,
            data.originalWidth,
            data.originalHeight,
            data.resizedWidth || null,
            data.resizedHeight || null,
            data.duration || 0,
            'completed'
        ]);
    }

    /**
     * Get conversion by ID
     */
    static async getById(id) {
        const sql = 'SELECT * FROM conversions WHERE id = ?';
        return db.get(sql, [id]);
    }

    /**
     * Get all conversions for a session
     */
    static async getBySession(sessionId) {
        const sql = 'SELECT * FROM conversions WHERE session_id = ? ORDER BY created_at DESC LIMIT 100';
        return db.query(sql, [sessionId]);
    }

    /**
     * Get conversion statistics
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_conversions,
                SUM(original_size) as total_original_bytes,
                SUM(converted_size) as total_converted_bytes,
                AVG(duration_ms) as avg_duration,
                format_output as most_used_format
            FROM conversions
            GROUP BY format_output
            ORDER BY COUNT(*) DESC
        `;
        return db.query(sql, []);
    }

    /**
     * Get today's conversions
     */
    static async getTodayStats() {
        const sql = `
            SELECT 
                COUNT(*) as count,
                SUM(original_size) as total_bytes_in,
                SUM(converted_size) as total_bytes_out,
                AVG(duration_ms) as avg_duration
            FROM conversions
            WHERE DATE(created_at) = DATE('now')
        `;
        return db.get(sql, []);
    }

    /**
     * Delete old conversions (older than days)
     */
    static async deleteOldRecords(days = 30) {
        const sql = `
            DELETE FROM conversions 
            WHERE DATE(created_at) < DATE('now', '-${days} days')
        `;
        return db.run(sql, []);
    }
}

/**
 * Session Model - handles user sessions
 */
class Session {
    /**
     * Create a new session
     */
    static async create(data) {
        const sql = `
            INSERT INTO sessions (session_id, ip_address, total_conversions)
            VALUES (?, ?, 0)
        `;
        return db.run(sql, [data.sessionId, data.ipAddress]);
    }

    /**
     * Get session by ID
     */
    static async getById(sessionId) {
        const sql = 'SELECT * FROM sessions WHERE session_id = ?';
        return db.get(sql, [sessionId]);
    }

    /**
     * Update session activity
     */
    static async updateActivity(sessionId) {
        const sql = `
            UPDATE sessions 
            SET last_activity = CURRENT_TIMESTAMP, total_conversions = total_conversions + 1
            WHERE session_id = ?
        `;
        return db.run(sql, [sessionId]);
    }

    /**
     * Update session bytes
     */
    static async updateBytes(sessionId, bytesIn, bytesOut) {
        const sql = `
            UPDATE sessions 
            SET total_bytes_processed = total_bytes_processed + ?,
                total_bytes_output = total_bytes_output + ?
            WHERE session_id = ?
        `;
        return db.run(sql, [bytesIn, bytesOut, sessionId]);
    }

    /**
     * Get active sessions (last 24 hours)
     */
    static async getActiveSessions() {
        const sql = `
            SELECT COUNT(*) as count 
            FROM sessions 
            WHERE last_activity > DATETIME('now', '-24 hours')
        `;
        return db.get(sql, []);
    }
}

/**
 * BatchJob Model - handles batch conversion jobs
 */
class BatchJob {
    /**
     * Create a new batch job
     */
    static async create(data) {
        const sql = `
            INSERT INTO batch_jobs (
                batch_id, session_id, format_output, quality, 
                total_files, status
            ) VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        return db.run(sql, [
            data.batchId,
            data.sessionId,
            data.format,
            data.quality || 85,
            data.totalFiles
        ]);
    }

    /**
     * Update batch job progress
     */
    static async updateProgress(batchId, processed, failed) {
        const sql = `
            UPDATE batch_jobs
            SET processed_files = ?, failed_files = ?
            WHERE batch_id = ?
        `;
        return db.run(sql, [processed, failed, batchId]);
    }

    /**
     * Complete batch job
     */
    static async complete(batchId) {
        const sql = `
            UPDATE batch_jobs
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE batch_id = ?
        `;
        return db.run(sql, [batchId]);
    }

    /**
     * Get batch job by ID
     */
    static async getById(batchId) {
        const sql = 'SELECT * FROM batch_jobs WHERE batch_id = ?';
        return db.get(sql, [batchId]);
    }
}

module.exports = {
    Conversion,
    Session,
    BatchJob
};
