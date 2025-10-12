document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('registrants-table-body');
    const registrantCount = document.getElementById('registrant-count');
    const eventTitleDisplay = document.getElementById('event-title-display');
    const exportBtn = document.getElementById('export-btn');

    // Variable to hold the fetched registration data globally for export
    let currentRegistrants = [];

    // Get Event ID from URL
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    
    if (!eventId) {
        tableBody.innerHTML = '<tr><td colspan="7" class="error-row">Error: Missing Event ID in URL.</td></tr>';
        return;
    }

    // --- Core Export Function ---
    const exportToCsv = (data, filename, eventTitle) => {
        if (data.length === 0) {
            showAlert('No registration data available to export.', 'info');
            return;
        }

        // Define columns in the order we want them in the CSV
        const headers = [
            'Student Name', 'Reg No.', 'Department', 'Competition', 
            'Comp Type', 'Fee Status', 'Date Registered'
        ];
        
        // Map the JSON data to CSV format
        const csvRows = [];
        csvRows.push(headers.join(',')); // Add header row

        data.forEach(reg => {
            const feeStatus = reg.registration_fee > 0 ? `INR ${reg.registration_fee} (Fee applies)` : 'Free';
            const date = new Date(reg.registration_date).toLocaleDateString();

            const values = [
                reg.student_name,
                reg.regno,
                reg.student_dept,
                reg.comp_name,
                reg.comp_type,
                feeStatus,
                date
            ];
            // Escape commas/quotes in data if needed (basic escaping here)
            csvRows.push(values.map(v => `"${v}"`).join(','));
        });

        // Combine rows into a single string
        const csvString = csvRows.join('\n');
        
        // Trigger download using a Blob
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set filename (e.g., Techathlon_Registrations_20251012.csv)
        link.setAttribute('href', url);
        link.setAttribute('download', `${eventTitle.replace(/ /g, '_')}_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
        
        // Click the hidden link to start download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('Export successful! Your CSV file is downloading.', 'success');
    };
    // --- End Core Export Function ---

    // --- Data Fetching ---
    const fetchRegistrationData = async (id) => {
        try {
            // 1. Fetch Event Title 
            const eventResponse = await fetch('/api/events/all');
            const allEvents = await eventResponse.json();
            const event = allEvents.find(e => e.id == id);

            if (event) {
                eventTitleDisplay.textContent = event.title;
            } else {
                eventTitleDisplay.textContent = 'Event ID: ' + id;
            }

            // 2. Fetch Registrants
            const regResponse = await fetch(`/api/events/registrations/${id}`);
            
            if (!regResponse.ok) {
                const errorData = await regResponse.json();
                throw new Error(errorData.error || `Failed to fetch report (Status ${regResponse.status}).`);
            }
            
            const registrants = await regResponse.json();
            
            // CRITICAL: Store data for export before rendering
            currentRegistrants = registrants; 
            
            renderRegistrantsTable(registrants);

        } catch (error) {
            console.error('Error fetching report:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-row">Error: ${error.message}</td></tr>`;
        }
    };

    // --- Data Rendering ---
    const renderRegistrantsTable = (registrants) => {
        tableBody.innerHTML = '';
        registrantCount.textContent = registrants.length;

        if (registrants.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-row">No students have registered for this event yet.</td></tr>';
            return;
        }

        registrants.forEach(reg => {
            const feeStatus = reg.registration_fee > 0 ? `INR ${reg.registration_fee} (Paid)` : 'Free';
            const row = `
                <tr>
                    <td>${reg.student_name}</td>
                    <td>${reg.regno}</td>
                    <td>${reg.student_dept}</td>
                    <td>${reg.comp_name}</td>
                    <td>${reg.comp_type}</td>
                    <td>${feeStatus}</td>
                    <td>${new Date(reg.registration_date).toLocaleDateString()}</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // --- Export Button Listener ---
    exportBtn.addEventListener('click', () => {
        // Pass the stored data and title to the export function
        exportToCsv(currentRegistrants, 'Registrations', eventTitleDisplay.textContent);
    });
    
    // --- Run on Load ---
    fetchRegistrationData(eventId);
});
