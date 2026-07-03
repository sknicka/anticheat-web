// Configuration
const CONFIG = {
    API_URL: 'http://82.39.212.140:30046',
    WEBHOOK_URL: 'https://discord.com/api/webhooks/1374132689682169936/E_biDAmcWhAbgiz_26ir5yTvOpZ93S59j8faHJdq7hWt0SzDPVbdHAzmEH98ZrlV0hsj'
};

// State
let currentUser = null;
let currentPage = 'dashboard';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check Authentication
function checkAuth() {
    const user = localStorage.getItem('admin_user');
    if (user) {
        currentUser = JSON.parse(user);
        showPanel();
        loadDashboardData();
    } else {
        showLoginModal();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('steamIdInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);

    // Modals
    document.getElementById('closeBanModal').addEventListener('click', () => {
        closeModal('banModal');
    });
    document.getElementById('closeUnbanModal').addEventListener('click', () => {
        closeModal('unbanModal');
    });
    document.getElementById('cancelBanBtn').addEventListener('click', () => {
        closeModal('banModal');
    });
    document.getElementById('cancelUnbanBtn').addEventListener('click', () => {
        closeModal('unbanModal');
    });
    document.getElementById('confirmBanBtn').addEventListener('click', handleBanConfirm);
    document.getElementById('confirmUnbanBtn').addEventListener('click', handleUnbanConfirm);
}

// Login Handler
async function handleLogin() {
    const steamId = document.getElementById('steamIdInput').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!steamId) {
        errorEl.textContent = 'Please enter your Steam ID';
        return;
    }

    if (!steamId.startsWith('steam:')) {
        errorEl.textContent = 'Invalid Steam ID format (must start with steam:)';
        return;
    }

    try {
        // Simulate API call - in real scenario this would verify with server
        currentUser = {
            steamId: steamId,
            name: `Admin (${steamId.substring(0, 20)}...)`
        };

        localStorage.setItem('admin_user', JSON.stringify(currentUser));
        
        closeModal('loginModal');
        showPanel();
        loadDashboardData();
    } catch (error) {
        errorEl.textContent = 'Authentication failed';
    }
}

// Logout Handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('admin_user');
        currentUser = null;
        showLoginModal();
    }
}

// Show/Hide Modal
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('userName').textContent = 'Not Logged In';
}

function showPanel() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('userName').textContent = currentUser.name;
    document.querySelector('.main-content').style.display = 'flex';
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Page Navigation
function switchPage(page) {
    currentPage = page;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(page).classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        players: 'Players',
        bans: 'Bans',
        logs: 'Logs'
    };
    document.getElementById('pageTitle').textContent = titles[page];

    // Load page data
    if (page === 'players') loadPlayers();
    if (page === 'bans') loadBans();
    if (page === 'logs') loadLogs();
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Fetch player count
        const playerCount = await fetchFromServer('getPlayerCount');
        document.getElementById('playerCount').textContent = playerCount || 0;

        // Fetch admin count
        const adminCount = await fetchFromServer('getAdminCount');
        document.getElementById('adminCount').textContent = adminCount || 0;

        // Fetch ban count
        const banCount = await fetchFromServer('getBannedCount');
        document.getElementById('banCount').textContent = banCount || 0;

        // Load recent bans
        loadRecentBans();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Recent Bans
