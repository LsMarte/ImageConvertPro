const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const heicConvert = require('heic-convert');

const app = express();
const PORT = process.env.PORT || 3000;

// Create necessary directories
const uploadsDir = path.join(__dirname, '..', 'uploads');
const convertedDir = path.join(__dirname, '..', 'converted');
const publicDir = path.join(__dirname, '..', 'public');

[uploadsDir, convertedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Supported input and output formats
const supportedInputFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'tiff'];
// BMP output not supported by Sharp - use PNG as fallback
const supportedOutputFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'tiff'];

// MIME types for all supported formats
const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'tiff': 'image/tiff'
};

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept multiple image formats
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
            'image/heic', 'image/heif', 'image/tiff', 'image/x-tiff'
        ];
        
        const extension = path.extname(file.originalname).toLowerCase().slice(1);
        const isValidExtension = supportedInputFormats.includes(extension);
        
        if (allowedMimes.includes(file.mimetype) || isValidExtension) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file format. Supported formats: ' + supportedInputFormats.join(', ')), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Serve static files
app.use(express.static(publicDir));
app.use('/converted', express.static(convertedDir));
app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('✅ Health check');
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        supportedInputFormats,
        supportedOutputFormats
    });
});

// Test endpoint to verify Sharp is working
app.get('/test-sharp', async (req, res) => {
    try {
        console.log('🧪 Testing Sharp library...');
        
        // Create a simple test image
        const testBuffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 0, b: 0 }
            }
        })
        .jpeg()
        .toBuffer();
        
        console.log('✅ Sharp test successful. Test image size:', testBuffer.length);
        res.json({ 
            status: 'ok',
            message: 'Sharp library is working correctly',
            testImageSize: testBuffer.length
        });
    } catch (error) {
        console.error('❌ Sharp test failed:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Sharp library test failed',
            error: error.message
        });
    }
});

// Detect format endpoint for testing
app.post('/detect-format', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const inputBuffer = fs.readFileSync(req.file.path);
        const detectedFormat = detectFormat(req.file.originalname, inputBuffer);

        console.log(`📋 Format detection: ${req.file.originalname} → ${detectedFormat}`);

        fs.unlinkSync(req.file.path);

        res.json({
            filename: req.file.originalname,
            detectedFormat: detectedFormat,
            supported: supportedInputFormats.includes(detectedFormat),
            fileSize: req.file.size
        });
    } catch (error) {
        console.error('❌ Format detection error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Helper function to detect file format
function detectFormat(filename, buffer) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    
    // Magic byte detection
    if (buffer.length >= 4) {
        // HEIC: ftyp heic
        if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
            return 'heic';
        }
        // PNG: 89 50 4E 47
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'png';
        }
        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'jpg';
        }
        // WebP: RIFF ... WEBP
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
                return 'webp';
            }
        }
        // GIF: GIF89a or GIF87a
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            return 'gif';
        }
        // BMP: 42 4D
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
            return 'bmp';
        }
    }
    
    return supportedInputFormats.includes(ext) ? ext : 'unknown';
}

// Helper function to convert image from any format
async function convertFromAnyFormat(buffer, inputFormat) {
    try {
        // If it's already a standard web format, return sharp-ready buffer
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(inputFormat)) {
            return buffer;
        }
        
        // If it's HEIC/HEIF, convert to JPEG first
        if (['heic', 'heif'].includes(inputFormat)) {
            const jpegBuffer = await heicConvert({
                buffer: buffer,
                format: 'JPEG',
                quality: 0.9
            });
            return jpegBuffer;
        }
        
        return buffer;
    } catch (error) {
        console.error('Format conversion error:', error);
        throw new Error(`Failed to process ${inputFormat.toUpperCase()} format: ${error.message}`);
    }
}

// Helper function to encode to output format
async function encodeToFormat(sharpInstance, format, quality = 90, dimensions = null) {
    try {
        let instance = sharpInstance;
        
        // Apply resize if dimensions provided
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
                // HEIF encoding
                try {
                    return await instance.toFormat('heif', { quality }).toBuffer();
                } catch (heifError) {
                    console.warn('⚠️ HEIF encoding failed, falling back to JPEG:', heifError.message);
                    // Fallback to JPEG if HEIF fails
                    return await instance.jpeg({ quality, progressive: true }).toBuffer();
                }
                
            default:
                return await instance.jpeg({ quality, progressive: true }).toBuffer();
        }
    } catch (error) {
        console.error('Format encoding error:', error);
        throw new Error(`Failed to encode to ${format.toUpperCase()}: ${error.message}`);
    }
}

