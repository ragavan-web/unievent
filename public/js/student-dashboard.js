const DEFAULT_IMAGE = "https://placehold.co/300x150/5c6bc0/ffffff?text=UniEvent";

let registeredCompIds = new Set();
let currentUserId = sessionStorage.getItem('currentUserId');

const renderEventCard = (event) => {
    const defaultImg = "https://placehold.co/300x150/5c6bc0/ffffff?text=UniEvent";
    const isSimulated = event.photo_url && (event.photo_url.includes('simulated_base64_upload') || event.photo_url.includes('placeholder_upload'));
    const imageUrl = (event.photo_url && !isSimulated) ? event.photo_url : defaultImg;
    
    const date = new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = `${event.start_time} - ${event.end_time}`;
    
    const isRegistered = event.competitions.some(comp => registeredCompIds.has(comp.id));
    const isClosed = event.registration_closed === 1;

    let registrationBadge = '';
    if (isClosed) {
        registrationBadge = `<span class="registration-badge closed"><i class="fas fa-times-circle"></i> Closed</span>`;
    } else if (isRegistered) {
        registrationBadge = `<span class="registration-badge registered"><i class="fas fa-check-circle"></i> Registered</span>`;
    } else {
        registrationBadge = `<span class="registration-badge not-registered">Open</span>`;
    }

    return `
        <div class="event-card" data-event-id="${event.id}">
            <img src="${imageUrl}" alt="${event.title} Poster" class="event-image" onerror="this.onerror=null; this.src='${defaultImg}';">
            <div class="event-card-body">
                <div class="event-title-header">
                    <h3 class="event-title">${event.title}</h3>
                    ${registrationBadge}
                </div>
                <p class="event-meta">${event.department} | ${event.type}</p>
                <div class="event-details-row">
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    <span><i class="fas fa-clock"></i> ${time}</span>
                </div>
                <div class="event-details-row">
                    <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                    <span><i class="fas fa-tasks"></i> ${event.competitions.length} Comps</span>
                </div>
                
                <button class="btn primary-btn view-details-btn" data-event-id="${event.id}" ${isClosed ? 'disabled' : ''}>
                    ${isClosed ? 'View Details' : 'View Details & Register'}
                </button>
            </div>
        </div>
    `;
};

const fetchAndRenderEvents = async (department, type) => {
    const eventListContainer = document.getElementById('event-list');
    eventListContainer.innerHTML = '<p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Fetching amazing events...</p>';
    
    const query = new URLSearchParams({ department, type }).toString();
    
    try {
        if (currentUserId) {
            const statusResponse = await fetch(`/api/events/check-status/${currentUserId}`);
            if (statusResponse.ok) {
                const registeredComps = await statusResponse.json();
                registeredCompIds = new Set(registeredComps.map(r => r.comp_id));
            }
        }
        
        const response = await fetch(`/api/events/all?${query}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        eventListContainer.innerHTML = '';

        if (events.length === 0) {
            eventListContainer.innerHTML = '<p class="empty-message">No upcoming events found matching your filter criteria.</p>';
            return;
        }

        events.forEach(event => {
            if (event.competitions && event.competitions.length > 0) {
                eventListContainer.insertAdjacentHTML('beforeend', renderEventCard(event));
            }
        });
        
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.getAttribute('data-event-id');
                window.location.href = `event-details.html?eventId=${eventId}`;
            });
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        eventListContainer.innerHTML = `<p class="error-message">Could not load events: ${error.message}. Check the server connection.</p>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const deptFilter = document.getElementById('dept-filter');
    const typeFilter = document.getElementById('type-filter');
    
    if (deptFilter && typeFilter) {
        const applyFilters = () => {
            const department = deptFilter.value;
            const type = typeFilter.value;
            fetchAndRenderEvents(department, type);
        };
        
        deptFilter.addEventListener('change', applyFilters);
        typeFilter.addEventListener('change', applyFilters);
        
        applyFilters(); 
    } else {
        fetchAndRenderEvents('all', 'all');
    }

    const userName = sessionStorage.getItem('currentUserName') || "Student";
    const userYear = sessionStorage.getItem('currentUserYear');
    const welcomeMessage = document.getElementById('welcome-message');
    
    if (welcomeMessage) {
        const yearDisplay = userYear ? ` (${userYear}th Year)` : '';
        welcomeMessage.textContent = `Hello, ${userName}${yearDisplay}!`;
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            showAlert("You have been successfully logged out.", 'info'); // Replaced alert() with showAlert()
            
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 1000);
        });
    }
});