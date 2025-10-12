document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('event-creation-form');
    const competitionList = document.getElementById('competition-list');
    const addCompetitionBtn = document.getElementById('add-competition-btn');
    const conflictMessage = document.getElementById('conflict-message');
    
    // CRITICAL FIX: Retrieve Organizer ID
    const organizerId = sessionStorage.getItem('organizerUserId');
    if (!organizerId) {
        // Use showAlert and redirect after seeing the message
        showAlert("Session expired or organizer not logged in. Redirecting to login.", 'error');
        setTimeout(() => {
            window.location.href = 'organizer-login-form.html';
        }, 1500);
        return;
    }
    
    let venueConflict = false; 
    let compCount = 0; 

    // --- Dynamic Competition Card Management (Unchanged) ---
    const generateCompetitionCard = (index) => {
        return `
            <div class="competition-card" data-comp-id="${index}">
                <div class="competition-header">
                    <h4>Competition #${index} Details</h4>
                    <button type="button" class="remove-comp-btn" data-remove-id="${index}" title="Remove Competition">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="input-group full-width">
                        <label for="comp_name_${index}"><i class="fas fa-trophy"></i> Competition Name</label>
                        <input type="text" id="comp_name_${index}" name="comp_name_${index}" required>
                    </div>
                    <div class="input-group full-width">
                        <label for="comp_description_${index}">Competition Description</label>
                        <textarea id="comp_description_${index}" name="comp_description_${index}" rows="3"></textarea>
                    </div>
                    
                    <div class="input-group">
                        <label for="comp_type_${index}">Competition Type</label>
                        <select id="comp_type_${index}" name="comp_type_${index}" required>
                            <option value="Technical">Technical</option>
                            <option value="Non-Technical">Non-Technical</option>
                        </select>
                    </div>
                    <!-- COORDINATOR PHONE -->
                    <div class="input-group">
                        <label for="coordinator_phone_${index}"><i class="fas fa-mobile-alt"></i> Coordinator Phone</label>
                        <input type="tel" id="coordinator_phone_${index}" name="coordinator_phone_${index}">
                    </div>

                    <div class="input-group">
                        <label for="team_min_${index}">Team Size (Min)</label>
                        <input type="number" id="team_min_${index}" name="team_min_${index}" value="1" min="1" required>
                    </div>
                    <div class="input-group">
                        <label for="team_max_${index}">Team Size (Max)</label>
                        <input type="number" id="team_max_${index}" name="team_max_${index}" value="1" min="1" required>
                        <small class="help-text">Set Min/Max to 1 for individual competitions.</small>
                    </div>
                    <div class="input-group">
                        <label for="payment_required_${index}">Payment Required?</label>
                        <select id="payment_required_${index}" name="payment_required_${index}">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="registration_fee_${index}">Registration Fee (INR)</label>
                        <input type="number" id="registration_fee_${index}" name="registration_fee_${index}" value="0" min="0">
                    </div>
                </div>
            </div>
        `;
    };

    const addCompetitionCard = () => {
        compCount++;
        competitionList.insertAdjacentHTML('beforeend', generateCompetitionCard(compCount));
        
        const removeBtn = competitionList.querySelector(`[data-remove-id="${compCount}"]`);
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                const card = e.target.closest('.competition-card');
                if (card) {
                    card.remove();
                }
            });
        }
    };
    
    addCompetitionCard(); 
    addCompetitionBtn.addEventListener('click', addCompetitionCard);

    // --- Conflict Check Logic (Unchanged) ---
    const updateConflictStatus = (hasConflict) => {
        venueConflict = hasConflict;
        if (hasConflict) {
            conflictMessage.classList.remove('hidden');
        } else {
            conflictMessage.classList.add('hidden');
        }
    };

    const checkVenueConflict = async () => {
        const date = document.getElementById('date').value;
        const venue = document.getElementById('venue').value;
        const start_time = document.getElementById('start_time').value;
        const end_time = document.getElementById('end_time').value;

        if (!date || !venue || !start_time || !end_time) {
            updateConflictStatus(false);
            return;
        }

        try {
            const response = await fetch('/api/events/check-conflict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, venue, start_time, end_time })
            });

            const result = await response.json();
            updateConflictStatus(result.isConflict);

        } catch (error) {
            console.error('Error during conflict check:', error);
            updateConflictStatus(false);
        }
    };

    const conflictInputs = ['date', 'venue', 'start_time', 'end_time'];
    conflictInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', checkVenueConflict); 
        }
    });

    // --- Form Submission Handler (CRITICAL UPDATE) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        await checkVenueConflict(); 

        if (venueConflict) {
            showAlert("Cannot submit: A venue conflict was detected. Please change the time or venue.", 'error'); // Custom Alert
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // --- 1. Competition Validation ---
        const competitions = [];
        const competitionCards = competitionList.querySelectorAll('.competition-card');

        let validationFailed = false;

        competitionCards.forEach(card => {
            const index = card.getAttribute('data-comp-id');
            const compName = formData.get(`comp_name_${index}`);
            
            if (compName && compName.trim() !== '') {
                const teamMin = parseInt(formData.get(`team_min_${index}`));
                const teamMax = parseInt(formData.get(`team_max_${index}`));

                if (teamMin > teamMax) {
                    showAlert(`Error in competition "${compName}": Minimum team size (${teamMin}) cannot be greater than maximum (${teamMax}).`, 'error'); // Custom Alert
                    validationFailed = true;
                    return; 
                }

                competitions.push({
                    comp_name: compName,
                    comp_description: formData.get(`comp_description_${index}`),
                    comp_type: formData.get(`comp_type_${index}`),
                    coordinator_phone: formData.get(`coordinator_phone_${index}`),
                    team_min: teamMin,
                    team_max: teamMax,
                    payment_required: formData.get(`payment_required_${index}`) === '1',
                    registration_fee: parseInt(formData.get(`registration_fee_${index}`), 10) || 0
                });
            }
        });
        
        if (validationFailed) {
            return;
        }
        
        if (competitions.length === 0) {
            showAlert('Please define at least one competition for this event.', 'error'); // Custom Alert
            return;
        }
        
        // --- 2. Assemble Final Payload ---
        const finalPayload = {
            // Main Event Data
            title: data.title,
            type: data.type,
            department: data.department,
            date: data.date,
            venue: data.venue,
            start_time: data.start_time,
            end_time: data.end_time,
            description: data.description,
            photo_url: data.photo_url || `simulated_file_upload_of_${data.photo_file}`,
            max_comps_per_student: parseInt(data.max_comps_per_student, 10),
            organizer_id: organizerId, // Add Organizer ID
            // Nested Competition Data
            competitions: competitions
        };

        // --- 3. Submit Event and Competitions to the Backend API ---
        try {
            const response = await fetch('/api/events/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });

            const result = await response.json();

            if (response.ok) {
                showAlert(result.message, 'success'); // Custom Alert
                form.reset();
                competitionList.innerHTML = '';
                addCompetitionCard();
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'organizer-dashboard.html';
                }, 1500);
            } else {
                showAlert(result.error || 'Failed to submit event.', 'error'); // Custom Alert
            }
        } catch (error) {
            if (error.message !== 'Validation failed.') {
                console.error('Event submission error:', error);
                showAlert('A network error occurred during submission.', 'error'); // Custom Alert
            }
        }
    });
    
    window.addCompetitionCard = addCompetitionCard;
});
