const showAlert = (message, type = 'success') => {
    const modal = document.getElementById('app-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const iconEl = document.getElementById('modal-icon');
    
    if (!modal || !messageEl) {
        console.warn("Custom modal structure missing. Falling back to native alert.");
        alert(message);
        return;
    }

    document.body.style.overflow = 'hidden';
    document.body.style.display = 'block';

    let iconClass = '';
    if (type === 'error') {
        titleEl.textContent = 'Error!';
        modal.className = 'app-modal error-modal';
        iconClass = 'fas fa-times-circle';
    } else if (type === 'info') {
        titleEl.textContent = 'Information';
        modal.className = 'app-modal info-modal';
        iconClass = 'fas fa-info-circle';
    } else {
        titleEl.textContent = 'Success!';
        modal.className = 'app-modal success-modal';
        iconClass = 'fas fa-check-circle';
    }
    
    iconEl.className = iconClass;
    messageEl.textContent = message;
    modal.style.display = 'flex';
};

const hideAlert = () => {
    const modal = document.getElementById('app-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.style.display = ''; 
    }
};

const showConfirm = (message, onConfirmCallback, onCancelCallback = () => {}) => {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    if (!modal || !messageEl || !okBtn || !cancelBtn) {
        console.warn("Custom confirmation modal structure missing. Falling back to native confirm.");
        if (window.confirm(message)) {
            onConfirmCallback();
        } else {
            onCancelCallback();
        }
        return;
    }

    document.body.style.overflow = 'hidden';
    document.body.style.display = 'block';

    messageEl.textContent = message;
    modal.style.display = 'flex';

    // Clear previous event listeners to prevent multiple callbacks
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    
    okBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.style.display = '';
        onConfirmCallback();
    };
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.style.display = '';
        onCancelCallback();
    };
};

window.showAlert = showAlert;
window.hideAlert = hideAlert;
window.showConfirm = showConfirm;