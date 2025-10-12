document.addEventListener('DOMContentLoaded', () => {
    
    // --- Organizer Registration Logic ---
    const regForm = document.getElementById('organizer-registration-form');

    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const formData = new FormData(regForm);
            const data = Object.fromEntries(formData.entries());

            if (data.password !== data['confirm-password']) {
                showAlert('Error: Passwords do not match!', 'error'); // Custom Alert
                return;
            }

            try {
                const response = await fetch('/api/users/register/organizer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(result.message, 'success'); // Custom Alert
                    regForm.reset(); 
                    // Redirect after delay
                    setTimeout(() => {
                         window.location.href = 'organizer-login-form.html'; 
                    }, 1500);
                } else {
                    showAlert(result.error || 'Organizer registration failed.', 'error'); // Custom Alert
                }
            } catch (error) {
                console.error('Registration Error:', error);
                showAlert('A network error occurred during registration.', 'error'); // Custom Alert
            }
        });
    }

    // --- Organizer Login Logic (UPDATED: Custom Alert) ---
    const loginForm = document.getElementById('organizer-login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/users/login/organizer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(`Login successful! Welcome, ${result.name} (${result.department} Organizer)!`, 'success'); // Custom Alert
                    
                    // Store user info
                    sessionStorage.setItem('organizerUserId', result.userId); 
                    sessionStorage.setItem('organizerDeptName', result.department); 
                    sessionStorage.setItem('organizerUserName', result.name); 

                    // Redirect after delay
                    setTimeout(() => {
                        window.location.href = 'organizer-dashboard.html'; 
                    }, 1500);

                } else {
                    showAlert(result.error || 'Login failed: Invalid credentials.', 'error'); // Custom Alert
                }
            } catch (error) {
                console.error('Login Error:', error);
                showAlert('A network error occurred during login.', 'error'); // Custom Alert
            }
        });
    }
});
