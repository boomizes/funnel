import { parsePerchanceText, PerchanceNode } from './parser.js';
import { generateCharacter } from './generator.js';
import { showToast, showLoading, adjustViewportHeight } from './ui-utils.js';
import { initSwipe, updateCarousel } from './carousel.js';
import { downloadPDF } from './pdf-exporter.js';

// Mobile Viewport Height Hack
adjustViewportHeight();
window.addEventListener('resize', adjustViewportHeight);

// State Management
let charactersState = [];
try {
    const savedChars = localStorage.getItem('charactersState');
    if (savedChars) {
        charactersState = JSON.parse(savedChars);
    }
} catch (e) {
    console.error('Failed to parse charactersState from localStorage', e);
}

let excludeNameState = localStorage.getItem('excludeNameState') === 'true';
let menuBarHidden = localStorage.getItem('menuBarHidden') !== 'false';
let characterIndexToDelete = null;

let activeIndex = 0;
const savedActiveIndex = parseInt(localStorage.getItem('activeIndex'), 10);
if (!isNaN(savedActiveIndex) && charactersState.length > 0) {
    activeIndex = Math.max(0, Math.min(savedActiveIndex, charactersState.length - 1));
}

let currentView = localStorage.getItem('currentView') || 'initial';
if (charactersState.length === 0) {
    currentView = 'initial';
}

let parsedRoots = null;

// DOM Elements
const charCountInput = document.getElementById('char-count');
const charCountValBadge = document.getElementById('char-count-val');
const excludeNameCheckbox = document.getElementById('exclude-name');
const btnGenerate = document.getElementById('btn-generate');
const btnDownload = document.getElementById('btn-download');
const btnAddChar = document.getElementById('btn-add-char');
const btnBackToPanel = document.getElementById('btn-back-to-panel');
const menuBarHandle = document.getElementById('menu-bar-handle');
const charactersGrid = document.getElementById('characters-grid');
const carouselPrevBtn = document.getElementById('carousel-prev');
const carouselNextBtn = document.getElementById('carousel-next');
const carouselIndicator = document.getElementById('carousel-indicator');

// Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmCharPrefix = document.getElementById('confirm-char-prefix');
const confirmCharName = document.getElementById('confirm-char-name');
const btnModalConfirm = document.getElementById('btn-modal-confirm');
const btnModalCancel = document.getElementById('btn-modal-cancel');

// Save current application state to local storage
function saveAppState() {
    try {
        localStorage.setItem('charactersState', JSON.stringify(charactersState));
        localStorage.setItem('excludeNameState', excludeNameState);
        localStorage.setItem('activeIndex', activeIndex);
        localStorage.setItem('currentView', document.body.classList.contains('view-results') ? 'results' : 'initial');
    } catch (e) {
        console.error('Failed to save app state to localStorage', e);
    }
}

// Switch between initial setup view and character sheets view
function switchView(viewName) {
    if (viewName === 'initial') {
        document.body.classList.remove('view-results');
        document.body.classList.add('view-initial');
    } else if (viewName === 'results') {
        document.body.classList.remove('view-initial');
        document.body.classList.add('view-results');
    }
    saveAppState();
}

// Toggle menu bar visibility
function toggleMenuBar() {
    menuBarHidden = !menuBarHidden;
    localStorage.setItem('menuBarHidden', menuBarHidden);
    applyMenuBarState();
    
    if (menuBarHidden) {
        showToast('Control panel hidden.');
    } else {
        showToast('Control panel visible.');
    }
}

