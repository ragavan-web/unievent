document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('registrations-table-body');
    const regCount = document.getElementById('registration-count');
    const userWelcomeInfo = document.getElementById('user-welcome-info');

    // Get the User ID from sessionStorage (set during successful login)
    const userId = sessionStorage.getItem('currentUserId');
    
    if (!userId) {
        userWelcomeInfo.innerHTML = 'Please log in to view your registrations.';
        tableBody.innerHTML = '<tr><td colspan="7" class="error-row">Authentication failed. Redirecting to login...</td></tr>';
        setTimeout(() => {
             window.location.href = 'student-login.html';
        }, 2000);
        return;
    }

    // --- Data Fetching ---
    const fetchMyRegistrations = async (id) => {
        userWelcomeInfo.textContent = `User ID: ${id}`; // Display ID for development check

        try {
            // Fetch registrations from the new endpoint
            const response = await fetch(`/api/events/my-registrations/${id}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch registrations (Status ${response.status}).`);
            }
            
            const registrations = await response.json();
            renderRegistrationsTable(registrations);

        } catch (error) {
            console.error('Error fetching registrations:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-row">Error: ${error.message}</td></tr>`;
        }
    };

    // --- Data Rendering ---
    const renderRegistrationsTable = (registrations) => {
        tableBody.innerHTML = '';
        regCount.textContent = registrations.length;

        if (registrations.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">You are not registered for any competitions yet.</td></tr>';
            return;
        }

        registrations.forEach(reg => {
            const feeStatus = reg.registration_fee > 0 ? `INR ${reg.registration_fee} (Fee applies)` : 'Free';
            const row = `
                <tr>
                    <td>${reg.event_title}</td>
                    <td>${reg.comp_name}</td>
                    <td>${reg.comp_type}</td>
                    <td>${reg.event_date}</td>
                    <td>${reg.coordinator_phone}</td>
                    <td>${feeStatus}</td>
                    <td>${new Date(reg.registration_date).toLocaleDateString()}</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };
    
    // --- Run on Load ---
    fetchMyRegistrations(userId);
});