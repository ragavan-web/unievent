document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the default form submission

            const formData = new FormData(registrationForm);
            const data = Object.fromEntries(formData.entries());

            // Simple client-side password check
            if (data.password !== data['confirm-password']) {
                showAlert('Passwords do not match!', 'error'); // Using custom alert
                return;
            }

            try {
                // Send the data to your new API endpoint
                const response = await fetch('/api/users/register/student', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(result.message, 'success'); // Using custom alert
                    registrationForm.reset(); // Clear the form on success
                    
                    // Delay redirection slightly to allow user to see success message
                    setTimeout(() => {
                        window.location.href = 'student-login.html'; 
                    }, 1500); 
                    
                } else if (response.status === 409) {
                    // Handle duplicate registration error specifically
                    showAlert(result.error, 'error'); // Using custom alert
                } else {
                    // Handle other server-side errors
                    showAlert(result.error || 'Registration failed due to a server error.', 'error'); // Using custom alert
                }
            } catch (error) {
                console.error('Error during registration:', error);
                showAlert('An error occurred during registration. Please check your network connection.', 'error'); // Using custom alert
            }
        });
    }
});