// Apply menu bar state to DOM
function applyMenuBarState() {
    const handleLabel = document.querySelector('#menu-bar-handle .handle-label');
    const handleEl = document.getElementById('menu-bar-handle');

    if (menuBarHidden) {
        document.body.classList.add('menu-hidden');
        if (handleLabel) handleLabel.textContent = 'Show Controls';
        if (handleEl) handleEl.title = 'Show controls';
    } else {
        document.body.classList.remove('menu-hidden');
        if (handleLabel) handleLabel.textContent = 'Hide Controls';
        if (handleEl) handleEl.title = 'Hide controls';
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Sync slider value
    charCountInput.addEventListener('input', (e) => {
        charCountValBadge.textContent = e.target.value;
    });

    // Sync checkbox on load
    excludeNameCheckbox.checked = excludeNameState;

    // Exclude name toggle visual update
    excludeNameCheckbox.addEventListener('change', (e) => {
        excludeNameState = e.target.checked;
        renderCharacters();
        saveAppState();
    });

    // Fetch and parse perchance lists and first names
    Promise.all([
        fetch('perchance_lists.txt').then(response => {
            if (!response.ok) throw new Error('Failed to load perchance_lists.txt');
            return response.text();
        }),
        fetch('first_names.txt').then(response => {
            if (!response.ok) throw new Error('Failed to load first_names.txt');
            return response.text();
        })
    ])
        .then(([perchanceText, namesText]) => {
            parsedRoots = parsePerchanceText(perchanceText);
            
            // Construct FirstName node manually from first_names.txt
            const firstNames = namesText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            const firstNameNode = new PerchanceNode("FirstName", 0);
            firstNameNode.children = firstNames.map(name => new PerchanceNode(name, 2));
            parsedRoots.FirstName = firstNameNode;

            console.log('Perchance lists and first names successfully loaded.');
        })
        .catch(err => {
            console.error(err);
            showToast('Failed to load character tables.', true);
        });

    // Generate characters handlers
    btnGenerate.addEventListener('click', () => fetchCharacters(parseInt(charCountInput.value)));

    // Back to setup panel handler
    if (btnBackToPanel) {
        btnBackToPanel.addEventListener('click', () => switchView('initial'));
    }

    // Download PDF handler
    btnDownload.addEventListener('click', () => downloadPDF(charactersState, excludeNameState));

    // Add character handler
    btnAddChar.addEventListener('click', addSingleCharacter);

    // Toggle menu bar handler
    if (menuBarHandle) {
        menuBarHandle.addEventListener('click', toggleMenuBar);
    }
    applyMenuBarState();

    // Modal action handlers
    if (btnModalConfirm) {
        btnModalConfirm.addEventListener('click', () => {
            if (characterIndexToDelete !== null) {
                const idx = characterIndexToDelete;
                const char = charactersState[idx];
                charactersState.splice(idx, 1);
                const deathMsgName = excludeNameState
                    ? `The ${char.race} ${char.profession}`
                    : char.name;
                showToast(`${deathMsgName} has met a tragic end.`);
                
                // Adjust activeIndex if it's out of bounds after deletion
                if (activeIndex >= charactersState.length) {
                    activeIndex = Math.max(0, charactersState.length - 1);
                }

                renderCharacters();
                saveAppState();
                
                // Close modal
                if (confirmModal) confirmModal.classList.remove('active');
                characterIndexToDelete = null;

                if (charactersState.length === 0) {
                    switchView('initial');
                }
            }
        });
    }

    if (btnModalCancel) {
        btnModalCancel.addEventListener('click', () => {
            if (confirmModal) confirmModal.classList.remove('active');
            characterIndexToDelete = null;
        });
    }

    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
                characterIndexToDelete = null;
            }
        });
    }

    // Carousel button handlers
    if (carouselPrevBtn) {
        carouselPrevBtn.addEventListener('click', () => {
            if (activeIndex > 0) {
                activeIndex--;
                updateCarousel(activeIndex, charactersState.length);
                saveAppState();
            }
        });
    }

    if (carouselNextBtn) {
        carouselNextBtn.addEventListener('click', () => {
            if (activeIndex < charactersState.length - 1) {
                activeIndex++;
                updateCarousel(activeIndex, charactersState.length);
                saveAppState();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('view-results') && charactersState.length > 0) {
            if (e.key === 'ArrowLeft' && activeIndex > 0) {
                activeIndex--;
                updateCarousel(activeIndex, charactersState.length);
                saveAppState();
            } else if (e.key === 'ArrowRight' && activeIndex < charactersState.length - 1) {
                activeIndex++;
                updateCarousel(activeIndex, charactersState.length);
                saveAppState();
            }
        }
    });

    // Touch support
    initSwipe(
        // Swipe left (advance to next)
        () => {
            if (activeIndex < charactersState.length - 1) {
                activeIndex++;
                saveAppState();
            }
            updateCarousel(activeIndex, charactersState.length);
        },
        // Swipe right (go to previous)
        () => {
            if (activeIndex > 0) {
                activeIndex--;
                saveAppState();
            }
            updateCarousel(activeIndex, charactersState.length);
        },
        // Get active index
        () => activeIndex
    );

    // Restore application view and render characters if state is present
    if (charactersState.length > 0) {
        renderCharacters();
        switchView(currentView);
    } else {
        switchView('initial');
    }
});

// Fetch Characters (Roll locally)
async function fetchCharacters(count) {
    if (!parsedRoots) {
        showToast('Character tables are still loading, please wait.', true);
        return;
    }
    try {
        showLoading(true);
        // Add a tiny delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 200));
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push(generateCharacter(parsedRoots));
        }
        charactersState = data;
        activeIndex = 0; // Start at the first character
        
        showToast(`Rolled ${count} zero-level peasants!`);
        renderCharacters();
        switchView('results');
        saveAppState();
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to roll characters', true);
    } finally {
        showLoading(false);
    }
}

// Add a single character to the end
async function addSingleCharacter() {
    if (!parsedRoots) {
        showToast('Character tables are not loaded yet.', true);
        return;
    }
    try {
        showLoading(true);
        await new Promise(resolve => setTimeout(resolve, 150));
        const char = generateCharacter(parsedRoots);
        charactersState.push(char);
        showToast(`Added ${char.name} to the group!`);
        activeIndex = charactersState.length - 1; // Slide to the newly added character
        renderCharacters();
        saveAppState();
    } catch (error) {
        console.error(error);
        showToast(error.message, true);
    } finally {
        showLoading(false);
    }
}

