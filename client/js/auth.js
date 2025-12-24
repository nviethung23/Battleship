const API_URL = window.location.origin;

// DOM Elements - Giữ nguyên để tương thích backward
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');

const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

// Không cần showRegisterLink/showLoginLink nữa vì đã có tab system
// Nhưng giữ lại để tránh lỗi nếu có code khác tham chiếu
const showRegisterLink = null;
const showLoginLink = null;

// Login
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const text = await response.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (e) {
            // If JSON parse fails, check if it's a rate limiter message
            if (response.status === 429 || text.includes('Too many')) {
                loginError.textContent = 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.';
                return;
            }
            loginError.textContent = 'Lỗi server: Không thể xử lý phản hồi';
            return;
        }

        if (response.ok) {
            // Save token and user info to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('isGuest', 'false');

            // Also save to sessionStorage for new hub/lobby pages
            sessionStorage.setItem('bs_token', data.token);
            sessionStorage.setItem('bs_userId', data.user.id);
            sessionStorage.setItem('bs_username', data.user.username);
            sessionStorage.setItem('bs_isGuest', 'false');

            // Redirect to hub page
            window.location.href = '/hub';
        } else {
            loginError.textContent = data.error || 'Đăng nhập thất bại';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Không thể kết nối đến server';
    }
});

// Register
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validation
    if (password !== passwordConfirm) {
        registerError.textContent = 'Mật khẩu xác nhận không khớp';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const text = await response.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (e) {
            // If JSON parse fails, check if it's a rate limiter message
            if (response.status === 429 || text.includes('Too many')) {
                registerError.textContent = 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau 15 phút.';
                return;
            }
            registerError.textContent = 'Lỗi server: Không thể xử lý phản hồi';
            return;
        }

        if (response.ok) {
            // Save token and user info to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('isGuest', 'false');

            // Also save to sessionStorage for new hub/lobby pages
            sessionStorage.setItem('bs_token', data.token);
            sessionStorage.setItem('bs_userId', data.user.id);
            sessionStorage.setItem('bs_username', data.user.username);
            sessionStorage.setItem('bs_isGuest', 'false');

            // Redirect to hub page
            window.location.href = '/hub';
        } else {
            registerError.textContent = data.error || 'Đăng ký thất bại';
        }
    } catch (error) {
        console.error('Register error:', error);
        registerError.textContent = 'Không thể kết nối đến server';
    }
});

// Check if already logged in
const token = localStorage.getItem('token');
if (token && window.location.pathname === '/') {
    // Verify token
    fetch(`${API_URL}/api/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(response => {
        if (response.ok) {
            window.location.href = '/hub';
        }
    }).catch(err => {
        console.error('Token verification failed:', err);
    });
}

