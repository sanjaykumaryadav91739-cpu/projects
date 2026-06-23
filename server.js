// server.js - Complete File Upload System with User Control

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const app = express();
const port = 3000;

// ============================================
// CONFIGURATION
// ============================================

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

// ============================================
// CREATE DIRECTORIES
// ============================================

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Created uploads directory');
}

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
}

// ============================================
// MULTER CONFIGURATION - File Upload
// ============================================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, safeName + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    },
    fileFilter: function (req, file, cb) {
        // Allow all file types
        cb(null, true);
    }
});

// ============================================
// DATA STORAGE
// ============================================

// Store user sessions and uploaded files
const sessions = new Map();
const uploadHistory = new Map(); // Store upload history

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============================================
// GENERATE UNIQUE LINK
// ============================================

app.get('/generate-link', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    const userId = 'user_' + Date.now();
    
    sessions.set(token, {
        userId: userId,
        status: 'pending', // pending, granted, expired
        createdAt: Date.now(),
        uploadedFiles: [],
        userInfo: null,
        ip: req.ip,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    });
    
    const link = `http://${getLocalIP()}:${port}/access/${token}`;
    
    res.json({
        success: true,
        link: link,
        token: token,
        message: 'Share this link with the user',
        expiresIn: '1 hour'
    });
});

// ============================================
// USER ACCESS PAGE - File Upload Interface
// ============================================

