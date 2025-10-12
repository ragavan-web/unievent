// This script controls the entire Forgot Password flow (Request OTP, Verify OTP, Reset Password)

document.addEventListener('DOMContentLoaded', () => {
    // --- Shared Elements and State ---
    const urlPath = window.location.pathname;
    const isForgotPasswordPage = urlPath.endsWith('forgot-password.html');
    const isResetPasswordPage = urlPath.endsWith('reset-password.html');
    
    // We use sessionStorage to pass the verified email securely between pages
    let verifiedEmail = sessionStorage.getItem('resetEmail') || null;

    // --- Utility Functions ---
    // NOTE: This showStatus is for the small message text beneath the form (simulated console log)
    const showStatus = (message, isError = false) => {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = isError ? 'red' : 'green';
        }
    };

    // --- Forgot Password Page Logic (Request/Verify OTP) ---
    if (isForgotPasswordPage) {
        const requestForm = document.getElementById('request-otp-form');
        const verifyView = document.getElementById('verify-otp-view');
        const verifyBtn = document.getElementById('verify-otp-btn');
        const otpInputs = document.querySelectorAll('.otp-input');
        const timerElement = document.getElementById('timer');
        let countdown;

        // OTP Input Focus Handling (Unchanged)
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                let value = e.target.value;
                if (!/^\d*$/.test(value)) {
                    e.target.value = value.slice(0, -1);
                    return;
                }
                if (value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });

        const startTimer = () => {
            const duration = 5 * 60; // 5 minutes in seconds
            let timer = duration, minutes, seconds;
            
            clearInterval(countdown);
            verifyBtn.disabled = false;
            
            countdown = setInterval(() => {
                minutes = parseInt(timer / 60, 10);
                seconds = parseInt(timer % 60, 10);

                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;

                timerElement.textContent = minutes + ":" + seconds;

                if (--timer < 0) {
                    clearInterval(countdown);
                    timerElement.textContent = "EXPIRED";
                    showStatus("The OTP has expired. Please refresh the page to request a new one.", true);
                    verifyBtn.disabled = true;
                }
            }, 1000);
        };

        // Handle Request OTP Submission
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(requestForm);
            const data = Object.fromEntries(formData.entries());
            verifiedEmail = data.email; 

            try {
                const response = await fetch('/api/users/request-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (response.ok) {
                    // Switch view to OTP verification
                    requestForm.classList.add('hidden');
                    verifyView.classList.remove('hidden');
                    document.getElementById('form-title').textContent = "Verify OTP";
                    document.getElementById('form-description').textContent = "Enter the 4-digit code sent to your registered contact details.";
                    startTimer();
                    showStatus(result.message, false);
                    otpInputs[0].focus(); 
                } else {
                    showStatus(result.error || 'Failed to request OTP.', true);
                }
            } catch (error) {
                console.error('Request OTP Error:', error);
                showStatus('A network error occurred. Try again.', true);
            }
        });

        // Handle Verify OTP Submission
        verifyBtn.addEventListener('click', async () => {
            const otp = Array.from(otpInputs).map(input => input.value).join('');

            if (otp.length !== 4) {
                showStatus('Please enter the full 4-digit OTP.', true);
                return;
            }

            try {
                const response = await fetch('/api/users/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: verifiedEmail, otp: otp })
                });
                const result = await response.json();

                if (response.ok) {
                    clearInterval(countdown);
                    // Verification successful! Store email in session and redirect to reset page
                    sessionStorage.setItem('resetEmail', verifiedEmail);
                    window.location.href = 'reset-password.html';
                } else {
                    showStatus(result.error || 'Verification failed.', true);
                }
            } catch (error) {
                console.error('Verify OTP Error:', error);
                showStatus('A network error occurred. Try again.', true);
            }
        });
    }

    // --- Reset Password Page Logic (CRITICAL ALERTS REPLACED) ---
    if (isResetPasswordPage) {
        const resetForm = document.getElementById('reset-password-form');
        
        // Security check: Ensure email is available from session storage for the reset request
        if (!verifiedEmail) {
            // Replaced alert()
            showAlert('Security error: Please start the password reset process again.', 'error'); 
            setTimeout(() => {
                window.location.href = 'forgot-password.html';
            }, 1500);
            return;
        }

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(resetForm);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            if (newPassword !== confirmPassword) {
                showAlert('New passwords do not match!', 'error'); 
                return; // Ensure function exits after showing alert
            }
            
            // CRITICAL: Check if passwords are empty, which can happen if inputs are cleared
            if (!newPassword || !confirmPassword) {
                 showAlert('Password fields cannot be empty.', 'error');
                 return;
            }

            try {
                const response = await fetch('/api/users/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: verifiedEmail, newPassword, confirmPassword })
                });
                const result = await response.json();

                if (response.ok) {
                    showAlert(result.message, 'success'); 
                    sessionStorage.removeItem('resetEmail'); // Clear session
                    
                    setTimeout(() => {
                        window.location.href = 'student-login.html';
                    }, 1500);
                } else {
                    showAlert(result.error || 'Password reset failed.', 'error'); 
                }
            } catch (error) {
                console.error('Reset Password Error:', error);
                showAlert('A network error occurred. Try again.', 'error'); 
            }
        });
    }
});
