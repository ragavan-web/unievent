const DEFAULT_IMAGE = "https://placehold.co/800x300/5c6bc0/ffffff?text=Event+Banner";

const renderCompetitionCard = (comp, isEventClosed) => {
    const feeText = comp.payment_required ? `INR ${comp.registration_fee}` : 'Free';
    const teamSizeText = comp.team_min === comp.team_max ? 
        (comp.team_min === 1 ? 'Individual' : `Team of ${comp.team_min}`) : 
        `Team: ${comp.team_min} - ${comp.team_max}`;

    let buttonText = 'Register Now';
    let buttonClass = 'btn primary-btn register-comp-btn';
    let buttonDisabled = '';
    
    if (isEventClosed) {
        buttonText = 'Registration Closed';
        buttonClass = 'btn disabled-btn';
        buttonDisabled = 'disabled';
    } else {
        buttonDisabled = '';
    }

    return `
        <div class="competition-card-detail">
            <h4 class="comp-title">${comp.comp_name}</h4>
            <div class="comp-meta-row">
                <span><i class="fas fa-code"></i> Type: ${comp.comp_type}</span>
                <span><i class="fas fa-users"></i> ${teamSizeText}</span>
                <span><i class="fas fa-rupee-sign"></i> Fee: ${feeText}</span>
            </div>
            <p class="comp-description">${comp.comp_description || 'No description provided.'}</p>
            
            <div class="comp-contact-info">
                <p><i class="fas fa-user-tie"></i> Coordinator: ${comp.coordinator_phone}</p>
            </div>

            <button class="${buttonClass}" 
                    data-event-id="${comp.event_id}" 
                    data-comp-id="${comp.id}"
                    data-comp-name="${comp.comp_name}"
                    ${buttonDisabled}>
                ${buttonText}
            </button>
        </div>
    `;
};

const renderEventDetails = async (event) => {
    const isSimulated = event.photo_url && (event.photo_url.includes('simulated_base64_upload') || event.photo_url.includes('placeholder_upload'));
    const imageUrl = (event.photo_url && !isSimulated) ? event.photo_url : DEFAULT_IMAGE;
    
    const date = new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = `${event.start_time} - ${event.end_time}`;
    
    let html = `
        <div class="event-hero" style="background-image: url('${imageUrl}');">
            <div class="hero-overlay">
                <h1 class="event-title-detail">${event.title}</h1>
                <p class="event-meta-detail">${event.department} | ${event.type}</p>
            </div>
        </div>
        
        <div class="details-body">
            <div class="details-section">
                <h2>Event Overview</h2>
                <div class="details-grid">
                    <div>
                        <i class="fas fa-calendar-alt"></i> <strong>Date:</strong> ${date}
                    </div>
                    <div>
                        <i class="fas fa-clock"></i> <strong>Time:</strong> ${time}
                    </div>
                    <div>
                        <i class="fas fa-map-marker-alt"></i> <strong>Venue:</strong> ${event.venue}
                    </div>
                    <div>
                        <i class="fas fa-layer-group"></i> <strong>Max Comps per Student:</strong> ${event.max_comps_per_student}
                    </div>
                </div>
                <p class="event-description-long">${event.description}</p>
            </div>

            <div class="details-section">
                <h2>Competitions (${event.competitions.length})</h2>
                ${event.registration_closed === 1 ? '<p class="error-message">⚠️ Registration for this event is now closed.</p>' : ''}
                <div id="competition-details-list" class="competition-grid">
                    ${event.competitions.map(comp => renderCompetitionCard(comp, event.registration_closed === 1)).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('event-detail-area').innerHTML = html;

    if (event.registration_closed !== 1) {
        document.querySelectorAll('.register-comp-btn').forEach(button => {
            button.addEventListener('click', handleRegistrationConfirmation);
        });
    }
};

const showCustomConfirm = (message, onConfirm) => {
    // This function will need to be updated to use a custom confirmation modal
    // but for now, we'll keep the `confirm()` call as a placeholder.
    if (confirm(message)) {
        onConfirm();
    }
};

const handleRegistrationConfirmation = (e) => {
    const button = e.target;
    const compName = button.getAttribute('data-comp-name');
    
    const message = `Are you sure you want to register for: ${compName}?`;
    
    showCustomConfirm(message, () => {
        handleRegistration(e);
    });
};

const handleRegistration = async (e) => {
    const button = e.target;
    const eventId = button.getAttribute('data-event-id');
    const compId = button.getAttribute('data-comp-id');
    
    const userId = sessionStorage.getItem('currentUserId'); 

    if (!userId) {
        showAlert("Error: You must be logged in as a student to register.", 'error'); // Replaced alert()
        return;
    }
    
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
        const response = await fetch('/api/events/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId, comp_id: compId, user_id: userId }) 
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success'); // Replaced alert()
            button.textContent = 'Registered!';
            button.classList.add('disabled-success');
            button.disabled = true;
            
        } else {
            showAlert('Registration Failed: ' + (result.error || 'Unknown error.'), 'error'); // Replaced alert()
            button.textContent = 'Register Now';
            button.disabled = false;
        }
    } catch (error) {
        console.error('Registration network error:', error);
        showAlert('A network error occurred. Please check the server connection.', 'error'); // Replaced alert()
        button.textContent = 'Register Now';
        button.disabled = false;
    }
};

const fetchEventDetails = async (eventId) => {
    const eventDetailArea = document.getElementById('event-detail-area');
    eventDetailArea.innerHTML = `<p class="loading-message">Fetching event data for ID: ${eventId}...</p>`;

    try {
        const response = await fetch('/api/events/all'); 
        const allEvents = await response.json();
        
        const event = allEvents.find(e => e.id == eventId);

        if (event) {
            renderEventDetails(event);
        } else {
            eventDetailArea.innerHTML = '<p class="error-message">Error: Event not found.</p>';
        }

    } catch (error) {
        console.error('Error fetching event details:', error);
        eventDetailArea.innerHTML = `<p class="error-message">Could not load event details. Check server connection.</p>`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    
    if (eventId) {
        fetchEventDetails(eventId);
    } else {
        document.getElementById('event-detail-area').innerHTML = '<p class="error-message">Invalid URL: Missing Event ID.</p>';
    }
});