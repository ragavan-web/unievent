document.addEventListener('DOMContentLoaded', () => {
    const eventsTableBody = document.getElementById('events-table-body');
    const deptNameSpan = document.getElementById('organizer-dept-name');
    
    const ORGANIZER_DEPARTMENT = sessionStorage.getItem('organizerDeptName');
    const ORGANIZER_ID = sessionStorage.getItem('organizerUserId'); 
    
    if (!ORGANIZER_ID || !ORGANIZER_DEPARTMENT) {
        deptNameSpan.textContent = "Data Error";
        eventsTableBody.innerHTML = `<tr><td colspan="6" class="error-row">Authentication failed. Please log in again.</td></tr>`;
        return; 
    }
    
    if (deptNameSpan) {
        deptNameSpan.textContent = ORGANIZER_DEPARTMENT;
    }

    const fetchOrganizerEvents = async (department, organizerId) => {
        try {
            const response = await fetch(`/api/events/department/${encodeURIComponent(department)}/${organizerId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch events (Status ${response.status}).`);
            }
            
            const events = await response.json();
            renderEventsTable(events);

        } catch (error) {
            console.error('Error fetching organizer events:', error);
            eventsTableBody.innerHTML = `<tr><td colspan="6" class="error-row">Error loading data: ${error.message}</td></tr>`;
        }
    };

    const renderEventsTable = (events) => {
        eventsTableBody.innerHTML = ''; 

        if (events.length === 0) {
            eventsTableBody.innerHTML = '<tr><td colspan="6" class="empty-row">No events posted by this organizer yet.</td></tr>';
            return;
        }

        events.forEach(event => {
            const isClosed = event.registration_closed === 1;

            const row = `
                <tr>
                    <td>${event.title}</td>
                    <td>${event.date} (${event.start_time} - ${event.end_time})</td>
                    <td>${event.venue}</td>
                    <td>${event.totalComps}</td>
                    <td><span class="signups-badge">${event.totalRegistrations}</span></td>
                    <td>
                        <button class="btn primary-btn small-btn view-registrations-btn" data-event-id="${event.id}">
                            View Registrations
                        </button>
                        ${isClosed
                            ? `<span class="closed-badge">Closed</span>`
                            : `<button class="btn warning-btn small-btn close-btn" data-event-id="${event.id}">
                                Close Registration
                               </button>`}
                        <button class="btn danger-btn small-btn delete-btn" data-event-id="${event.id}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
            eventsTableBody.insertAdjacentHTML('beforeend', row);
        });

        document.querySelectorAll('.view-registrations-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.getAttribute('data-event-id');
                window.location.href = `registration-details.html?eventId=${eventId}`;
            });
        });

        document.querySelectorAll('.close-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.target.getAttribute('data-event-id');
                showConfirm("Are you sure you want to close registration for this event?", async () => {
                    try {
                        const res = await fetch(`/api/events/close/${eventId}`, { method: "POST" });
                        const data = await res.json();
                        showAlert(data.message, 'success');
                        fetchOrganizerEvents(ORGANIZER_DEPARTMENT, ORGANIZER_ID);
                    } catch (error) {
                        showAlert("Error closing registration.", 'error');
                        console.error("Error closing registration:", error);
                    }
                });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const eventId = e.target.getAttribute('data-event-id');
                showConfirm("Do you really want to delete this event? This action cannot be undone.", async () => {
                    try {
                        const res = await fetch(`/api/events/delete/${eventId}`, { method: "DELETE" });
                        const data = await res.json();
                        showAlert(data.message, 'success');
                        fetchOrganizerEvents(ORGANIZER_DEPARTMENT, ORGANIZER_ID);
                    } catch (error) {
                        showAlert("Error deleting event.", 'error');
                        console.error("Error deleting event:", error);
                    }
                });
            });
        });
    };

    fetchOrganizerEvents(ORGANIZER_DEPARTMENT, ORGANIZER_ID);
});