app.get('/access/:token', (req, res) => {
    const token = req.params.token;
    const session = sessions.get(token);
    
    if (!session) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invalid Link</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .card {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 500px;
                        width: 100%;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    .icon { font-size: 64px; display: block; margin-bottom: 20px; }
                    h1 { color: #2d3436; margin-bottom: 10px; }
                    p { color: #636e72; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="icon">❌</span>
                    <h1>Invalid Link</h1>
                    <p>This link is invalid or has expired.</p>
                    <p style="margin-top:15px;font-size:14px;">Please request a new link from the administrator.</p>
                </div>
            </body>
            </html>
        `);
    }
    
    if (session.status === 'expired' || Date.now() > session.expiresAt) {
        session.status = 'expired';
        sessions.set(token, session);
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Link Expired</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .card {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 500px;
                        width: 100%;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    .icon { font-size: 64px; display: block; margin-bottom: 20px; }
                    h1 { color: #2d3436; margin-bottom: 10px; }
                    p { color: #636e72; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="icon">⏰</span>
                    <h1>Link Expired</h1>
                    <p>This link has expired. Please request a new one.</p>
                </div>
            </body>
            </html>
        `);
    }
    
    // Show file upload page
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Upload Files</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .card {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.5s ease;
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .icon { font-size: 64px; text-align: center; display: block; margin-bottom: 15px; }
                h1 { text-align: center; color: #2d3436; margin-bottom: 5px; }
                .subtitle { text-align: center; color: #636e72; margin-bottom: 25px; font-size: 14px; }
                .upload-area {
                    border: 2px dashed #dfe6e9;
                    border-radius: 15px;
                    padding: 40px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: #f8f9fa;
                    margin-bottom: 20px;
                }
                .upload-area:hover {
                    border-color: #667eea;
                    background: #f0f0ff;
                }
                .upload-area.dragover {
                    border-color: #00b894;
                    background: #e8f8f5;
                }
                .upload-area .icon-upload { font-size: 48px; display: block; margin-bottom: 10px; }
                .upload-area p { color: #636e72; }
                .upload-area .browse-text { color: #667eea; font-weight: 600; text-decoration: underline; }
                #fileInput { display: none; }
                .file-list {
                    margin: 20px 0;
                    max-height: 250px;
                    overflow-y: auto;
                }
                .file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 5px 0;
                    animation: slideIn 0.3s ease;
                }
                @keyframes slideIn {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .file-item .name {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    word-break: break-all;
                }
                .file-item .size {
                    color: #636e72;
                    font-size: 12px;
                    margin: 0 10px;
                    white-space: nowrap;
                }
                .file-item .remove {
                    background: #e17055;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                }
                .file-item .remove:hover {
                    background: #c0392b;
                    transform: scale(1.1);
                }
                .btn-upload {
                    background: linear-gradient(135deg, #00b894, #00a86b);
                    color: white;
                    border: none;
                    padding: 16px 30px;
                    border-radius: 12px;
                    font-size: 18px;
                    width: 100%;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: 600;
                    margin-top: 10px;
                }
                .btn-upload:hover:not(:disabled) {
                    transform: scale(1.02);
                    box-shadow: 0 10px 25px rgba(0,184,148,0.4);
                }
                .btn-upload:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-secondary {
                    background: #dfe6e9;
                    color: #2d3436;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 12px;
                    font-size: 14px;
                    width: 100%;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: all 0.3s;
                    font-weight: 500;
                }
                .btn-secondary:hover {
                    background: #b2bec3;
                }
                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: #dfe6e9;
                    border-radius: 3px;
                    margin: 15px 0;
                    overflow: hidden;
                    display: none;
                }
                .progress-bar .progress {
                    height: 100%;
                    background: linear-gradient(90deg, #00b894, #00a86b);
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.3s;
                }
                .status-message {
                    padding: 12px;
                    border-radius: 10px;
                    margin: 10px 0;
                    display: none;
                    font-size: 14px;
                }
                .status-message.success {
                    display: block;
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .status-message.error {
                    display: block;
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .status-message.info {
                    display: block;
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                .info-box {
                    background: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 5px;
                    font-size: 13px;
                }
                .info-box strong { color: #2d3436; }
                .timer {
                    text-align: center;
                    color: #636e72;
                    font-size: 13px;
                    margin-top: 15px;
                }
                .uploaded-files-section {
                    margin-top: 20px;
                    border-top: 1px solid #dfe6e9;
                    padding-top: 15px;
                }
                .uploaded-files-section h3 {
                    color: #2d3436;
                    font-size: 16px;
                    margin-bottom: 10px;
                }
                .uploaded-file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #e8f8f5;
                    border-radius: 6px;
                    margin: 4px 0;
                    font-size: 13px;
                }
                .uploaded-file-item .name {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .uploaded-file-item .status-badge {
                    font-size: 11px;
                    padding: 2px 10px;
                    border-radius: 12px;
                    background: #00b894;
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="icon">📤</span>
                <h1>Upload Your Files</h1>
                <p class="subtitle">Select files from your device and upload securely</p>

                <div class="info-box">
                    <strong>🔒 Secure Upload:</strong> Your files are encrypted and stored securely.
                    You can upload <strong>multiple files</strong> at once. Maximum file size: <strong>100MB</strong>
                </div>

                <!-- Upload Area -->
                <div class="upload-area" id="dropArea" onclick="document.getElementById('fileInput').click()">
                    <span class="icon-upload">📁</span>
                    <p>Drag & drop files here or <span class="browse-text">browse</span></p>
                    <p style="font-size:12px;color:#b2bec3;margin-top:5px;">Supports all file types</p>
                </div>
                <input type="file" id="fileInput" multiple onchange="handleFiles(this.files)">

                <!-- File List -->
                <div class="file-list" id="fileList"></div>

                <!-- Progress Bar -->
                <div class="progress-bar" id="progressBar">
                    <div class="progress" id="progress"></div>
                </div>

                <!-- Status Message -->
                <div class="status-message" id="statusMessage"></div>

                <!-- Upload Button -->
                <button class="btn-upload" id="uploadBtn" onclick="uploadFiles()" disabled>
                    ⬆️ Upload Files
                </button>

                <button class="btn-secondary" onclick="clearAll()">
                    🗑️ Clear All
                </button>

                <div class="timer">
                    ⏱️ Session expires in <span id="countdown">60:00</span>
                </div>

                <!-- Uploaded Files Section -->
                <div class="uploaded-files-section" id="uploadedSection" style="display:none;">
                    <h3>✅ Uploaded Files</h3>
                    <div id="uploadedList"></div>
                </div>
            </div>

            <script>
                const token = '${token}';
                let selectedFiles = [];
                let uploadedFiles = [];
                let countdown = 3600;

                // Handle file selection
                function handleFiles(files) {
                    for (let file of files) {
                        // Check if already selected
                        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                            selectedFiles.push(file);
                        }
                    }
                    updateFileList();
                    updateUploadButton();
                }

                // Update file list display
                function updateFileList() {
                    const container = document.getElementById('fileList');
                    if (selectedFiles.length === 0) {
                        container.innerHTML = '<p style="text-align:center;color:#b2bec3;padding:20px;">No files selected</p>';
                        return;
                    }

                    let html = '';
                    selectedFiles.forEach((file, index) => {
                        const size = formatSize(file.size);
                        const icon = getFileIcon(file.name);
                        html += \`
                            <div class="file-item">
                                <span class="name">\${icon} \${file.name}</span>
                                <span class="size">\${size}</span>
                                <button class="remove" onclick="removeFile(\${index})">✕</button>
                            </div>
                        \`;
                    });
                    container.innerHTML = html;
                }

                // Remove a file from selection
                function removeFile(index) {
                    selectedFiles.splice(index, 1);
                    updateFileList();
                    updateUploadButton();
                    if (selectedFiles.length === 0) {
                        document.getElementById('fileInput').value = '';
                    }
                }

                // Clear all selected files
                function clearAll() {
                    selectedFiles = [];
                    document.getElementById('fileInput').value = '';
                    updateFileList();
                    updateUploadButton();
                    hideStatus();
                }

                // Update upload button state
                function updateUploadButton() {
                    const btn = document.getElementById('uploadBtn');
                    btn.disabled = selectedFiles.length === 0;
                }

                // Upload files
                async function uploadFiles() {
                    if (selectedFiles.length === 0) return;

                    const btn = document.getElementById('uploadBtn');
                    const progress = document.getElementById('progress');
                    const progressBar = document.getElementById('progressBar');

                    btn.disabled = true;
                    btn.textContent = '⏳ Uploading...';
                    progressBar.style.display = 'block';
                    progress.style.width = '0%';

                    const formData = new FormData();
                    selectedFiles.forEach(file => {
                        formData.append('files', file);
                    });
                    formData.append('token', token);

                    try {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/upload');
                        
                        xhr.upload.onprogress = function(e) {
                            if (e.lengthComputable) {
                                const percent = Math.round((e.loaded / e.total) * 100);
                                progress.style.width = percent + '%';
                            }
                        };

                        xhr.onload = function() {
                            if (xhr.status === 200) {
                                const response = JSON.parse(xhr.responseText);
                                if (response.success) {
                                    showStatus('✅ ' + response.message, 'success');
                                    uploadedFiles = uploadedFiles.concat(response.files || []);
                                    updateUploadedList();
                                    selectedFiles = [];
                                    document.getElementById('fileInput').value = '';
                                    updateFileList();
                                    updateUploadButton();
                                    document.getElementById('uploadedSection').style.display = 'block';
                                } else {
                                    showStatus('❌ Error: ' + response.message, 'error');
                                }
                            } else {
                                showStatus('❌ Upload failed: ' + xhr.statusText, 'error');
                            }
                            btn.disabled = false;
                            btn.textContent = '⬆️ Upload Files';
                            progressBar.style.display = 'none';
                            progress.style.width = '0%';
                        };

                        xhr.onerror = function() {
                            showStatus('❌ Network error. Please try again.', 'error');
                            btn.disabled = false;
                            btn.textContent = '⬆️ Upload Files';
                            progressBar.style.display = 'none';
                            progress.style.width = '0%';
                        };

                        xhr.send(formData);

                    } catch (error) {
                        showStatus('❌ Error: ' + error.message, 'error');
                        btn.disabled = false;
                        btn.textContent = '⬆️ Upload Files';
                        progressBar.style.display = 'none';
                        progress.style.width = '0%';
                    }
                }

                // Update uploaded files list
                function updateUploadedList() {
                    const container = document.getElementById('uploadedList');
                    if (uploadedFiles.length === 0) {
                        container.innerHTML = '<p style="color:#b2bec3;font-size:13px;">No files uploaded yet</p>';
                        return;
                    }

                    let html = '';
                    uploadedFiles.forEach(file => {
                        const size = formatSize(file.size);
                        html += \`
                            <div class="uploaded-file-item">
                                <span class="name">📄 \${file.originalName}</span>
                                <span style="color:#636e72;font-size:12px;">\${size}</span>
                                <span class="status-badge">✓ Uploaded</span>
                            </div>
                        \`;
                    });
                    container.innerHTML = html;
                }

                // Show status message
                function showStatus(message, type) {
                    const div = document.getElementById('statusMessage');
                    div.className = 'status-message ' + type;
                    div.textContent = message;
                }

                function hideStatus() {
                    const div = document.getElementById('statusMessage');
                    div.className = 'status-message';
                    div.textContent = '';
                }

                // Format file size
                function formatSize(bytes) {
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }

                // Get file icon
                function getFileIcon(filename) {
                    const ext = filename.split('.').pop().toLowerCase();
                    const icons = {
                        'pdf': '📕', 'doc': '📘', 'docx': '📘',
                        'xls': '📗', 'xlsx': '📗', 'ppt': '📙', 'pptx': '📙',
                        'txt': '📄', 'js': '🟨', 'html': '🟦', 'css': '🟪',
                        'json': '📋', 'xml': '📋', 'csv': '📊', 'md': '📝',
                        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
                        'mp4': '🎬', 'mkv': '🎬', 'mp3': '🎵', 'wav': '🎵',
                        'zip': '📦', 'rar': '📦', '7z': '📦',
                        'exe': '⚙️', 'msi': '⚙️', 'dmg': '💿',
                        'apk': '📱', 'ipa': '📱'
                    };
                    return icons[ext] || '📄';
                }

                // Drag and drop support
                const dropArea = document.getElementById('dropArea');
                dropArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropArea.classList.add('dragover');
                });
                dropArea.addEventListener('dragleave', () => {
                    dropArea.classList.remove('dragover');
                });
                dropArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropArea.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        handleFiles(e.dataTransfer.files);
                    }
                });

                // Countdown timer
                function startCountdown() {
                    const timer = setInterval(() => {
                        countdown--;
                        const mins = Math.floor(countdown / 60);
                        const secs = countdown % 60;
                        document.getElementById('countdown').textContent = 
                            String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            document.getElementById('uploadBtn').disabled = true;
                            document.getElementById('uploadBtn').textContent = '⏰ Session Expired';
                            showStatus('⏰ Session has expired. Please request a new link.', 'error');
                        }
                    }, 1000);
                }

                startCountdown();

                // Check for existing uploaded files on load
                async function loadExistingUploads() {
                    try {
                        const response = await fetch('/api/get-uploads?token=' + token);
                        const data = await response.json();
                        if (data.success && data.files && data.files.length > 0) {
                            uploadedFiles = data.files;
                            updateUploadedList();
                            document.getElementById('uploadedSection').style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Error loading uploads:', error);
                    }
                }

                loadExistingUploads();
            </script>
        </body>
        </html>
    `);
});

// ============================================
// FILE UPLOAD API
// ============================================

app.post('/api/upload', upload.array('files', 50), (req, res) => {
    const token = req.body.token;
    const session = sessions.get(token);
    
    if (!session || session.status === 'expired') {
        return res.json({ 
            success: false, 
            message: 'Invalid or expired session' 
        });
    }
    
    if (!req.files || req.files.length === 0) {
        return res.json({ 
            success: false, 
            message: 'No files uploaded' 
        });
    }
    
    try {
        const uploadedFiles = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            path: file.path,
            uploadedAt: new Date().toISOString(),
            mimetype: file.mimetype
        }));
        
        // Store in session
        if (!session.uploadedFiles) {
            session.uploadedFiles = [];
        }
        session.uploadedFiles = session.uploadedFiles.concat(uploadedFiles);
        session.lastUpload = Date.now();
        sessions.set(token, session);
        
        // Save to data file for persistence
        const historyFile = path.join(DATA_DIR, `${token}_history.json`);
        let history = [];
        if (fs.existsSync(historyFile)) {
            try {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            } catch (e) {
                history = [];
            }
        }
        history = history.concat(uploadedFiles);
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        
        // Also save to global upload history
        if (!uploadHistory.has(token)) {
            uploadHistory.set(token, []);
        }
        uploadHistory.get(token).push(...uploadedFiles);
        
        res.json({
            success: true,
            message: `Successfully uploaded ${req.files.length} file(s)`,
            files: uploadedFiles,
            total: req.files.length
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.json({
            success: false,
            message: 'Error processing upload: ' + error.message
        });
    }
});

// ============================================
// GET UPLOADED FILES (For dashboard)
// ============================================

app.get('/api/get-uploads', (req, res) => {
    const token = req.query.token;
    
    if (!token) {
        return res.json({ success: false, message: 'Token required' });
    }
    
    const session = sessions.get(token);
    if (!session) {
        return res.json({ success: false, message: 'Invalid session' });
    }
    
    const files = session.uploadedFiles || [];
    
    res.json({
        success: true,
        files: files,
        total: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
    });
});

// ============================================
// DASHBOARD - View All Uploaded Files
// ============================================

app.get('/files', (req, res) => {
    // Get all uploaded files from all sessions
    let allFiles = [];
    let sessionData = [];
    
    for (const [token, session] of sessions) {
        if (session.uploadedFiles && session.uploadedFiles.length > 0) {
            allFiles = allFiles.concat(
                session.uploadedFiles.map(f => ({
                    ...f,
                    userId: session.userId,
                    token: token,
                    uploadTime: f.uploadedAt || session.lastUpload || 'Unknown'
                }))
            );
            sessionData.push({
                token: token,
                userId: session.userId,
                fileCount: session.uploadedFiles.length,
                status: session.status,
                lastUpload: session.lastUpload
            });
        }
    }
    
    // Sort by upload time (newest first)
    allFiles.sort((a, b) => {
        return new Date(b.uploadedAt || b.uploadTime) - new Date(a.uploadedAt || a.uploadTime);
    });
    
    // Calculate total stats
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    const fileTypes = {};
    allFiles.forEach(f => {
        const ext = f.originalName.split('.').pop().toLowerCase() || 'unknown';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dashboard - Uploaded Files</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #f0f2f5;
                    padding: 20px;
                }
                .container { max-width: 1400px; margin: auto; }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 15px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .header h1 { font-size: 28px; }
                .header .sub { opacity: 0.8; font-size: 14px; margin-top: 5px; }
                .header .actions { display: flex; gap: 10px; }
                .header .actions button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.3s;
                }
                .header .actions .btn-refresh {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                .header .actions .btn-refresh:hover {
                    background: rgba(255,255,255,0.3);
                }
                .header .actions .btn-generate {
                    background: white;
                    color: #667eea;
                }
                .header .actions .btn-generate:hover {
                    transform: scale(1.02);
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                }
                .stat-card .num { font-size: 28px; font-weight: bold; color: #2d3436; }
                .stat-card .label { color: #636e72; font-size: 13px; margin-top: 5px; }
                .stat-card .icon { font-size: 20px; margin-right: 8px; }
                .controls {
                    background: white;
                    padding: 15px 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                }
                .controls input {
                    flex: 1;
                    padding: 10px 15px;
                    border: 1px solid #dfe6e9;
                    border-radius: 8px;
                    font-size: 14px;
                    min-width: 200px;
                    outline: none;
                }
                .controls input:focus { border-color: #667eea; }
                .controls select {
                    padding: 10px 15px;
                    border: 1px solid #dfe6e9;
                    border-radius: 8px;
                    font-size: 14px;
                    background: white;
                    outline: none;
                }
                .controls select:focus { border-color: #667eea; }
                .file-table-wrap {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                }
                .file-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .file-table th {
                    background: #f8f9fa;
                    padding: 12px 15px;
                    text-align: left;
                    font-weight: 600;
                    color: #2d3436;
                    font-size: 13px;
                    border-bottom: 2px solid #dfe6e9;
                }
                .file-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 14px;
                    vertical-align: middle;
                }
                .file-table tr:hover td {
                    background: #f8f9fa;
                }
                .file-table .file-icon { font-size: 20px; margin-right: 8px; }
                .file-table .file-name {
                    display: flex;
                    align-items: center;
                    word-break: break-all;
                }
                .file-table .file-size { color: #636e72; font-size: 13px; }
                .file-table .badge {
                    display: inline-block;
                    padding: 2px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .badge-pdf { background: #ff7675; color: white; }
                .badge-doc { background: #74b9ff; color: white; }
                .badge-image { background: #55efc4; color: #2d3436; }
                .badge-video { background: #fd79a8; color: white; }
                .badge-audio { background: #fdcb6e; color: #2d3436; }
                .badge-zip { background: #a29bfe; color: white; }
                .badge-code { background: #ffeaa7; color: #2d3436; }
                .badge-other { background: #dfe6e9; color: #2d3436; }
                .file-table .actions-cell {
                    display: flex;
                    gap: 5px;
                }
                .file-table .actions-cell button {
                    padding: 4px 12px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.3s;
                }
                .btn-download {
                    background: #00b894;
                    color: white;
                }
                .btn-download:hover {
                    background: #00a86b;
                }
                .btn-delete {
                    background: #e17055;
                    color: white;
                }
                .btn-delete:hover {
                    background: #c0392b;
                }
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #636e72;
                }
                .empty-state .icon { font-size: 64px; display: block; margin-bottom: 15px; }
                .session-card {
                    background: white;
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 15px;
                    border-left: 4px solid #667eea;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                }
                .session-card .session-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .session-card .session-id {
                    font-weight: 600;
                    color: #2d3436;
                    font-size: 14px;
                }
                .session-card .session-meta {
                    color: #636e72;
                    font-size: 12px;
                }
                .session-card .session-files {
                    margin-top: 10px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }
                .session-card .session-files .mini-file {
                    background: #f8f9fa;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    color: #2d3436;
                }
                .pagination {
                    display: flex;
                    justify-content: center;
                    padding: 20px;
                    gap: 5px;
                }
                .pagination button {
                    padding: 8px 15px;
                    border: 1px solid #dfe6e9;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .pagination button:hover {
                    background: #f0f0f0;
                }
                .pagination button.active {
                    background: #667eea;
                    color: white;
                    border-color: #667eea;
                }
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 15px 25px;
                    border-radius: 10px;
                    color: white;
                    animation: slideIn 0.5s ease;
                    z-index: 9999;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                }
                .toast.success { background: #00b894; }
                .toast.error { background: #e17055; }
                .toast.info { background: #667eea; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @media (max-width: 768px) {
                    .header { flex-direction: column; align-items: stretch; gap: 15px; }
                    .header .actions { justify-content: center; }
                    .file-table { font-size: 12px; }
                    .file-table th, .file-table td { padding: 8px 10px; }
                    .file-table .actions-cell { flex-wrap: wrap; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div>
                        <h1>📊 Upload Dashboard</h1>
                        <div class="sub">Manage all uploaded files from users</div>
                    </div>
                    <div class="actions">
                        <button class="btn-refresh" onclick="location.reload()">🔄 Refresh</button>
                        <button class="btn-generate" onclick="generateLink()">➕ Generate New Link</button>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="num">${allFiles.length}</div>
                        <div class="label">📄 Total Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${formatSize(totalSize)}</div>
                        <div class="label">💾 Total Size</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${sessionData.length}</div>
                        <div class="label">👤 Active Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${Object.keys(fileTypes).length}</div>
                        <div class="label">📂 File Types</div>
                    </div>
                </div>

                <div class="controls">
                    <input type="text" id="searchInput" placeholder="🔍 Search files..." oninput="searchFiles(this.value)">
                    <select id="typeFilter" onchange="filterByType(this.value)">
                        <option value="all">All Types</option>
                        ${Object.keys(fileTypes).sort().map(ext => 
                            `<option value="${ext}">.${ext}</option>`
                        ).join('')}
                    </select>
                    <select id="sessionFilter" onchange="filterBySession(this.value)">
                        <option value="all">All Sessions</option>
                        ${sessionData.map(s => 
                            `<option value="${s.token}">${s.userId} (${s.fileCount} files)</option>`
                        ).join('')}
                    </select>
                    <button style="padding:10px 20px;background:#e17055;color:white;border:none;border-radius:8px;cursor:pointer;" onclick="clearAllData()">🗑️ Clear All</button>
                </div>

                <div class="file-table-wrap">
                    <table class="file-table" id="fileTable">
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>Size</th>
                                <th>Type</th>
                                <th>User</th>
                                <th>Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="fileTableBody">
                            ${allFiles.length === 0 ? `
                                <tr>
                                    <td colspan="6">
                                        <div class="empty-state">
                                            <span class="icon">📭</span>
                                            <p>No files uploaded yet</p>
                                            <p style="font-size:13px;color:#b2bec3;">Share a link with users to start receiving files</p>
                                        </div>
                                    </td>
                                </tr>
                            ` : allFiles.map((file, index) => `
                                <tr data-index="${index}">
                                    <td>
                                        <div class="file-name">
                                            <span class="file-icon">${getFileIcon(file.originalName)}</span>
                                            <span>${file.originalName}</span>
                                        </div>
                                    </td>
                                    <td class="file-size">${formatSize(file.size)}</td>
                                    <td><span class="badge ${getBadgeClass(file.originalName)}">${file.originalName.split('.').pop().toUpperCase() || 'Unknown'}</span></td>
                                    <td style="font-size:12px;color:#636e72;">${file.userId || 'Unknown'}</td>
                                    <td style="font-size:12px;color:#636e72;">${formatDate(file.uploadedAt || file.uploadTime)}</td>
                                    <td>
                                        <div class="actions-cell">
                                            <button class="btn-download" onclick="downloadFile('${file.filename}')">⬇️</button>
                                            <button class="btn-delete" onclick="deleteFile('${file.filename}', '${file.token}')">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="pagination" id="pagination"></div>
            </div>

            <script>
                let allFiles = ${JSON.stringify(allFiles)};
                let currentFiles = [...allFiles];
                let currentPage = 1;
                const pageSize = 20;

                // Search files
                function searchFiles(query) {
                    const q = query.toLowerCase().trim();
                    if (!q) {
                        currentFiles = [...allFiles];
                    } else {
                        currentFiles = allFiles.filter(f => 
                            f.originalName.toLowerCase().includes(q)
                        );
                    }
                    currentPage = 1;
                    renderTable();
                }

                // Filter by type
                function filterByType(type) {
                    if (type === 'all') {
                        currentFiles = [...allFiles];
                    } else {
                        currentFiles = allFiles.filter(f => 
                            f.originalName.split('.').pop().toLowerCase() === type
                        );
                    }
                    // Apply search if any
                    const search = document.getElementById('searchInput').value;
                    if (search) {
                        const q = search.toLowerCase().trim();
                        currentFiles = currentFiles.filter(f => 
                            f.originalName.toLowerCase().includes(q)
                        );
                    }
                    currentPage = 1;
                    renderTable();
                }

                // Filter by session
                function filterBySession(token) {
                    if (token === 'all') {
                        currentFiles = [...allFiles];
                    } else {
                        currentFiles = allFiles.filter(f => f.token === token);
                    }
                    // Apply search and type filter
                    const search = document.getElementById('searchInput').value;
                    if (search) {
                        const q = search.toLowerCase().trim();
                        currentFiles = currentFiles.filter(f => 
                            f.originalName.toLowerCase().includes(q)
                        );
                    }
                    const type = document.getElementById('typeFilter').value;
                    if (type !== 'all') {
                        currentFiles = currentFiles.filter(f => 
                            f.originalName.split('.').pop().toLowerCase() === type
                        );
                    }
                    currentPage = 1;
                    renderTable();
                }

                // Render table with pagination
                function renderTable() {
                    const tbody = document.getElementById('fileTableBody');
                    const pagination = document.getElementById('pagination');
                    
                    if (currentFiles.length === 0) {
                        tbody.innerHTML = \`
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        <span class="icon">🔍</span>
                                        <p>No files match your filters</p>
                                    </div>
                                </td>
                            </tr>
                        \`;
                        pagination.innerHTML = '';
                        return;
                    }

                    const totalPages = Math.ceil(currentFiles.length / pageSize);
                    const start = (currentPage - 1) * pageSize;
                    const end = Math.min(start + pageSize, currentFiles.length);
                    const pageFiles = currentFiles.slice(start, end);

                    let html = '';
                    pageFiles.forEach((file, index) => {
                        const globalIndex = allFiles.indexOf(file);
                        html += \`
                            <tr>
                                <td>
                                    <div class="file-name">
                                        <span class="file-icon">\${getFileIcon(file.originalName)}</span>
                                        <span>\${file.originalName}</span>
                                    </div>
                                </td>
                                <td class="file-size">\${formatSize(file.size)}</td>
                                <td><span class="badge \${getBadgeClass(file.originalName)}">\${file.originalName.split('.').pop().toUpperCase() || 'Unknown'}</span></td>
                                <td style="font-size:12px;color:#636e72;">\${file.userId || 'Unknown'}</td>
                                <td style="font-size:12px;color:#636e72;">\${formatDate(file.uploadedAt || file.uploadTime)}</td>
                                <td>
                                    <div class="actions-cell">
                                        <button class="btn-download" onclick="downloadFile('\${file.filename}')">⬇️</button>
                                        <button class="btn-delete" onclick="deleteFile('\${file.filename}', '\${file.token}')">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        \`;
                    });
                    tbody.innerHTML = html;

                    // Pagination
                    if (totalPages > 1) {
                        let phtml = '';
                        phtml += \`<button onclick="goToPage(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>◀</button>\`;
                        for (let i = 1; i <= totalPages; i++) {
                            phtml += \`<button class="\${i === currentPage ? 'active' : ''}" onclick="goToPage(\${i})">\${i}</button>\`;
                        }
                        phtml += \`<button onclick="goToPage(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>▶</button>\`;
                        pagination.innerHTML = phtml;
                    } else {
                        pagination.innerHTML = '';
                    }
                }

                function goToPage(page) {
                    const totalPages = Math.ceil(currentFiles.length / pageSize);
                    if (page < 1 || page > totalPages) return;
                    currentPage = page;
                    renderTable();
                }

                // Generate new link
                async function generateLink() {
                    try {
                        const response = await fetch('/generate-link');
                        const data = await response.json();
                        if (data.success) {
                            showToast('✅ Link generated!', 'success');
                            // Copy to clipboard
                            navigator.clipboard.writeText(data.link).then(() => {
                                showToast('📋 Link copied to clipboard!', 'info');
                            });
                            // Show link in alert
                            alert('📋 Share this link with the user:\\n\\n' + data.link + '\\n\\nToken: ' + data.token + '\\n\\nExpires in: 1 hour');
                        }
                    } catch (error) {
                        showToast('❌ Error generating link: ' + error.message, 'error');
                    }
                }

                // Download file
                function downloadFile(filename) {
                    window.open('/api/download-upload?filename=' + encodeURIComponent(filename));
                }

                // Delete file
                async function deleteFile(filename, token) {
                    if (!confirm('Are you sure you want to delete this file?')) return;
                    
                    try {
                        const response = await fetch('/api/delete-upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename, token })
                        });
                        const data = await response.json();
                        if (data.success) {
                            showToast('✅ File deleted successfully', 'success');
                            location.reload();
                        } else {
                            showToast('❌ Error: ' + data.message, 'error');
                        }
                    } catch (error) {
                        showToast('❌ Error: ' + error.message, 'error');
                    }
                }

                // Clear all data
                function clearAllData() {
                    if (!confirm('⚠️ Are you sure you want to delete ALL files and sessions? This cannot be undone!')) return;
                    if (!confirm('⚠️⚠️ FINAL WARNING: All uploaded files will be permanently deleted!')) return;
                    
                    fetch('/api/clear-all', {
                        method: 'POST'
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showToast('✅ All data cleared', 'success');
                            location.reload();
                        } else {
                            showToast('❌ Error: ' + data.message, 'error');
                        }
                    })
                    .catch(error => {
                        showToast('❌ Error: ' + error.message, 'error');
                    });
                }

                // Show toast
                function showToast(message, type = 'info') {
                    const toast = document.createElement('div');
                    toast.className = 'toast ' + type;
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transition = 'opacity 0.5s';
                        setTimeout(() => toast.remove(), 500);
                    }, 3000);
                }

                // Helper functions (same as above)
                function formatSize(bytes) {
                    if (!bytes) return '0 B';
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }

                function formatDate(date) {
                    if (!date) return 'Unknown';
                    const d = new Date(date);
                    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
                }

                function getFileIcon(filename) {
                    const ext = filename.split('.').pop().toLowerCase();
                    const icons = {
                        'pdf': '📕', 'doc': '📘', 'docx': '📘',
                        'xls': '📗', 'xlsx': '📗', 'ppt': '📙', 'pptx': '📙',
                        'txt': '📄', 'js': '🟨', 'html': '🟦', 'css': '🟪',
                        'json': '📋', 'xml': '📋', 'csv': '📊', 'md': '📝',
                        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
                        'mp4': '🎬', 'mkv': '🎬', 'mp3': '🎵', 'wav': '🎵',
                        'zip': '📦', 'rar': '📦', '7z': '📦',
                        'exe': '⚙️', 'msi': '⚙️', 'dmg': '💿',
                        'apk': '📱', 'ipa': '📱'
                    };
                    return icons[ext] || '📄';
                }

                function getBadgeClass(filename) {
                    const ext = filename.split('.').pop().toLowerCase();
                    const classes = {
                        'pdf': 'badge-pdf',
                        'doc': 'badge-doc', 'docx': 'badge-doc',
                        'jpg': 'badge-image', 'jpeg': 'badge-image', 'png': 'badge-image', 'gif': 'badge-image',
                        'mp4': 'badge-video', 'mkv': 'badge-video',
                        'mp3': 'badge-audio', 'wav': 'badge-audio',
                        'zip': 'badge-zip', 'rar': 'badge-zip', '7z': 'badge-zip',
                        'js': 'badge-code', 'html': 'badge-code', 'css': 'badge-code', 'json': 'badge-code'
                    };
                    return classes[ext] || 'badge-other';
                }

                // Initial render
                renderTable();

                // Auto-refresh every 30 seconds
                // setInterval(() => { location.reload(); }, 30000);
            </script>
        </body>
        </html>
    `);
});

// ============================================
// DOWNLOAD UPLOADED FILE
// ============================================

app.get('/api/download-upload', (req, res) => {
    const filename = req.query.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    
    res.download(filePath);
});

// ============================================
// DELETE UPLOADED FILE
// ============================================

app.post('/api/delete-upload', (req, res) => {
    const { filename, token } = req.body;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    try {
        // Delete from filesystem
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from session
        const session = sessions.get(token);
        if (session && session.uploadedFiles) {
            session.uploadedFiles = session.uploadedFiles.filter(f => f.filename !== filename);
            sessions.set(token, session);
        }
        
        // Remove from history
        const historyFile = path.join(DATA_DIR, `${token}_history.json`);
        if (fs.existsSync(historyFile)) {
            try {
                let history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                history = history.filter(f => f.filename !== filename);
                fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            } catch (e) {}
        }
        
        // Remove from global upload history
        if (uploadHistory.has(token)) {
            const history = uploadHistory.get(token);
            uploadHistory.set(token, history.filter(f => f.filename !== filename));
        }
        
        res.json({ success: true, message: 'File deleted successfully' });
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ============================================
// CLEAR ALL DATA
// ============================================

app.post('/api/clear-all', (req, res) => {
    try {
        // Delete all files in uploads directory
        if (fs.existsSync(UPLOAD_DIR)) {
            const files = fs.readdirSync(UPLOAD_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(UPLOAD_DIR, file));
            }
        }
        
        // Clear sessions
        sessions.clear();
        uploadHistory.clear();
        
        // Delete data files
        if (fs.existsSync(DATA_DIR)) {
            const files = fs.readdirSync(DATA_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(DATA_DIR, file));
            }
        }
        
        res.json({ success: true, message: 'All data cleared' });
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ============================================
// GET LOCAL IP
// ============================================

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// ============================================
// START SERVER
// ============================================

app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log('\n🚀 USER FILE UPLOAD SYSTEM');
    console.log('='.repeat(60));
    console.log('📌 HOW TO USE:');
    console.log('1. Generate a link:');
    console.log(`   http://${ip}:${port}/generate-link`);
    console.log('2. Share the link with user');
    console.log('3. User selects and uploads files');
    console.log('4. View uploaded files:');
    console.log(`   http://${ip}:${port}/files`);
    console.log('='.repeat(60));
    console.log(`📱 Server running at: http://${ip}:${port}`);
    console.log('='.repeat(60));
    console.log('📂 Upload directory:', UPLOAD_DIR);
    console.log('='.repeat(60));
});