async function loadRecentBans() {
    try {
        const bans = await fetchFromServer('getBans');
        const container = document.getElementById('recentBans');

        if (!bans || bans.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent bans</p>';
            return;
        }

        const recent = bans.slice(0, 5);
        container.innerHTML = recent.map(ban => `
            <div class="ban-item">
                <div class="item-info">
                    <div class="item-name">${ban.playerName || 'Unknown'}</div>
                    <div class="item-meta">Ban ID: ${ban.banID} | Reason: ${ban.reason}</div>
                </div>
                <button class="btn btn-success" onclick="showUnbanModal('${ban.banID}', '${ban.playerName}')">
                    Unban
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent bans:', error);
    }
}

// Load Players
async function loadPlayers() {
    try {
        const players = await fetchFromServer('getPlayers');
        const container = document.getElementById('playersList');

        if (!players || players.length === 0) {
            container.innerHTML = '<p class="empty-state">No players online</p>';
            return;
        }

        container.innerHTML = players.map(player => `
            <div class="player-item">
                <div class="item-info">
                    <div class="item-name">${player.playerName}</div>
                    <div class="item-meta">ID: ${player.id} | Steam: ${player.steamId}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="showBanModal(${player.id}, '${player.playerName}')">
                        Ban
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Load Bans
async function loadBans() {
    try {
        const bans = await fetchFromServer('getBans');
        const container = document.getElementById('bansList');

        if (!bans || bans.length === 0) {
            container.innerHTML = '<p class="empty-state">No bans in database</p>';
            return;
        }

        container.innerHTML = bans.map(ban => `
            <div class="ban-item">
                <div class="item-info">
                    <div class="item-name">${ban.playerName}</div>
                    <div class="item-meta">
                        <div>Ban ID: <strong>${ban.banID}</strong></div>
                        <div>Reason: ${ban.reason}</div>
                    </div>
                </div>
                <button class="btn btn-success" onclick="showUnbanModal('${ban.banID}', '${ban.playerName}')">
                    Unban
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading bans:', error);
    }
}

// Load Logs
async function loadLogs() {
    try {
        const logs = await fetchFromServer('getLogs');
        const container = document.getElementById('logsList');

        if (!logs || logs.length === 0) {
            container.innerHTML = '<p class="empty-state">No logs available</p>';
            return;
        }

        container.innerHTML = logs.slice(0, 50).reverse().map(log => `
            <div class="log-item">
                <div class="item-info">
                    <div class="item-name">${log.event}</div>
                    <div class="item-meta">${log.source} | ${log.time} | <span style="color: ${log.status === 'Success' ? '#10b981' : '#ef4444'}">${log.status}</span></div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// Show Ban Modal
function showBanModal(playerId, playerName) {
    document.getElementById('banPlayerId').value = playerId;
    document.getElementById('banReason').value = '';
    openModal('banModal');
}

// Handle Ban Confirm
async function handleBanConfirm() {
    const playerId = document.getElementById('banPlayerId').value;
    const reason = document.getElementById('banReason').value;

    if (!playerId || !reason) {
        alert('Please fill all fields');
        return;
    }

    try {
        await fetchFromServer('banPlayer', {
            playerId: playerId,
            reason: reason
        });

        alert('Player banned successfully');
        closeModal('banModal');
        loadDashboardData();
        loadPlayers();
    } catch (error) {
        console.error('Error banning player:', error);
        alert('Error banning player');
    }
}

// Show Unban Modal
function showUnbanModal(banId, playerName) {
    document.getElementById('unbanConfirmText').textContent = 
        `Are you sure you want to unban ${playerName}? (Ban ID: ${banId})`;
    document.getElementById('unbanModal').dataset.banId = banId;
    openModal('unbanModal');
}

// Handle Unban Confirm
async function handleUnbanConfirm() {
    const banId = document.getElementById('unbanModal').dataset.banId;

    try {
        await fetchFromServer('unban', {
            banid: banId
        });

        alert('Player unbanned successfully');
        closeModal('unbanModal');
        loadDashboardData();
        loadBans();
    } catch (error) {
        console.error('Error unbanning player:', error);
        alert('Error unbanning player');
    }
}

// Fetch from Server
async function fetchFromServer(action, data = {}) {
    try {
        // This would normally make a real API call to your FiveM server
        // For now, we're using localStorage to simulate
        
        // In production, you would:
        // 1. Set up a backend API that communicates with your FiveM server
        // 2. Or use a FiveM NUI callback system
        
        // Simulated responses for demo
        if (action === 'getPlayerCount') {
            return localStorage.getItem('playerCount') || 15;
        }
        if (action === 'getAdminCount') {
            return localStorage.getItem('adminCount') || 3;
        }
        if (action === 'getBannedCount') {
            return localStorage.getItem('bannedCount') || 42;
        }
        if (action === 'getPlayers') {
            return JSON.parse(localStorage.getItem('players')) || [
                { id: 1, playerName: 'John Doe', steamId: 'steam:1100001234567890' },
                { id: 2, playerName: 'Jane Smith', steamId: 'steam:1100009876543210' }
            ];
        }
        if (action === 'getBans') {
            return JSON.parse(localStorage.getItem('bans')) || [];
        }
        if (action === 'getLogs') {
            return JSON.parse(localStorage.getItem('logs')) || [];
        }

        return null;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Send Webhook Notification
async function sendWebhookNotification(title, description, fields = []) {
    try {
        const embed = {
            title: title,
            description: description,
            color: 3447003,
            fields: fields,
            footer: {
                text: 'WX AntiCheat Admin Panel'
            },
            timestamp: new Date()
        };

        await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });
    } catch (error) {
        console.error('Webhook error:', error);
    }
}

// Auto-refresh data every 30 seconds
setInterval(() => {
    if (currentPage === 'dashboard' && currentUser) {
        loadDashboardData();
    }
}, 30000);
