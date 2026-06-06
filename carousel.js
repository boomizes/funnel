// Carousel Controls & Slide Management
export function updateCarousel(activeIndex, totalCount) {
    const grid = document.getElementById('characters-grid');
    const indicator = document.getElementById('carousel-indicator');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (grid) {
        grid.style.transform = `translateX(-${activeIndex * 100}%)`;
    }

    // Update indicator (e.g., "1 / 4")
    if (indicator) {
        const current = totalCount > 0 ? activeIndex + 1 : 0;
        indicator.textContent = `${current} / ${totalCount}`;
    }

    // Enable/disable navigation buttons
    if (prevBtn) {
        prevBtn.disabled = activeIndex <= 0;
    }
    if (nextBtn) {
        nextBtn.disabled = activeIndex >= totalCount - 1;
    }
}

// Swipe Gesture Support
export function initSwipe(onSwipeLeft, onSwipeRight, getActiveIndex) {
    const viewport = document.querySelector('.carousel-viewport');
    if (!viewport) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    viewport.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isSwiping = true;
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const currentX = e.changedTouches[0].screenX;
        const diffX = currentX - touchStartX;
        
        const grid = document.getElementById('characters-grid');
        if (grid) {
            const activeIndex = getActiveIndex();
            grid.style.transition = 'none';
            grid.style.transform = `translateX(calc(-${activeIndex * 100}% + ${diffX}px))`;
        }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const threshold = 50;
        
        const grid = document.getElementById('characters-grid');
        if (grid) {
            grid.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        // Only register swipe if horizontal movement is dominant
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > threshold) {
                onSwipeRight(); // Swipe right -> show previous card
            } else if (diffX < -threshold) {
                onSwipeLeft(); // Swipe left -> show next card
            } else {
                updateCarousel(getActiveIndex(), document.querySelectorAll('.char-card').length);
            }
        } else {
            updateCarousel(getActiveIndex(), document.querySelectorAll('.char-card').length);
        }
    }, { passive: true });
}
