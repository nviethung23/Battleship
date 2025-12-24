class GuestLoginManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Guest submit button - giờ nằm trong tab panel thay vì modal
        const guestSubmitBtn = document.getElementById('guestSubmitBtn');
        if (guestSubmitBtn) {
            guestSubmitBtn.addEventListener('click', () => this.submitGuestLogin());
        } else {
            console.warn('[Guest Login] Button guestSubmitBtn not found');
        }

        const guestNameInput = document.getElementById('guestNameInput');
        if (guestNameInput) {
            guestNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitGuestLogin();
                }
            });
        } else {
            console.warn('[Guest Login] Input guestNameInput not found');
        }

        console.log('[Guest Login] Event listeners setup complete');
    }

    /**
     * Setup auto logout khi đóng tab (không áp dụng cho refresh/navigation)
     */
    setupAutoLogout() {
        // Không xóa localStorage khi beforeunload vì nó sẽ xóa cả khi redirect
        // Chỉ dựa vào server để xóa guest khi socket disconnect
        console.log('[Guest Login] Auto logout setup (server-side only)');
    }

    async submitGuestLogin() {
        const guestNameInput = document.getElementById('guestNameInput');
        const guestName = guestNameInput ? guestNameInput.value.trim() : '';
        const errorMsg = document.getElementById('guestErrorMessage');

        // Clear previous errors
        if (errorMsg) {
            errorMsg.textContent = '';
        }

        // Validation
        if (!guestName) {
            if (errorMsg) errorMsg.textContent = 'Vui lòng nhập tên của bạn';
            return;
        }

        if (guestName.length < 2) {
            if (errorMsg) errorMsg.textContent = 'Tên phải có ít nhất 2 ký tự';
            return;
        }

        if (guestName.length > 30) {
            if (errorMsg) errorMsg.textContent = 'Tên không được quá 30 ký tự';
            return;
        }

        try {
            // Disable submit button
            const submitBtn = document.getElementById('guestSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang xử lý...';
            
            const response = await fetch('/api/guest-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ guestName })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            console.log('Response headers:', response.headers);
            
            const text = await response.text();
            console.log('Response text:', text);
            console.log('Response text length:', text.length);

            if (!text || text.length === 0) {
                throw new Error('Server trả về response rỗng. Kiểm tra server logs.');
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If JSON parse fails, check if it's a rate limiter message
                if (response.status === 429 || text.includes('Too many')) {
                    throw new Error('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.');
                }
                console.error('JSON parse error:', e);
                console.error('Response text was:', text);
                throw new Error('Server trả về dữ liệu không hợp lệ. Response: ' + text.substring(0, 100));
            }

            if (!response.ok) {
                throw new Error(data.error || 'Đăng nhập khách thất bại');
            }

            // Lưu token và user info (format giống auth.js)
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('isGuest', 'true');
            localStorage.setItem('guestDisplayName', data.user.guestName);

            // Also save to sessionStorage for new hub/lobby pages
            sessionStorage.setItem('bs_token', data.token);
            sessionStorage.setItem('bs_userId', data.user.id);
            sessionStorage.setItem('bs_username', data.user.username);
            sessionStorage.setItem('bs_isGuest', 'true');
            sessionStorage.setItem('bs_guestDisplayName', data.user.guestName);

            console.log('Guest login thành công:', data.user);
            console.log('Saved to localStorage:');
            console.log('  Token:', data.token ? 'exists' : 'missing');
            console.log('  UserId:', data.user.id);
            console.log('  Username:', data.user.username);
            console.log('  IsGuest:', 'true');
            console.log('  GuestDisplayName:', data.user.guestName);
            
            // Verify localStorage
            console.log('Verify localStorage:');
            console.log('  Token:', localStorage.getItem('token') ? 'exists' : 'missing');
            console.log('  UserId:', localStorage.getItem('userId'));
            console.log('  Username:', localStorage.getItem('username'));
            console.log('  IsGuest:', localStorage.getItem('isGuest'));
            
            // Guest login thành công - redirect đến hub page
            // Đợi một chút để đảm bảo localStorage đã lưu xong
            console.log('Waiting for localStorage to persist...');
            setTimeout(() => {
                console.log('Redirecting to /hub...');
                window.location.href = '/hub';
            }, 100);

        } catch (error) {
            console.error('Guest login error:', error);
            if (errorMsg) {
                errorMsg.textContent = 'Lỗi: ' + error.message;
            }
            const submitBtn = document.getElementById('guestSubmitBtn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Bắt Đầu Chơi';
        }
    }
}

// Khởi tạo khi trang tải
document.addEventListener('DOMContentLoaded', () => {
    new GuestLoginManager();
});
