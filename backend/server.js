#!/usr/bin/env node

/**
 * ImageConvertPro Backend Server
 * Main application file - Organized MVC architecture with database integration
 * 
 * Structure:
 * - config/: Configuration files (database connection)
 * - routes/: Route definitions  
 * - controllers/: Business logic for handling requests
 * - middleware/: Express middleware (CORS, logging, etc.)
 * - models/: Database models and query builders
 * - db/: Database schema SQL file
 * - utils/: Helper functions and utilities
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import middleware
const cors = require('./middleware/cors');

// Import routes
const conversionRoutes = require('./routes/conversions');

// Import database
const { initDatabase } = require('./config/database');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// Middleware Setup
// ========================================

// CORS
app.use(cors);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ========================================
// Static File Serving
// ========================================

// Serve frontend from public directory
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}

// Serve frontend from organized frontend directory (if it exists)
const frontendDir = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
}

// Serve converted images
const convertedDir = path.join(__dirname, '..', 'converted');
if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir, { recursive: true });
}
app.use('/converted', express.static(convertedDir));

// ========================================
// API Routes
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        endpoint: `http://localhost:${PORT}`
    });
});

// Database test endpoint
app.get('/test-sharp', async (req, res) => {
    try {
        const sharp = require('sharp');
        
        // Create a simple test image
        const testBuffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 0, b: 0 }
            }
        }).jpeg().toBuffer();
        
        // Test conversion
        const converted = await sharp(testBuffer)
            .png()
            .toBuffer();
        
        res.json({
            success: true,
            message: 'Sharp library is working correctly',
            testImageSize: testBuffer.length,
            convertedSize: converted.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Conversion API routes
app.use('/api', conversionRoutes);

// API documentation
app.get('/api', (req, res) => {
    res.json({
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            testSharp: 'GET /test-sharp',
            convertImage: 'POST /api/convert',
            batchConvert: 'POST /api/batch-convert'
        },
        convertEndpoint: {
            method: 'POST',
            path: '/api/convert',
            description: 'Convert a single image file',
            body: 'multipart/form-data',
            fields: {
                file: 'Image file (required)',
                format: 'Output format: jpg, png, webp, gif, heic, tiff (required)',
                quality: 'Output quality 1-100 (optional, default 85)',
                width: 'Resize width in pixels (optional)',
                height: 'Resize height in pixels (optional)'
            }
        },
        batchEndpoint: {
            method: 'POST',
            path: '/api/batch-convert',
            description: 'Convert multiple image files',
            body: 'multipart/form-data',
            fields: {
                files: 'Multiple image files (required, max 10)',
                format: 'Output format (required)',
                quality: 'Output quality (optional)'
            }
        }
    });
});

// Serve index.html for root path (SPA fallback)
app.get('/', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({
            message: 'ImageConvertPro API Server',
            version: '1.0.0',
            documentation: '/api'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        docs: 'Visit /api for documentation'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        path: req.path
    });
});

// ========================================
// Server Initialization
// ========================================

async function startServer() {
    try {
        console.log('🚀 Starting ImageConvertPro Backend Server...\n');
        
        // Initialize database
        console.log('📊 Initializing database...');
        await initDatabase();
        console.log('✅ Database initialized\n');
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('═'.repeat(50));
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log('═'.repeat(50));
            console.log('\n📋 Available endpoints:');
            console.log(`  GET  /health              - Health check`);
            console.log(`  GET  /test-sharp          - Test image processing`);
            console.log(`  POST /api/convert         - Convert single image`);
            console.log(`  POST /api/batch-convert   - Convert multiple images`);
            console.log(`  GET  /api                 - API documentation`);
            console.log('\n💡 Tips:');
            console.log(`  - Frontend URL: http://localhost:${PORT}`);
            console.log(`  - API Documentation: http://localhost:${PORT}/api`);
            console.log(`  - Converted images: http://localhost:${PORT}/converted/\n`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down server...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
