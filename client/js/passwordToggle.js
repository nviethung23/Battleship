// Password Toggle Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Get all password toggle buttons
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const eyeIcon = button.querySelector('.eye-icon');

            if (!passwordInput) return;

            // Toggle password visibility
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.textContent = '👁️‍🗨️'; // Open eye with dash
            } else {
                passwordInput.type = 'password';
                eyeIcon.textContent = '👁️'; // Closed eye
            }
        });
    });
});
