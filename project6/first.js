// serverUploader.js - Files scan karein aur server par send karein
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const cors = require('cors');
const app = express();
const port = 3000;

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    scanDepth: 5,
    allowedExtensions: ['.txt', '.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.json', '.xml', '.csv', '.md'],
    excludeFolders: ['Windows', 'Program Files', 'System32', '.git', 'node_modules', 'Cache', 'Temp']
};

// ============================================
// SETUP
// ============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Storage for uploaded files
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: CONFIG.maxFileSize }
});

// Create directories if not exist
['uploads', 'data', 'public'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// In-memory storage for scan results
let scanResults = {
    files: [],
    whatsapp: [],
    documents: [],
    media: [],
    stats: {},
    timestamp: null,
    lastScan: null
};

// ============================================
// HTML DASHBOARD
// ============================================

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>📁 File Scanner - Remote Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #0a0a23;
                    color: white;
                    min-height: 100vh;
                    padding: 20px;
                }
                .container { max-width: 1400px; margin: auto; }
                
                /* Header */
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 25px 30px;
                    border-radius: 15px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .header h1 { font-size: 28px; }
                .header .subtitle { opacity: 0.8; font-size: 14px; }
                .header-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                }
                
                /* Stats Grid */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .stat-card {
                    background: #1a1a3e;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid #2a2a5e;
                    transition: transform 0.3s;
                }
                .stat-card:hover { transform: translateY(-3px); }
                .stat-value {
                    font-size: 32px;
                    font-weight: bold;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .stat-label {
                    color: #8888aa;
                    font-size: 13px;
                    margin-top: 5px;
                }
                
                /* Controls */
                .controls {
                    background: #1a1a3e;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    border: 1px solid #2a2a5e;
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .controls input, .controls select {
                    padding: 10px 15px;
                    border: 1px solid #2a2a5e;
                    border-radius: 8px;
                    background: #0a0a23;
                    color: white;
                    flex: 1;
                    min-width: 200px;
                }
                .controls button {
                    padding: 10px 25px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: bold;
                }
                .controls button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                }
                .controls button.danger {
                    background: linear-gradient(135deg, #e17055, #d63031);
                }
                .controls button.success {
                    background: linear-gradient(135deg, #00b894, #00a86b);
                }
                
                /* Tabs */
                .tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .tab {
                    padding: 10px 25px;
                    background: #1a1a3e;
                    border: 1px solid #2a2a5e;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    color: #8888aa;
                }
                .tab:hover { background: #2a2a5e; }
                .tab.active {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border-color: #667eea;
                }
                
                /* File Grid */
                .file-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }
                .file-card {
                    background: #1a1a3e;
                    padding: 15px;
                    border-radius: 10px;
                    border: 1px solid #2a2a5e;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .file-card:hover {
                    border-color: #667eea;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 25px rgba(102, 126, 234, 0.2);
                }
                .file-icon { font-size: 24px; }
                .file-name {
                    margin: 8px 0;
                    font-weight: 500;
                    word-break: break-all;
                }
                .file-meta {
                    color: #8888aa;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                }
                .file-path {
                    color: #555577;
                    font-size: 11px;
                    word-break: break-all;
                    margin-top: 5px;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                .badge-whatsapp { background: #25D366; color: white; }
                .badge-doc { background: #3498db; color: white; }
                .badge-media { background: #e74c3c; color: white; }
                .badge-large { background: #f39c12; color: white; }
                
                /* Modal */
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.9);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .modal-content {
                    background: #1a1a3e;
                    max-width: 900px;
                    width: 100%;
                    max-height: 80vh;
                    border-radius: 15px;
                    padding: 30px;
                    overflow-y: auto;
                    border: 1px solid #2a2a5e;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .modal-header h2 { color: white; }
                .modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                }
                .modal-body {
                    color: #ddd;
                    white-space: pre-wrap;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    background: #0a0a23;
                    padding: 15px;
                    border-radius: 8px;
                    max-height: 50vh;
                    overflow-y: auto;
                }
                
                /* Progress */
                .progress-container {
                    width: 100%;
                    height: 6px;
                    background: #1a1a3e;
                    border-radius: 3px;
                    margin: 10px 0;
                    overflow: hidden;
                }
                .progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    width: 0%;
                    transition: width 0.5s;
                }
                
                /* Toast */
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #00b894;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    animation: slideIn 0.5s ease;
                    z-index: 2000;
                }
                .toast.error { background: #e17055; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .header { flex-direction: column; text-align: center; gap: 10px; }
                    .controls { flex-direction: column; }
                    .controls input { width: 100%; }
                }
                
                .search-highlight {
                    background: #667eea;
                    padding: 0 3px;
                    border-radius: 2px;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #555577;
                }
                .empty-state .icon { font-size: 64px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <div>
                        <h1>📁 File Scanner</h1>
                        <div class="subtitle">Scan, view, and manage your files remotely</div>
                    </div>
                    <div>
                        <span class="header-badge" id="statusBadge">🟢 Online</span>
                        <span class="header-badge" style="margin-left:10px;" id="fileCount">0 files</span>
                    </div>
                </div>

                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="totalFiles">0</div>
                        <div class="stat-label">📄 Total Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalSize">0 GB</div>
                        <div class="stat-label">💾 Total Size</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="whatsappCount">0</div>
                        <div class="stat-label">💬 WhatsApp Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="mediaCount">0</div>
                        <div class="stat-label">🖼️ Media Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="docCount">0</div>
                        <div class="stat-label">📝 Documents</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="lastScan">-</div>
                        <div class="stat-label">⏱️ Last Scan</div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="controls">
                    <input type="text" id="pathInput" placeholder="Enter path to scan (e.g., C:/Users/YourName)" value="${os.homedir()}">
                    <select id="depthSelect">
                        <option value="3">Depth: 3 (Fast)</option>
                        <option value="5" selected>Depth: 5 (Medium)</option>
                        <option value="8">Depth: 8 (Slow)</option>
                        <option value="10">Depth: 10 (Deep)</option>
                    </select>
                    <button class="success" onclick="startScan()">🔍 Start Scan</button>
                    <button onclick="refreshData()">🔄 Refresh</button>
                    <button onclick="exportData()">📤 Export JSON</button>
                    <button class="danger" onclick="clearData()">🗑️ Clear</button>
                </div>

                <!-- Search -->
                <div class="controls" style="margin-bottom:20px;">
                    <input type="text" id="searchBox" placeholder="🔍 Search files by name or path..." oninput="searchFiles(this.value)">
                    <select id="filterSelect" onchange="filterFiles(this.value)">
                        <option value="all">All Files</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="documents">📝 Documents</option>
                        <option value="media">🖼️ Media</option>
                        <option value="large">📦 Large (>10MB)</option>
                        <option value="recent">🆕 Recent (7 days)</option>
                    </select>
                </div>

                <!-- Progress -->
                <div class="progress-container" id="progressContainer" style="display:none;">
                    <div class="progress-bar" id="progressBar"></div>
                </div>

                <!-- Tabs -->
                <div class="tabs">
                    <button class="tab active" onclick="switchTab('all')">📂 All Files</button>
                    <button class="tab" onclick="switchTab('whatsapp')">💬 WhatsApp</button>
                    <button class="tab" onclick="switchTab('documents')">📝 Documents</button>
                    <button class="tab" onclick="switchTab('media')">🖼️ Media</button>
                    <button class="tab" onclick="switchTab('large')">📦 Large Files</button>
                </div>

                <!-- File List -->
                <div id="fileContainer">
                    <div class="empty-state">
                        <div class="icon">🔍</div>
                        <h3>No files scanned yet</h3>
                        <p>Enter a path and click "Start Scan" to begin</p>
                    </div>
                </div>
            </div>

            <!-- Modal -->
            <div class="modal" id="fileModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle">File Preview</h2>
                        <button class="modal-close" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body" id="modalBody">Loading...</div>
                    <div style="margin-top:15px;display:flex;gap:10px;">
                        <button onclick="downloadFile()" style="padding:10px 20px;background:#667eea;border:none;border-radius:8px;color:white;cursor:pointer;">⬇️ Download</button>
                        <button onclick="copyPath()" style="padding:10px 20px;background:#2a2a5e;border:none;border-radius:8px;color:white;cursor:pointer;">📋 Copy Path</button>
                    </div>
                </div>
            </div>

            <script>
                let currentFiles = [];
                let currentTab = 'all';
                let selectedFile = null;

                // ============================================
                // SCAN FUNCTIONS
                // ============================================

                async function startScan() {
                    const path = document.getElementById('pathInput').value;
                    const depth = document.getElementById('depthSelect').value;
                    
                    if (!path) {
                        showToast('Please enter a path', 'error');
                        return;
                    }

                    const btn = event.target;
                    const originalText = btn.textContent;
                    btn.textContent = '⏳ Scanning...';
                    btn.disabled = true;

                    showProgress(true);

                    try {
                        const response = await fetch('/api/scan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                path: path, 
                                depth: parseInt(depth) 
                            })
                        });

                        const data = await response.json();
                        
                        if (data.error) {
                            showToast('❌ ' + data.error, 'error');
                            return;
                        }

                        currentFiles = data.files || [];
                        updateStats(data.stats);
                        displayFiles(currentFiles);
                        showToast('✅ Scan complete! Found ' + currentFiles.length + ' files');
                        
                    } catch (error) {
                        showToast('❌ Error: ' + error.message, 'error');
                    } finally {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        showProgress(false);
                    }
                }

                // ============================================
                // DISPLAY FUNCTIONS
                // ============================================

                function displayFiles(files) {
                    const container = document.getElementById('fileContainer');
                    
                    if (!files || files.length === 0) {
                        container.innerHTML = \`
                            <div class="empty-state">
                                <div class="icon">📭</div>
                                <h3>No files found</h3>
                                <p>Try scanning a different path</p>
                            </div>
                        \`;
                        return;
                    }

                    let html = '<div class="file-grid">';
                    
                    files.slice(0, 100).forEach((file, index) => {
                        const icon = file.isDirectory ? '📁' : getFileIcon(file.extension);
                        const size = file.isDirectory ? 'Folder' : formatSize(file.size);
                        const badges = getBadges(file);
                        
                        html += \`
                            <div class="file-card" onclick="previewFile('\${index}')">
                                <div class="file-icon">\${icon}</div>
                                <div class="file-name">\${highlightSearch(file.name)}</div>
                                <div class="file-meta">
                                    <span>\${size}</span>
                                    <span>\${new Date(file.modified).toLocaleDateString()}</span>
                                </div>
                                \${badges}
                                <div class="file-path">\${highlightSearch(file.path)}</div>
                            </div>
                        \`;
                    });

                    html += '</div>';
                    
                    if (files.length > 100) {
                        html += \`<p style="color:#555577;text-align:center;margin-top:15px;">Showing 100 of \${files.length} files</p>\`;
                    }

                    container.innerHTML = html;
                }

                function getFileIcon(ext) {
                    const icons = {
                        '.txt': '📄', '.js': '🟨', '.html': '🟦', '.css': '🟪',
                        '.json': '📋', '.xml': '📋', '.csv': '📊', '.md': '📝',
                        '.pdf': '📕', '.doc': '📘', '.docx': '📘', '.xls': '📗',
                        '.xlsx': '📗', '.ppt': '📙', '.pptx': '📙',
                        '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️',
                        '.mp4': '🎬', '.mp3': '🎵', '.wav': '🎵',
                        '.zip': '📦', '.rar': '📦', '.7z': '📦'
                    };
                    return icons[ext] || '📄';
                }

                function getBadges(file) {
                    let badges = '';
                    const name = file.name.toLowerCase();
                    const path = file.path.toLowerCase();
                    
                    if (name.includes('whatsapp') || path.includes('whatsapp')) {
                        badges += '<span class="badge badge-whatsapp">💬 WhatsApp</span> ';
                    }
                    if (['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx'].includes(file.extension)) {
                        badges += '<span class="badge badge-doc">📝 Doc</span> ';
                    }
                    if (['.jpg','.jpeg','.png','.gif','.mp4','.mp3'].includes(file.extension)) {
                        badges += '<span class="badge badge-media">🖼️ Media</span> ';
                    }
                    if (file.size > 10 * 1024 * 1024) {
                        badges += '<span class="badge badge-large">📦 Large</span> ';
                    }
                    
                    return badges || '';
                }

                function formatSize(bytes) {
                    if (bytes < 1024) return bytes + ' B';
                    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }

                function highlightSearch(text) {
                    const query = document.getElementById('searchBox').value;
                    if (!query) return text;
                    const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                    return text.replace(regex, '<span class="search-highlight">$1</span>');
                }

                // ============================================
                // STATS UPDATE
                // ============================================

                function updateStats(stats) {
                    if (!stats) return;
                    document.getElementById('totalFiles').textContent = stats.totalFiles || 0;
                    document.getElementById('totalSize').textContent = stats.totalSize || '0 GB';
                    document.getElementById('whatsappCount').textContent = stats.whatsappFiles || 0;
                    document.getElementById('mediaCount').textContent = stats.mediaFiles || 0;
                    document.getElementById('docCount').textContent = stats.docFiles || 0;
                    document.getElementById('lastScan').textContent = stats.lastScan || new Date().toLocaleTimeString();
                    document.getElementById('fileCount').textContent = (stats.totalFiles || 0) + ' files';
                }

                // ============================================
                // FILTER & SEARCH
                // ============================================

                function switchTab(tab) {
                    currentTab = tab;
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab').forEach(t => {
                        if (t.textContent.toLowerCase().includes(tab)) {
                            t.classList.add('active');
                        }
                    });
                    filterFiles(document.getElementById('filterSelect').value);
                }

                function filterFiles(filter) {
                    let filtered = [...currentFiles];
                    
                    switch(filter) {
                        case 'whatsapp':
                            filtered = filtered.filter(f => 
                                f.name.toLowerCase().includes('whatsapp') || 
                                f.path.toLowerCase().includes('whatsapp')
                            );
                            break;
                        case 'documents':
                            const docExts = ['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx','.csv'];
                            filtered = filtered.filter(f => docExts.includes(f.extension));
                            break;
                        case 'media':
                            const mediaExts = ['.jpg','.jpeg','.png','.gif','.bmp','.mp4','.mkv','.mp3','.wav'];
                            filtered = filtered.filter(f => mediaExts.includes(f.extension));
                            break;
                        case 'large':
                            filtered = filtered.filter(f => f.size > 10 * 1024 * 1024);
                            break;
                        case 'recent':
                            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                            filtered = filtered.filter(f => new Date(f.modified).getTime() > weekAgo);
                            break;
                        default:
                            // All files
                    }
                    
                    // Apply search
                    const searchQuery = document.getElementById('searchBox').value;
                    if (searchQuery) {
                        filtered = filtered.filter(f => 
                            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            f.path.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                    }
                    
                    displayFiles(filtered);
                }

                function searchFiles(query) {
                    filterFiles(document.getElementById('filterSelect').value);
                }

                // ============================================
                // FILE PREVIEW
                // ============================================

                async function previewFile(index) {
                    const file = currentFiles[index];
                    if (!file) return;
                    
                    selectedFile = file;
                    document.getElementById('modalTitle').textContent = '📄 ' + file.name;
                    document.getElementById('modalBody').textContent = 'Loading...';
                    document.getElementById('fileModal').style.display = 'flex';
                    
                    try {
                        const response = await fetch('/api/preview?path=' + encodeURIComponent(file.path));
                        const data = await response.json();
                        document.getElementById('modalBody').textContent = data.content || 'Cannot preview this file';
                    } catch (error) {
                        document.getElementById('modalBody').textContent = 'Error loading preview: ' + error.message;
                    }
                }

                function closeModal() {
                    document.getElementById('fileModal').style.display = 'none';
                }

                function downloadFile() {
                    if (selectedFile) {
                        window.open('/api/download?path=' + encodeURIComponent(selectedFile.path));
                    }
                }

                function copyPath() {
                    if (selectedFile) {
                        navigator.clipboard.writeText(selectedFile.path);
                        showToast('📋 Path copied to clipboard');
                    }
                }

                // ============================================
                // UTILITY FUNCTIONS
                // ============================================

                function refreshData() {
                    if (currentFiles.length > 0) {
                        displayFiles(currentFiles);
                        showToast('🔄 Refreshed');
                    } else {
                        showToast('No data to refresh. Scan first.', 'error');
                    }
                }

                async function exportData() {
                    if (currentFiles.length === 0) {
                        showToast('No data to export', 'error');
                        return;
                    }
                    
                    const data = {
                        timestamp: new Date().toISOString(),
                        totalFiles: currentFiles.length,
                        files: currentFiles
                    };
                    
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'file_scan_' + Date.now() + '.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('✅ Data exported successfully');
                }

                function clearData() {
                    if (confirm('Are you sure you want to clear all scanned data?')) {
                        currentFiles = [];
                        document.getElementById('fileContainer').innerHTML = \`
                            <div class="empty-state">
                                <div class="icon">📭</div>
                                <h3>Data cleared</h3>
                                <p>Scan again to load files</p>
                            </div>
                        \`;
                        updateStats({});
                        showToast('🗑️ Data cleared');
                    }
                }

                function showProgress(show) {
                    document.getElementById('progressContainer').style.display = show ? 'block' : 'none';
                    if (show) {
                        let progress = 0;
                        const interval = setInterval(() => {
                            progress += Math.random() * 10;
                            if (progress > 90) progress = 90;
                            document.getElementById('progressBar').style.width = progress + '%';
                        }, 500);
                        window._progressInterval = interval;
                    } else {
                        if (window._progressInterval) {
                            clearInterval(window._progressInterval);
                        }
                        document.getElementById('progressBar').style.width = '100%';
                        setTimeout(() => {
                            document.getElementById('progressContainer').style.display = 'none';
                        }, 500);
                    }
                }

                function showToast(message, type = 'success') {
                    const toast = document.createElement('div');
                    toast.className = 'toast' + (type === 'error' ? ' error' : '');
                    toast.textContent = message;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }

                // ============================================
                // AUTO-LOAD
                // ============================================

                // Load initial data
                document.addEventListener('DOMContentLoaded', () => {
                    // Try to load last scan
                    fetch('/api/last-scan')
                        .then(res => res.json())
                        .then(data => {
                            if (data.files && data.files.length > 0) {
                                currentFiles = data.files;
                                updateStats(data.stats);
                                displayFiles(currentFiles);
                            }
                        })
                        .catch(() => {});
                });

                // Close modal on ESC
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') closeModal();
                });
            </script>
        </body>
        </html>
    `);
});

// ============================================
// API ENDPOINTS
// ============================================

// Scan endpoint
app.post('/api/scan', (req, res) => {
    const { path: scanPath, depth = 5 } = req.body;
    
    if (!scanPath) {
        return res.json({ error: 'Path is required' });
    }

    if (!fs.existsSync(scanPath)) {
        return res.json({ error: 'Path does not exist' });
    }

    const startTime = Date.now();
    const results = {
        files: [],
        whatsapp: [],
        documents: [],
        media: [],
        large: []
    };

    function scanDirectory(dirPath, currentDepth = 0) {
        if (currentDepth > depth) return;
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                try {
                    const fullPath = path.join(dirPath, item);
                    const stats = fs.statSync(fullPath);
                    
                    // Skip excluded folders
                    if (CONFIG.excludeFolders.some(f => fullPath.includes(f))) {
                        continue;
                    }
                    
                    const fileInfo = {
                        name: item,
                        path: fullPath,
                        size: stats.size,
                        isDirectory: stats.isDirectory(),
                        extension: path.extname(item).toLowerCase(),
                        modified: stats.mtime,
                        created: stats.birthtime
                    };
                    
                    if (stats.isDirectory()) {
                        scanDirectory(fullPath, currentDepth + 1);
                    } else {
                        results.files.push(fileInfo);
                        
                        // Categorize
                        const name = item.toLowerCase();
                        const ext = fileInfo.extension;
                        
                        if (name.includes('whatsapp') || fullPath.toLowerCase().includes('whatsapp')) {
                            results.whatsapp.push(fileInfo);
                        }
                        
                        const docExts = ['.pdf','.doc','.docx','.txt','.xls','.xlsx','.ppt','.pptx','.csv'];
                        if (docExts.includes(ext)) {
                            results.documents.push(fileInfo);
                        }
                        
                        const mediaExts = ['.jpg','.jpeg','.png','.gif','.bmp','.mp4','.mkv','.avi','.mov','.mp3','.wav'];
                        if (mediaExts.includes(ext)) {
                            results.media.push(fileInfo);
                        }
                        
                        if (stats.size > 10 * 1024 * 1024) {
                            results.large.push(fileInfo);
                        }
                    }
                } catch (e) {
                    // Skip inaccessible
                }
            }
        } catch (e) {
            // Skip inaccessible
        }
    }

    try {
        scanDirectory(scanPath);
        
        const stats = {
            totalFiles: results.files.length,
            totalSize: results.files.reduce((sum, f) => sum + f.size, 0),
            whatsappFiles: results.whatsapp.length,
            mediaFiles: results.media.length,
            docFiles: results.documents.length,
            largeFiles: results.large.length,
            scanTime: ((Date.now() - startTime) / 1000).toFixed(1) + 's',
            lastScan: new Date().toISOString()
        };
        
        stats.totalSize = (stats.totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        
        // Store results
        scanResults = {
            files: results.files,
            whatsapp: results.whatsapp,
            documents: results.documents,
            media: results.media,
            large: results.large,
            stats: stats,
            timestamp: Date.now()
        };
        
        // Save to file
        fs.writeFileSync('data/scan_results.json', JSON.stringify(scanResults, null, 2));
        
        res.json({
            files: results.files.slice(0, 500), // Limit response size
            stats: stats
        });
        
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Preview file
app.get('/api/preview', (req, res) => {
    const filePath = req.query.path;
    
    try {
        if (!fs.existsSync(filePath)) {
            return res.json({ content: 'File not found' });
        }
        
        const stats = fs.statSync(filePath);
        if (stats.size > 1024 * 1024) {
            return res.json({ content: `File too large: ${(stats.size / (1024 * 1024)).toFixed(2)} MB` });
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const textExts = ['.txt','.js','.html','.css','.json','.xml','.csv','.md','.log','.ini'];
        
        if (textExts.includes(ext)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ content: content.slice(0, 10000) });
        } else {
            res.json({ content: `Binary file: ${filePath}\nSize: ${(stats.size / 1024).toFixed(2)} KB` });
        }
    } catch (err) {
        res.json({ content: 'Error: ' + err.message });
    }
});

// Download file
app.get('/api/download', (req, res) => {
    const filePath = req.query.path;
    
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

// Get last scan
app.get('/api/last-scan', (req, res) => {
    try {
        if (fs.existsSync('data/scan_results.json')) {
            const data = JSON.parse(fs.readFileSync('data/scan_results.json'));
            res.json(data);
        } else {
            res.json({ files: [], stats: {} });
        }
    } catch (err) {
        res.json({ files: [], stats: {} });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log('\n🚀 FILE SCANNER SERVER STARTED!');
    console.log('='.repeat(60));
    console.log(`📱 Access from any device:`);
    console.log(`   Local: http://localhost:${port}`);
    console.log(`   Network: http://${ip}:${port}`);
    console.log('='.repeat(60));
    console.log('\n📌 Instructions:');
    console.log('   1. Open the URL in any browser');
    console.log('   2. Enter a path to scan (e.g., C:/Users/YourName)');
    console.log('   3. Click "Start Scan" to begin');
    console.log('   4. Browse, search, and download files\n');
});

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