// Delete character from local list (opens confirmation modal)
function deleteCharacter(index) {
    characterIndexToDelete = index;
    const char = charactersState[index];
    if (confirmCharPrefix) {
        confirmCharPrefix.textContent = excludeNameState ? 'the ' : '';
    }
    if (confirmCharName) {
        confirmCharName.textContent = excludeNameState
            ? `${char.race} ${char.profession}`
            : char.name;
    }
    if (confirmModal) confirmModal.classList.add('active');
}

// Render Character Cards Grid
function renderCharacters() {
    charactersGrid.className = 'characters-grid';
    charactersGrid.innerHTML = '';

    if (btnDownload) {
        btnDownload.disabled = charactersState.length === 0;
    }

    if (charactersState.length === 0) {
        return;
    }

    charactersState.forEach((char, idx) => {
        const card = document.createElement('article');
        card.className = 'char-card';
        card.style.animationDelay = `${idx * 0.05}s`;

        // Card HTML build
        let inventoryHtml = char.inventory.map((item, itemIdx) => {
            let itemClass = '';
            if (itemIdx === 0) itemClass = 'class="weapon-item"';
            return `<li ${itemClass}>${item}</li>`;
        }).join('');
        
        // Add Starting Coins to inventory visually
        inventoryHtml += `<li class="coins-item"><span class="icon-svg icon-stroke"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity="0.2" /><line x1="12" y1="8" x2="12" y2="16" /></svg></span> ${char.coins}</li>`;

        const nameDisplay = excludeNameState 
            ? `<div class="card-title nameless-input">Name: ______________________</div>`
            : `<h3 class="card-title">${char.name}</h3>`;

        card.innerHTML = `
            <!-- Action buttons overlay -->
            <div class="card-actions-overlay">
                <button class="card-btn btn-delete" title="Mark this peasant as deceased" data-idx="${idx}"><span class="icon-svg icon-stroke"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 2.5 1.14 4.73 3 6.18V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.82c1.86-1.45 3-3.68 3-6.18 0-4.42-3.58-8-8-8z" /><circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" /><path d="M12 13v2" /><path d="M9 18h6" /><path d="M10 16v4" /><path d="M14 16v4" /></svg></span></button>
            </div>

            <header class="card-header">
                ${nameDisplay}
                <div class="card-subtitle">Level 0 ${char.race} ${char.profession}</div>
            </header>

            <section class="card-stats-grid">
                ${renderStatBox('str', 'str', char)}
                ${renderStatBox('dex', 'dex', char)}
                ${renderStatBox('con', 'con', char)}
                ${renderStatBox('int', 'int', char)}
                ${renderStatBox('wis', 'wis', char)}
                ${renderStatBox('cha', 'cha', char)}
            </section>

            <section class="card-vitals">
                <div class="vital-item" title="Hit Points (1d4 + Con Mod)">
                    <span class="vital-icon"><span class="icon-svg icon-fill"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></span></span>
                    <div class="vital-details">
                        <span class="vital-label">HP</span>
                        <span class="vital-value">${char.hp}</span>
                    </div>
                </div>
                <div class="vital-item" title="Armor Class (10 + Dex Mod)">
                    <span class="vital-icon"><span class="icon-svg icon-stroke"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></span></span>
                    <div class="vital-details">
                        <span class="vital-label">AC</span>
                        <span class="vital-value">${char.ac}</span>
                    </div>
                </div>
                <div class="vital-item" title="Speed in feet">
                    <span class="vital-icon"><span class="icon-svg icon-stroke"><svg viewBox="0 0 24 24"><path d="M7 4h3v9l8 2v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M5 14h5" /></svg></span></span>
                    <div class="vital-details">
                        <span class="vital-label">Speed</span>
                        <span class="vital-value">${char.speed} ft</span>
                    </div>
                </div>
            </section>

            <div class="card-body">
                <div class="body-section">
                    <div class="body-section-title">Combat & Weapon</div>
                    <div>
                        <span class="weapon-title">${char.weapon.name}</span>: 
                        <span class="weapon-dmg">${char.weapon.damage}</span> 
                        (Bonus: <strong>${char.attack_bonus}</strong>)
                    </div>
                </div>

                <div class="body-section">
                    <div class="body-section-title">Equipment & Inventory</div>
                    <ul class="inventory-list">
                        ${inventoryHtml}
                    </ul>
                </div>

                <div class="body-section meta-row">
                    <div><strong>Languages:</strong> ${char.languages}</div>
                </div>
            </div>
        `;

        // Add listeners for individual card actions
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCharacter(idx);
        });

        charactersGrid.appendChild(card);
    });

    updateCarousel(activeIndex, charactersState.length);
}

function renderStatBox(label, key, char) {
    const val = char.stats[key];
    const rawMod = char.modifiers[key];
    const modStr = rawMod >= 0 ? `+${rawMod}` : `${rawMod}`;
    return `
        <div class="stat-box" title="${key.toUpperCase()} score">
            <span class="stat-name">${label}</span>
            <span class="stat-score">${val}</span>
            <span class="stat-mod">${modStr}</span>
        </div>
    `;
}
