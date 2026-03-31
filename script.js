// ============================================
// Universal Image Converter - JavaScript
// ============================================

// ========== SINGLE CONVERSION ==========

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('imageFile');
const fileLabel = document.querySelector('.file-input-label');
const convertBtn = document.querySelector('.convert-btn');
const formatSelect = document.getElementById('format');
const qualityInput = document.getElementById('quality');
const qualityValue = document.querySelector('.quality-value');
const progressSection = document.getElementById('progressSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const previewName = document.getElementById('previewName');
const previewSize = document.getElementById('previewSize');
const previewDimensions = document.getElementById('previewDimensions');
const resizeToggle = document.getElementById('resizeToggle');
const resizePanel = document.getElementById('resizePanel');

// Update quality display
qualityInput.addEventListener('input', function() {
    qualityValue.textContent = this.value;
});

// Quality range for batch conversion
const batchQualityInput = document.getElementById('batchQuality');
const batchQualityValue = document.querySelectorAll('.quality-value')[1];
batchQualityInput?.addEventListener('input', function() {
    if (batchQualityValue) batchQualityValue.textContent = this.value;
});

// Toggle resize panel
resizeToggle.addEventListener('click', function(e) {
    e.preventDefault();
    resizePanel.style.display = resizePanel.style.display === 'none' ? 'block' : 'none';
    resizeToggle.classList.toggle('active');
});

// File input change handler
fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        loadPreview(file);
        updateConvertButton();
    } else {
        resetFileInput();
    }
});

// Format selection handler
formatSelect.addEventListener('change', updateConvertButton);

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileLabel.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    fileLabel.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    fileLabel.addEventListener(eventName, unhighlight, false);
});

fileLabel.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    fileLabel.classList.add('drag-over');
}

function unhighlight(e) {
    fileLabel.classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        fileInput.files = files;
        const file = files[0];
        loadPreview(file);
        updateConvertButton();
    }
}

function updateConvertButton() {
    const hasFile = fileInput.files.length > 0;
    const hasFormat = formatSelect.value !== '';
    convertBtn.disabled = !(hasFile && hasFormat);
}

function resetFileInput() {
    fileLabel.classList.remove('file-selected');
    previewSection.style.display = 'none';
    updateConvertButton();
}

function resetForm() {
    uploadForm.reset();
    resetFileInput();
    hideAllSections();
    qualityInput.value = '85';
    qualityValue.textContent = '85';
    resizePanel.style.display = 'none';
    resizeToggle.classList.remove('active');
}

function hideAllSections() {
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Load and display image preview
function loadPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            previewImage.src = e.target.result;
            previewName.textContent = file.name;
            previewSize.textContent = `Size: ${formatFileSize(file.size)}`;
            previewDimensions.textContent = `Dimensions: ${img.width}x${img.height}px`;
            previewSection.style.display = 'block';
            
            // Auto-populate width if resize is being configured
            const widthInput = document.getElementById('width');
            if (!widthInput.value) {
                widthInput.placeholder = `Original width: ${img.width}px`;
            }
            const heightInput = document.getElementById('height');
            if (!heightInput.value) {
                heightInput.placeholder = `Original height: ${img.height}px`;
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Form submission
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('📤 Form submission started');
    
    hideAllSections();
    progressSection.style.display = 'block';
    
    // Create fresh FormData to ensure proper file handling
    const formData = new FormData();
    
    // Add file from input
    if (fileInput.files.length === 0) {
        console.error('❌ No file selected');
        showError('Please select a file');
        progressSection.style.display = 'none';
        return;
    }
    
    const file = fileInput.files[0];
    console.log(`📄 File selected: ${file.name}, Size: ${formatFileSize(file.size)}`);
    
    formData.append('file', file);
    formData.append('format', formatSelect.value);
    formData.append('quality', qualityInput.value);
    
    console.log(`📋 Conversion settings: Format=${formatSelect.value}, Quality=${qualityInput.value}`);
    
    // Add resize dimensions if provided
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    if (width) {
        formData.append('width', width);
        console.log(`📏 Width: ${width}`);
    }
    if (height) {
        formData.append('height', height);
        console.log(`📏 Height: ${height}`);
    }
    
    try {
        console.log('🚀 Sending conversion request to server...');
        
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });
        
        console.log(`📨 Server response status: ${response.status}`);
        
        const result = await response.json();
        
        progressSection.style.display = 'none';
        
        if (result.success) {
            console.log('✅ Conversion successful!', result);
            showResult(result);
        } else {
            console.error('❌ Conversion failed:', result.error);
            showError(result.error || 'Conversion failed');
        }
    } catch (error) {
        progressSection.style.display = 'none';
        console.error('❌ Network or parsing error:', error);
        showError('Network error: ' + error.message);
    }
});

