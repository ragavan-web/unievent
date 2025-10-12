document.addEventListener('DOMContentLoaded', () => {
    
    // --- SIMULATION NOTE: Retrieve stored data ---
    const organizerName = sessionStorage.getItem('organizerUserName') || "Organizer"; 
    const departmentName = sessionStorage.getItem('organizerDeptName') || "Administration";
    const organizerId = sessionStorage.getItem('organizerUserId'); 
    
    // Authentication Check 
    if (!organizerId) {
        // Fallback for safety
        window.location.href = 'organizer-login-form.html';
        return; 
    }
    
    // --- Initial setup: Welcome Message ---
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Hello, ${organizerName} (${departmentName})`;
    }
    
    // --- Fetch Live Metrics (Unchanged logic) ---
    const fetchOrganizerMetrics = async (id, department) => {
        try {
            const response = await fetch(`/api/events/summary/${encodeURIComponent(department)}`);
            const data = await response.json();

            if (response.ok) {
                document.getElementById('total-active-events').textContent = data.totalActiveEvents;
                document.getElementById('events-pending').textContent = '0'; 
                document.getElementById('total-registrations').textContent = data.totalRegistrations;
            } else {
                console.error('Failed to fetch organizer summary:', data.error);
                document.getElementById('total-active-events').textContent = 'N/A';
            }
        } catch (error) {
            console.error('Network error fetching organizer metrics:', error);
            document.getElementById('total-active-events').textContent = 'Error';
        }
    };
    
    // Fetch data immediately on load
    if (organizerId && departmentName) {
        fetchOrganizerMetrics(organizerId, departmentName);
    }


    // --- Logout Functionality (CRITICAL FIX) ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear(); // Clear all stored authentication data
            showAlert("You have been successfully logged out.", 'info'); // Custom Alert
            
            // Redirect to index page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 1000);
        });
    }
});
