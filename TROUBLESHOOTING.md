# 🔍 Image Conversion Troubleshooting Guide

## ✅ What's Working
- ✓ Server is running on http://localhost:3000
- ✓ All dependencies are installed (Express, Sharp, heic-convert, multer)
- ✓ Directories created: uploads/, converted/
- ✓ Frontend files loaded: index.html, script.js, style.css
- ✓ Backend endpoints available: /convert, /batch-convert

## 🐛 Common Issues & Solutions

### Issue 1: Upload doesn't trigger
**Symptoms:** Click upload button but nothing happens

**Solutions:**
```bash
# Check browser console (F12):
1. Open DevTools (F12)
2. Go to Console tab
3. Try uploading - look for red errors
4. Common errors: CORS issues, network errors

# Check if format dropdown is selected:
- Make sure to select a target format (JPG, PNG, etc.)
- Check browser console for "Please select format" message
```

### Issue 2: "Network error" or blank response
**Symptoms:** Upload works but conversion fails with network error

**Solutions:**
```bash
# Check server terminal for errors:
cd "c:\Users\Lemie\OneDrive\Desktop\App v\heic-converter\heic-converter"
npm start

# Look for any ❌ error messages in the console
# Common issues:
- Sharp library not working
- File permission denied
- Port 3000 already in use
```

### Issue 3: "Unsupported file format"
**Symptoms:** Server rejects the image file

**Solutions:**
- Ensure file is actually an image (JPG, PNG, HEIC, etc.)
- Check if file extension is supported
- Try uploading with a .jpg file first to test
- Server logs should show detected format

### Issue 4: Conversion hangs/takes too long
**Symptoms:** Progress bar stays stuck

**Solutions:**
- Check file size (limit is 50MB)
- Reduce quality setting (lower = faster)
- Check if server is responding to /health endpoint:
  ```
  Visit: http://localhost:3000/health
  Should return JSON with status: "ok"
  ```

### Issue 5: Downloaded file is corrupted
**Symptoms:** File downloads but can't open

**Solutions:**
- Try different output format
- Check Sharp is working:
  ```
  Visit: http://localhost:3000/test-sharp
  Should return: "Sharp library is working correctly"
  ```

## 🧪 Diagnostic Tests

### Test 1: Check Server Health
```
GET http://localhost:3000/health
```
Expected: `{ status: "ok", ... }`

### Test 2: Test Sharp Library
```
GET http://localhost:3000/test-sharp
```
Expected: `{ status: "ok", message: "Sharp library is working correctly" }`

### Test 3: Detect Image Format
```
POST http://localhost:3000/detect-format
(Upload an image file)
```
Expected: Returns detected format

### Test 4: Check Directories
```powershell
dir "c:\Users\Lemie\OneDrive\Desktop\App v\heic-converter\uploads"
dir "c:\Users\Lemie\OneDrive\Desktop\App v\heic-converter\converted"
```
Should be empty or contain files

## 📋 Required Information for Debugging

**Please provide:**
1. What's the exact error message you see?
2. Is it in browser console (F12) or server terminal?
3. Can you take a screenshot?
4. What file type are you trying to convert?
5. Is the server running (terminal shows "🚀 Running on http://localhost:3000")?

## 🚀 Quick Fix Checklist

- [ ] Server is running (`npm start`)
- [ ] Browser shows http://localhost:3000
- [ ] Select a file (JPG, PNG, HEIC, etc.)
- [ ] Select target format from dropdown
- [ ] Quality slider is visible
- [ ] Click "Convert" button
- [ ] Wait for progress to complete
- [ ] Check browser F12 console for errors
- [ ] Check server terminal for errors

## 📝 Server Log Output

When running, the server should show:
```
🚀 Universal Image Converter Server
📍 Running on http://localhost:3000

📁 Directories:
   Uploads: C:\Users\Lemie\OneDrive\Desktop\App v\heic-converter\uploads
   Converted: C:\Users\Lemie\OneDrive\Desktop\App v\heic-converter\converted

📥 Supported Input Formats: JPG, JPEG, PNG, WEBP, GIF, BMP, HEIC, HEIF, TIFF
📤 Supported Output Formats: JPG, JPEG, PNG, WEBP, GIF, HEIC, HEIF, TIFF
```

When conversion request arrives, you should see:
```
🔄 Conversion request received
📄 File: filename.jpg, Size: 2000000 bytes
📤 Target format: png, Quality: 90
...
✨ Conversion successful! Output: converted-1711827234567.png
```

---

**Tell me what error you're seeing and I'll fix it!**