function showResult(result) {
    const resultDetails = document.getElementById('resultDetails');
    const downloadLink = document.getElementById('downloadLink');
    
    const savingInfo = result.savingPercent > 0 
        ? `<div class="detail-item"><span class="detail-label">💾 Size Reduction:</span><span class="detail-value">${result.savingPercent}% smaller</span></div>`
        : '';
    
    resultDetails.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">📤 Format:</span>
            <span class="detail-value">${result.format}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">📊 Original Size:</span>
            <span class="detail-value">${result.originalSize}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">📦 Converted Size:</span>
            <span class="detail-value">${result.convertedSize}</span>
        </div>
        ${savingInfo}
        <div class="detail-item">
            <span class="detail-label">📸 Dimensions:</span>
            <span class="detail-value">${result.dimensions.original}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">📄 Filename:</span>
            <span class="detail-value">${result.filename}</span>
        </div>
    `;
    
    downloadLink.href = result.downloadUrl;
    downloadLink.download = result.filename;
    resultSection.style.display = 'block';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorSection.style.display = 'block';
}

// ========== BATCH CONVERSION ==========

const batchFiles = document.getElementById('batchFiles');
const batchUploadLabel = document.querySelector('.batch-upload-label');
const batchFilesList = document.getElementById('batchFilesList');
const batchOptionsSection = document.getElementById('batchOptionsSection');
const batchConvertBtn = document.getElementById('batchConvertBtn');
const batchFormat = document.getElementById('batchFormat');
const batchProgressSection = document.getElementById('batchProgressSection');
const batchResultsSection = document.getElementById('batchResultsSection');
const currentFileSpan = document.getElementById('currentFile');
const totalFilesSpan = document.getElementById('totalFiles');
const progressPercentSpan = document.getElementById('progressPercent');
const batchProgressFill = document.getElementById('batchProgressFill');

let selectedBatchFiles = [];

// Batch file input change
batchFiles.addEventListener('change', function() {
    selectedBatchFiles = Array.from(this.files).slice(0, 10);
    updateBatchFilesList();
});

// Batch drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    batchUploadLabel.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    batchUploadLabel.addEventListener(eventName, function() {
        batchUploadLabel.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    batchUploadLabel.addEventListener(eventName, function() {
        batchUploadLabel.classList.remove('drag-over');
    }, false);
});

batchUploadLabel.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        selectedBatchFiles = Array.from(files).slice(0, 10);
        batchFiles.files = new DataTransfer().items.length === 0 ? new DataTransfer().items : batchFiles.files;
        updateBatchFilesList();
    }
}, false);

function updateBatchFilesList() {
    if (selectedBatchFiles.length === 0) {
        batchFilesList.style.display = 'none';
        batchOptionsSection.style.display = 'none';
        return;
    }

    let filesHTML = '<div class="files-header"><strong>Selected Files (' + selectedBatchFiles.length + '):</strong></div>';
    filesHTML += '<ul class="files-container">';
    
    selectedBatchFiles.forEach((file, index) => {
        filesHTML += `<li class="file-item">
            <i class="fas fa-image"></i>
            <span>${file.name}</span>
            <span class="file-info">${formatFileSize(file.size)}</span>
            <button class="remove-file-btn" data-index="${index}" type="button">
                <i class="fas fa-times"></i>
            </button>
        </li>`;
    });
    
    filesHTML += '</ul>';
    batchFilesList.innerHTML = filesHTML;
    batchFilesList.style.display = 'block';
    batchOptionsSection.style.display = 'block';
    
    // Event listeners for remove buttons
    document.querySelectorAll('.remove-file-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const index = parseInt(this.dataset.index);
            selectedBatchFiles.splice(index, 1);
            updateBatchFilesList();
        });
    });
}

// Batch conversion
batchConvertBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    
    if (selectedBatchFiles.length === 0) {
        showError('Please select at least one file');
        return;
    }
    
    if (!batchFormat.value) {
        showError('Please select output format');
        return;
    }
    
    batchFilesList.style.display = 'none';
    batchOptionsSection.style.display = 'none';
    batchResultsSection.style.display = 'none';
    batchProgressSection.style.display = 'block';
    
    const formData = new FormData();
    selectedBatchFiles.forEach(file => {
        formData.append('files', file);
    });
    formData.append('format', batchFormat.value);
    formData.append('quality', batchQualityInput.value);
    
    totalFilesSpan.textContent = selectedBatchFiles.length;
    
    try {
        const response = await fetch('/batch-convert', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showBatchResults(result);
        } else {
            throw new Error(result.error || 'Batch conversion failed');
        }
    } catch (error) {
        batchProgressSection.style.display = 'none';
        showError('Batch conversion error: ' + error.message);
    }
});

function showBatchResults(result) {
    batchProgressSection.style.display = 'none';
    
    let resultsHTML = `<div class="batch-summary">
        <div class="summary-stat">
            <span class="stat-label">✅ Successful:</span>
            <span class="stat-value">${result.stats.successful}/${result.stats.total}</span>
        </div>`;
    
    if (result.stats.failed > 0) {
        resultsHTML += `<div class="summary-stat error">
            <span class="stat-label">❌ Failed:</span>
            <span class="stat-value">${result.stats.failed}</span>
        </div>`;
    }
    
    resultsHTML += '</div><div class="batch-items">';
    
    result.results.forEach(item => {
        if (item.success) {
            resultsHTML += `<div class="batch-item success">
                <i class="fas fa-check-circle"></i>
                <div class="item-details">
                    <p class="item-name">${item.originalName}</p>
                    <p class="item-info">→ ${item.convertedName} (${item.size})</p>
                </div>
                <a href="${item.downloadUrl}" class="mini-download-btn" download>
                    <i class="fas fa-download"></i>
                </a>
            </div>`;
        } else {
            resultsHTML += `<div class="batch-item error">
                <i class="fas fa-times-circle"></i>
                <div class="item-details">
                    <p class="item-name">${item.originalName}</p>
                    <p class="item-error">${item.error}</p>
                </div>
            </div>`;
        }
    });
    
    resultsHTML += '</div>';
    document.getElementById('batchResultsList').innerHTML = resultsHTML;
    batchResultsSection.style.display = 'block';
}

function resetBatchForm() {
    batchFiles.value = '';
    selectedBatchFiles = [];
    batchFilesList.style.display = 'none';
    batchOptionsSection.style.display = 'none';
    batchProgressSection.style.display = 'none';
    batchResultsSection.style.display = 'none';
    batchFormat.value = '';
    batchQualityInput.value = '85';
    if (batchQualityValue) batchQualityValue.textContent = '85';
}

// ========== TAB NAVIGATION ==========

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        // Remove active class from all tabs and contents
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        this.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
        
        // Reset forms when switching tabs
        if (targetTab === 'batch-convert') {
            resetForm();
        } else {
            resetBatchForm();
        }
    });
});

// ========== UTILITY FUNCTIONS ==========

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const decimal = i === 0 ? 0 : 2;
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimal)) + ' ' + sizes[i];
}

// Update batch progress
function updateBatchProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    currentFileSpan.textContent = current;
    progressPercentSpan.textContent = percent + '%';
    batchProgressFill.style.width = percent + '%';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('✨ Image Converter Pro Loaded');
    console.log('🚀 Supported Formats: JPG, PNG, WEBP, GIF, BMP, HEIC, TIFF');
});
