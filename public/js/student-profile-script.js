document.addEventListener('DOMContentLoaded', () => {
    const profileContent = document.getElementById('profile-content');
    const updateForm = document.getElementById('profile-update-form');
    const saveButton = document.getElementById('save-profile-btn');
    const statusMessage = document.getElementById('status-message');
    const userId = sessionStorage.getItem('currentUserId');

    if (!userId) {
        profileContent.innerHTML = '<p class="error-message">Not logged in. Redirecting...</p>';
        setTimeout(() => {
            window.location.href = 'student-login.html';
        }, 1500);
        return;
    }
    
    const DEPARTMENT_OPTIONS = [
        "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
        "Civil Engineering", "Administration"
    ];
    const YEAR_OPTIONS = ["1", "2", "3", "4"];

    // Helper to generate <select> options (FIXED)
    const generateSelect = (name, currentValue, options) => {
        let html = `<select name="${name}" id="${name}">`;
        options.forEach(option => {
            let display = option;
            let value = option;

            if (name === 'year') {
                if (option === '1') display = '1st Year';
                else if (option === '2') display = '2nd Year';
                else if (option === '3') display = '3rd Year';
                else if (option === '4') display = '4th Year';
                else display = `${option} Year`; 
            }
            
            const selected = value == currentValue ? 'selected' : '';
            html += `<option value="${value}" ${selected}>${display}</option>`;
        });
        html += '</select>';
        return html;
    };

    const renderProfile = (user) => {
        profileContent.innerHTML = `
            <div class="profile-detail-item full-width">
                <strong>User Unique ID:</strong>
                <span style="font-size: 1.2em; color: var(--secondary-color, #ff9800);">${userId}</span>
            </div>
            <div class="profile-detail-item">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" value="${user.name}" required>
            </div>
            <div class="profile-detail-item">
                <label for="regno">Register Number</label>
                <input type="text" id="regno" name="regno" value="${user.regno || ''}" required>
                <small class="help-text">Cannot be changed after initial registration in a production environment.</small>
            </div>
            <div class="profile-detail-item">
                <label for="email">Email ID</label>
                <input type="email" id="email" name="email" value="${user.email}" required>
            </div>
            <div class="profile-detail-item">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" value="${user.phone || ''}" required>
            </div>
            <div class="profile-detail-item">
                <label for="department">Department</label>
                ${generateSelect('department', user.department, DEPARTMENT_OPTIONS)}
            </div>
            <div class="profile-detail-item">
                <label for="year">Academic Year</label>
                ${generateSelect('year', user.year, YEAR_OPTIONS)}
            </div>
        `;
        saveButton.disabled = false;
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch(`/api/users/profile/${userId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch user profile.');
            }
            
            const user = await response.json();
            renderProfile(user);

        } catch (error) {
            console.error('Profile fetch error:', error);
            profileContent.innerHTML = `<p class="error-message">Error loading profile: ${error.message}</p>`;
        }
    };
    
    // --- Form Submission Handler (Unchanged) ---
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveButton.disabled = true;
        statusMessage.textContent = 'Saving...';
        statusMessage.style.color = '#5c6bc0';

        const formData = new FormData(updateForm);
        const data = Object.fromEntries(formData.entries());
        data.userId = userId; 

        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                statusMessage.textContent = result.message;
                statusMessage.style.color = 'green';
                
                if (data.name) sessionStorage.setItem('currentUserName', data.name);
            } else {
                statusMessage.textContent = result.error || 'Update failed.';
                statusMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Update network error:', error);
            statusMessage.textContent = 'A network error occurred.';
            statusMessage.style.color = 'red';
        } finally {
            saveButton.disabled = false;
        }
    });

    fetchProfile();
});
