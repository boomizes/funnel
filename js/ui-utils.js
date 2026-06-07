// Mobile Viewport Height Hack
export function adjustViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Notifications (Toasts)
export function showToast(message, isError = false) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toastEl || !toastMsg) return;

    toastMsg.textContent = message;
    toastEl.className = 'toast';
    if (isError) toastEl.classList.add('error');
    
    // Smooth fade in
    toastEl.classList.remove('hidden');
    
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 4000);
}

// Helper: Show/Hide Loading Indicator
export function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;

    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}