// Convert API endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
    try {
        console.log('🔄 Conversion request received');
        
        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        console.log(`📄 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

        const { format, quality, width, height } = req.body;
        
        console.log(`📤 Target format: ${format}, Quality: ${quality}`);
        
        if (!format || !supportedOutputFormats.includes(format.toLowerCase())) {
            return res.status(400).json({ 
                success: false,
                error: `Invalid output format. Supported formats: ${supportedOutputFormats.join(', ')}` 
            });
        }

        const inputPath = req.file.path;
        const inputBuffer = fs.readFileSync(inputPath);
        
        // Detect input format
        const inputFormat = detectFormat(req.file.originalname, inputBuffer);
        console.log(`🔍 Detected input format: ${inputFormat}`);
        
        if (!supportedInputFormats.includes(inputFormat)) {
            fs.unlinkSync(inputPath);
            return res.status(400).json({ 
                success: false,
                error: `Unsupported input format detected: ${inputFormat}` 
            });
        }

        // Convert from input format to standard format
        console.log('⚙️ Converting input format to standard format...');
        const processedBuffer = await convertFromAnyFormat(inputBuffer, inputFormat);
        console.log(`✅ Input processed. Buffer size: ${processedBuffer.length} bytes`);
        
        // Load image and get metadata
        let sharpInstance = sharp(processedBuffer);
        const metadata = await sharpInstance.metadata();
        console.log(`📐 Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
        
        // Encode to output format
        const outputFilename = `converted-${Date.now()}.${format.toLowerCase()}`;
        const outputPath = path.join(convertedDir, outputFilename);
        
        const dimensions = {
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null
        };
        
        console.log('🎨 Encoding to output format...');
        let outputBuffer = await encodeToFormat(sharpInstance, format, quality, dimensions);
        console.log(`✅ Encoding complete. Output size: ${outputBuffer.length} bytes`);
        
        // Write output file
        fs.writeFileSync(outputPath, outputBuffer);
        
        // Get file info
        const outputStats = fs.statSync(outputPath);
        const originalStats = fs.statSync(inputPath);

        // Clean up uploaded file
        fs.unlinkSync(inputPath);

        console.log(`✨ Conversion successful! Output: ${outputFilename}`);

        res.json({
            success: true,
            message: 'File converted successfully!',
            downloadUrl: `/converted/${outputFilename}`,
            originalSize: formatFileSize(originalStats.size),
            convertedSize: formatFileSize(outputStats.size),
            savingPercent: Math.round(((originalStats.size - outputStats.size) / originalStats.size) * 100),
            format: format.toUpperCase(),
            filename: outputFilename,
            dimensions: {
                original: `${metadata.width}x${metadata.height}`,
                output: dimensions.width || dimensions.height ? 'Resized' : 'Original'
            }
        });

    } catch (error) {
        console.error('❌ Conversion error:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            success: false,
            error: 'Conversion failed: ' + error.message 
        });
    }
});

// Batch conversion endpoint
app.post('/batch-convert', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        const { format, quality } = req.body;
        
        if (!format || !supportedOutputFormats.includes(format.toLowerCase())) {
            return res.status(400).json({ 
                success: false,
                error: `Invalid output format. Supported formats: ${supportedOutputFormats.join(', ')}` 
            });
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const file of req.files) {
            try {
                const inputPath = file.path;
                const inputBuffer = fs.readFileSync(inputPath);
                const inputFormat = detectFormat(file.originalname, inputBuffer);

                // Convert from input format
                const processedBuffer = await convertFromAnyFormat(inputBuffer, inputFormat);
                
                // Load and encode
                let sharpInstance = sharp(processedBuffer);
                const outputFilename = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${format.toLowerCase()}`;
                const outputPath = path.join(convertedDir, outputFilename);
                
                let outputBuffer = await encodeToFormat(sharpInstance, format, quality);
                fs.writeFileSync(outputPath, outputBuffer);

                const outputStats = fs.statSync(outputPath);
                fs.unlinkSync(inputPath);

                results.push({
                    originalName: file.originalname,
                    convertedName: outputFilename,
                    success: true,
                    size: formatFileSize(outputStats.size),
                    downloadUrl: `/converted/${outputFilename}`
                });
                successCount++;
            } catch (error) {
                console.error(`Error converting ${file.originalname}:`, error);
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                results.push({
                    originalName: file.originalname,
                    success: false,
                    error: error.message
                });
                errorCount++;
            }
        }

        res.json({
            success: true,
            message: `Batch conversion complete: ${successCount} successful, ${errorCount} failed`,
            results: results,
            stats: {
                total: req.files.length,
                successful: successCount,
                failed: errorCount
            }
        });

    } catch (error) {
        console.error('Batch conversion error:', error);
        
        // Clean up all uploaded files
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Batch conversion failed: ' + error.message 
        });
    }
});

// Get supported formats
app.get('/api/formats', (req, res) => {
    res.json({ 
        input: supportedInputFormats,
        output: supportedOutputFormats
    });
});

// Download converted file
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(convertedDir, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ success: false, error: 'Download failed' });
            }
        });
    } else {
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File too large. Maximum size is 50MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, error: 'Too many files. Maximum is 10 files.' });
        }
    }
    
    res.status(500).json({ success: false, error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Universal Image Converter Server`);
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log(`\n📁 Directories:`);
    console.log(`   Uploads: ${uploadsDir}`);
    console.log(`   Converted: ${convertedDir}`);
    console.log(`\n📥 Supported Input Formats: ${supportedInputFormats.join(', ').toUpperCase()}`);
    console.log(`📤 Supported Output Formats: ${supportedOutputFormats.join(', ').toUpperCase()}`);
    console.log(`\n✨ Features:`);
    console.log(`   ✓ Convert between any image formats`);
    console.log(`   ✓ HEIC/HEIF encoding support`);
    console.log(`   ✓ Quality control (1-100)`);
    console.log(`   ✓ Image resizing`);
    console.log(`   ✓ Batch conversion (up to 10 files)`);
    console.log(`\n`);
});

module.exports = app;
