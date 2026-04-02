const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { convertSingleImage } = require('../controllers/conversionController');

const router = express.Router();

// Create upload directories if they don't exist
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const convertedDir = path.join(__dirname, '..', '..', 'converted');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir, { recursive: true });

// Configure multer for file uploads
const upload = multer({
    dest: uploadsDir,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/tiff',
            'image/bmp',
            'image/heic',
            'image/heif',
            'application/octet-stream' // Some browsers send HEIC as octet-stream
        ];
        
        if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only image files are allowed.'));
        }
    }
});

/**
 * POST /api/convert
 * Convert a single image file
 * 
 * Body (multipart/form-data):
 * - file: Image file to convert
 * - format: Output format (jpg, png, webp, gif, heic, tiff)
 * - quality: JPEG/WebP quality 1-100 (default 85)
 * - width: Optional resize width
 * - height: Optional resize height
 */
router.post('/convert', upload.single('file'), convertSingleImage);

/**
 * POST /api/batch-convert
 * Convert multiple image files at once
 * 
 * Body (multipart/form-data):
 * - files: Multiple image files
 * - format: Output format
 * - quality: Output quality
 */
router.post('/batch-convert', upload.array('files', 10), async (req, res) => {
    try {
        const { format, quality } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }
        
        console.log(`📦 Batch conversion: ${req.files.length} files`);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        // Process each file
        for (const file of req.files) {
            // Create a fake req/res for each conversion
            const fakeReq = {
                file,
                body: { format, quality },
                sessionID: req.sessionID,
                headers: req.headers
            };
            
            const fakeRes = {
                json: (data) => {
                    results.push({
                        filename: file.originalname,
                        ...data
                    });
                    if (data.success) successCount++;
                    else errorCount++;
                },
                status: (code) => ({
                    json: (data) => {
                        results.push({
                            filename: file.originalname,
                            success: false,
                            error: data.error || 'Unknown error',
                            code
                        });
                        errorCount++;
                    }
                })
            };
            
            // Process conversion
            await convertSingleImage(fakeReq, fakeRes);
        }
        
        console.log(`✅ Batch complete: ${successCount} successful, ${errorCount} failed`);
        
        res.json({
            success: true,
            message: `Batch conversion complete: ${successCount} successful, ${errorCount} failed`,
            results,
            totalFiles: req.files.length,
            successCount,
            errorCount
        });
        
    } catch (error) {
        console.error('❌ Batch conversion error:', error);
        res.status(500).json({
            success: false,
            error: 'Batch conversion failed: ' + error.message
        });
    }
});

module.exports = router;
