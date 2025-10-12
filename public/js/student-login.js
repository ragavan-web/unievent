document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/users/login/student', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Show success message
                    showAlert(`Login successful! Welcome, ${result.name}!`, 'success');
                    
                    // Store user data in session storage
                    sessionStorage.setItem('currentUserId', result.userId); 
                    sessionStorage.setItem('currentUserName', result.name); 
                    sessionStorage.setItem('currentUserYear', result.year);
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'student-dashboard.html'; 
                    }, 1500);
                     
                } else {
                    // Show error message from server
                    showAlert(result.error || 'Login failed due to an unknown error.', 'error');
                }
            } catch (error) {
                console.error('Network error during login:', error);
                showAlert('A network error occurred. Please check your network connection.', 'error');
            }
        });
    }
});
