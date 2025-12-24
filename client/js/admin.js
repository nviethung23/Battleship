// Admin Dashboard JavaScript

const API_URL = window.location.origin;
let currentToken = null;
let currentUser = null;
let gamesChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    updateTime();
    setInterval(updateTime, 1000);
});

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/';
        return;
    }

        currentToken = token;

        try {
        // First, try to decode token to get role (faster)
        let userRole = null;
        let userId = null;
        let username = null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role;
            userId = payload.id;
            username = payload.username;
            console.log('✅ Token decoded:', { userId, username, role: userRole });
        } catch (e) {
            console.error('❌ Error decoding token:', e);
        }

        // If token has role, check immediately
        if (userRole === 'admin') {
            currentUser = { id: userId, username: username, role: 'admin' };
            document.getElementById('adminName').textContent = username || 'Admin';
            loadDashboard();
            return;
        }

        // If no role in token, verify with API
        const response = await fetch(`${API_URL}/api/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        const data = await response.json();
        currentUser = data.user;
        userRole = data.user.role || userRole;

        console.log('API response:', { user: data.user, role: userRole });

        // Check if admin
        if (userRole !== 'admin') {
            console.log('❌ Not admin! Role:', userRole);
            console.log('User data:', data.user);
            alert(`Access denied. Admin only. Your role: ${userRole || 'undefined'}`);
            window.location.href = '/game';
            return;
        }

        console.log('✅ Admin access granted!');

        // Set admin name
        document.getElementById('adminName').textContent = data.user.username || username;

        // Ensure token is set
        currentToken = token;
        currentUser = { ...data.user, role: userRole };

        // Load dashboard after a small delay to ensure everything is set
        setTimeout(() => {
            loadDashboard();
        }, 100);
    } catch (error) {
        console.error('Auth error:', error);
        alert('Authentication failed. Please login again.');
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Skip if it's the "Back to Game" button (no data-page attribute)
            if (!item.dataset.page) {
                return; // Let the link work normally
            }
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/';
    });

    // Search
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });

    document.getElementById('gameSearch')?.addEventListener('input', (e) => {
        filterGames(e.target.value);
    });

    // Role filter
    document.getElementById('roleFilter')?.addEventListener('change', (e) => {
        filterUsersByRole(e.target.value);
    });
}

// Update time
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('vi-VN');
}

// Switch page
function switchPage(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update pages
    document.querySelectorAll('.admin-page').forEach(p => {
        p.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        games: 'Games Management',
        statistics: 'Statistics'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    // Load data
    if (page === 'dashboard') {
        loadDashboard();
    } else if (page === 'users') {
        loadUsers();
    } else if (page === 'games') {
        loadGames();
    } else if (page === 'statistics') {
        loadStatistics();
    }
}

// Show loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        // Always get fresh token from localStorage
        const token = localStorage.getItem('token') || currentToken;
        
        if (!token) {
            throw new Error('No token found. Please login again.');
        }

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                alert('Session expired. Please login again.');
                window.location.href = '/';
                throw new Error('Authentication required');
            }
            throw new Error(data.error || 'API error');
        }

        return data;
    } catch (error) {
        console.error('API error:', error);
        if (error.message !== 'Authentication required') {
            alert(`Error: ${error.message}`);
        }
        throw error;
    }
}

// Load Dashboard
async function loadDashboard() {
    showLoading();
    try {
        const stats = await apiCall('/api/admin/stats');
        
        // Update stat cards
        document.getElementById('statTotalUsers').textContent = stats.stats.users.total;
        document.getElementById('statTotalGames').textContent = stats.stats.games.total;
        document.getElementById('statGamesToday').textContent = stats.stats.games.today;
        document.getElementById('statAvgDuration').textContent = stats.stats.games.avgDurationSeconds;

        // Render games chart
        renderGamesChart(stats.stats.gamesPerDay);

        // Render top players
        renderTopPlayers(stats.stats.topPlayers);
    } catch (error) {
        console.error('Load dashboard error:', error);
    } finally {
        hideLoading();
    }
}

// Render games chart
function renderGamesChart(gamesPerDay) {
    const ctx = document.getElementById('gamesChartCanvas');
    if (!ctx) return;

    // Destroy existing chart
    if (gamesChart) {
        gamesChart.destroy();
    }

    const labels = gamesPerDay.map(g => g.date);
    const data = gamesPerDay.map(g => g.count);

    gamesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Games',
                data: data,
                borderColor: '#1e3a5f',
                backgroundColor: 'rgba(30, 58, 95, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Render top players
function renderTopPlayers(players) {
    const container = document.getElementById('topPlayersList');
    if (!container) return;

    container.innerHTML = '';

    if (players.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No players yet</p>';
        return;
    }

    players.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'top-player-item';
        item.innerHTML = `
            <span class="player-rank">#${index + 1}</span>
            <span class="player-name">${player.username}</span>
            <span class="player-wins">${player.wins} wins</span>
        `;
        container.appendChild(item);
    });
}

// Load Users
let allUsers = [];
async function loadUsers() {
    showLoading();
    try {
        const data = await apiCall('/api/admin/users');
        allUsers = data.users;

        // Get stats for each user
        for (let user of allUsers) {
            try {
                const userData = await apiCall(`/api/admin/users/${user.id}`);
                user.stats = userData.stats;
            } catch (error) {
                user.stats = { totalGames: 0, wins: 0, losses: 0, winRate: 0 };
            }
        }

        renderUsersTable(allUsers);
    } catch (error) {
        console.error('Load users error:', error);
    } finally {
        hideLoading();
    }
}

// Render users table
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>${escapeHtml(user.email || '-')}</td>
            <td><span class="role-badge ${user.role || 'user'}">${user.role || 'user'}</span></td>
            <td>${user.stats?.totalGames || 0}</td>
            <td>${user.stats?.winRate || 0}%</td>
            <td>${new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>
                <div class="action-buttons">
                    ${user.role !== 'admin' ? `<button class="btn-action promote" onclick="promoteUser('${user.id}')">Promote</button>` : ''}
                    ${user.role === 'admin' && user.id !== currentUser.id ? `<button class="btn-action demote" onclick="demoteUser('${user.id}')">Demote</button>` : ''}
                    ${user.id !== currentUser.id ? `<button class="btn-action delete" onclick="deleteUser('${user.id}')">Delete</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter users
function filterUsers(searchTerm) {
    const filtered = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    renderUsersTable(filtered);
}

function filterUsersByRole(role) {
    if (!role) {
        renderUsersTable(allUsers);
        return;
    }
    const filtered = allUsers.filter(user => (user.role || 'user') === role);
    renderUsersTable(filtered);
}

// Load Games
let allGames = [];
async function loadGames() {
    showLoading();
    try {
        const data = await apiCall('/api/admin/games');
        allGames = data.games;
        renderGamesTable(allGames);
    } catch (error) {
        console.error('Load games error:', error);
    } finally {
        hideLoading();
    }
}

// Render games table
function renderGamesTable(games) {
    const tbody = document.getElementById('gamesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (games.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No games found</td></tr>';
        return;
    }

    games.forEach(game => {
        const duration = Math.floor((game.duration || 0) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${game.id.substring(0, 8)}...</code></td>
            <td>${escapeHtml(game.player1Username)}</td>
            <td>${escapeHtml(game.player2Username)}</td>
            <td><strong>${game.winnerUsername || '-'}</strong></td>
            <td>${durationStr}</td>
            <td>${game.startedAt ? new Date(game.startedAt).toLocaleString('vi-VN') : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action delete" onclick="deleteGame('${game.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter games
function filterGames(searchTerm) {
    const filtered = allGames.filter(game => 
        game.player1Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.player2Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (game.winnerUsername && game.winnerUsername.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    renderGamesTable(filtered);
}

// Load Statistics
async function loadStatistics() {
    showLoading();
    try {
        const stats = await apiCall('/api/admin/stats');
        
        document.getElementById('detailTotalUsers').textContent = stats.stats.users.total;
        document.getElementById('detailAdmins').textContent = stats.stats.users.admins;
        document.getElementById('detailRegularUsers').textContent = stats.stats.users.regular;
        document.getElementById('detailTotalGames').textContent = stats.stats.games.total;
        document.getElementById('detailGamesToday').textContent = stats.stats.games.today;
        document.getElementById('detailGames7Days').textContent = stats.stats.games.last7Days;
        document.getElementById('detailAvgDuration').textContent = stats.stats.games.avgDurationSeconds;
    } catch (error) {
        console.error('Load statistics error:', error);
    } finally {
        hideLoading();
    }
}

// Actions
async function promoteUser(userId) {
    if (!confirm('Promote this user to admin?')) return;

    try {
        await apiCall(`/api/admin/users/${userId}/role`, 'PATCH', { role: 'admin' });
        alert('User promoted to admin successfully!');
        loadUsers();
    } catch (error) {
        console.error('Promote user error:', error);
    }
}

async function demoteUser(userId) {
    if (!confirm('Demote this admin to regular user? They will lose admin privileges.')) return;

    try {
        await apiCall(`/api/admin/users/${userId}/role`, 'PATCH', { role: 'user' });
        alert('User demoted to regular user successfully!');
        loadUsers();
    } catch (error) {
        console.error('Demote user error:', error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        await apiCall(`/api/admin/users/${userId}`, 'DELETE');
        alert('User deleted successfully!');
        loadUsers();
    } catch (error) {
        console.error('Delete user error:', error);
    }
}

async function deleteGame(gameId) {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
        await apiCall(`/api/admin/games/${gameId}`, 'DELETE');
        alert('Game deleted successfully!');
        loadGames();
    } catch (error) {
        console.error('Delete game error:', error);
    }
}

// Helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

