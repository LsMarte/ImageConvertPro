const sharp = require('sharp');
const heicConvert = require('heic-convert');
const fs = require('fs');
const path = require('path');
const { Conversion, Session } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const CONVERTED_DIR = path.join(__dirname, '..', '..', 'converted');

/**
 * Detect image format from magic bytes or extension
 */
function detectFormat(filename, buffer) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    
    if (buffer.length >= 4) {
        // HEIC/HEIF
        if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
            return 'heic';
        }
        // PNG
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'png';
        }
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'jpg';
        }
        // WebP
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
                return 'webp';
            }
        }
        // GIF
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            return 'gif';
        }
        // BMP
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
            return 'bmp';
        }
    }
    
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'tiff'].includes(ext) ? ext : 'unknown';
}

/**
 * Convert from various formats to standard format
 */
async function convertFromAnyFormat(buffer, inputFormat) {
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(inputFormat)) {
        return buffer;
    }
    
    if (['heic', 'heif'].includes(inputFormat)) {
        return await heicConvert({
            buffer: buffer,
            format: 'JPEG',
            quality: 0.9
        });
    }
    
    return buffer;
}

/**
 * Encode image to output format
 */
async function encodeToFormat(sharpInstance, format, quality = 90, dimensions = null) {
    let instance = sharpInstance;
    
    if (dimensions && (dimensions.width || dimensions.height)) {
        instance = instance.resize(
            dimensions.width || null,
            dimensions.height || null,
            { withoutEnlargement: true, fit: 'inside' }
        );
    }
    
    quality = parseInt(quality) || 90;
    
    switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
            return await instance.jpeg({ quality, progressive: true }).toBuffer();
        case 'png':
            return await instance.png({
                compressionLevel: Math.min(9, Math.floor(quality / 10))
            }).toBuffer();
        case 'webp':
            return await instance.webp({ quality }).toBuffer();
        case 'gif':
            return await instance.gif().toBuffer();
        case 'tiff':
            return await instance.tiff({ compression: 'deflate' }).toBuffer();
        case 'heic':
        case 'heif':
            try {
                return await instance.toFormat('heif', { quality }).toBuffer();
            } catch (heifError) {
                console.warn('⚠️ HEIF encoding failed, falling back to JPEG');
                return await instance.jpeg({ quality, progressive: true }).toBuffer();
            }
        default:
            return await instance.jpeg({ quality, progressive: true }).toBuffer();
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert single image
 */
async function convertSingleImage(req, res) {
    const startTime = Date.now();
    
    try {
        console.log('🔄 Conversion request received');
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        
        const { format, quality, width, height } = req.body;
        const sessionId = req.sessionID || req.headers['x-session-id'] || 'anonymous';
        
        console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
        
        if (!format || !['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'tiff'].includes(format.toLowerCase())) {
            return res.status(400).json({ success: false, error: 'Invalid output format' });
        }
        
        const inputPath = req.file.path;
        const inputBuffer = fs.readFileSync(inputPath);
        
        // Detect input format
        const inputFormat = detectFormat(req.file.originalname, inputBuffer);
        console.log(`🔍 Detected input format: ${inputFormat}`);
        
        if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'tiff'].includes(inputFormat)) {
            fs.unlinkSync(inputPath);
            return res.status(400).json({ success: false, error: 'Unsupported input format' });
        }
        
        // Convert from input format
        const processedBuffer = await convertFromAnyFormat(inputBuffer, inputFormat);
        
        // Load image and get metadata
        let sharpInstance = sharp(processedBuffer);
        const metadata = await sharpInstance.metadata();
        console.log(`📐 Image: ${metadata.width}x${metadata.height}px`);
        
        // Encode to output format
        const outputFilename = `converted-${Date.now()}.${format.toLowerCase()}`;
        const outputPath = path.join(CONVERTED_DIR, outputFilename);
        
        const dimensions = {
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null
        };
        
        const outputBuffer = await encodeToFormat(sharpInstance, format, quality, dimensions);
        fs.writeFileSync(outputPath, outputBuffer);
        
        // Get file stats
        const originalStats = fs.statSync(inputPath);
        const outputStats = fs.statSync(outputPath);
        const duration = Date.now() - startTime;
        
        // Save to database
        try {
            await Conversion.create({
                sessionId,
                originalFilename: req.file.originalname,
                convertedFilename: outputFilename,
                inputFormat,
                outputFormat: format.toLowerCase(),
                quality: parseInt(quality) || 85,
                originalSize: originalStats.size,
                convertedSize: outputStats.size,
                originalWidth: metadata.width,
                originalHeight: metadata.height,
                duration
            });
            
            // Update session
            await Session.updateActivity(sessionId);
            await Session.updateBytes(sessionId, originalStats.size, outputStats.size);
        } catch (dbErr) {
            console.warn('⚠️ Database error (non-critical):', dbErr);
        }
        
        // Clean up
        fs.unlinkSync(inputPath);
        
        console.log(`✨ Conversion successful! Output: ${outputFilename} (${duration}ms)`);
        
        res.json({
            success: true,
            message: 'File converted successfully!',
            downloadUrl: `/converted/${outputFilename}`,
            originalSize: formatFileSize(originalStats.size),
            convertedSize: formatFileSize(outputStats.size),
            savingPercent: Math.round(((originalStats.size - outputStats.size) / originalStats.size) * 100),
            format: format.toUpperCase(),
            filename: outputFilename,
            durationMs: duration,
            dimensions: {
                original: `${metadata.width}x${metadata.height}`,
                output: dimensions.width || dimensions.height ? 'Resized' : 'Original'
            }
        });
        
    } catch (error) {
        console.error('❌ Conversion error:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Conversion failed: ' + error.message
        });
    }
}

module.exports = {
    convertSingleImage,
    detectFormat,
    convertFromAnyFormat,
    encodeToFormat,
    formatFileSize
};
