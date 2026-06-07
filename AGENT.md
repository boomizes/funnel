# Agent Developer Guide (AGENT.md)

This document serves as a developer guide and reference for AI coding agents modifying, refactoring, or extending this codebase. It outlines the project's architecture, state management, UI conventions, and common pitfalls.

---

## 1. Project Philosophy & Stack

This application is a **fully client-side Single Page Application (SPA)** that requires no server-side logic, database, or backend processing. It runs entirely in the user's browser and can be served statically.

*   **HTML**: Core structure, modal systems, and layout container templates.
*   **CSS**: Pure Vanilla CSS (`style.css`). **Do not introduce Tailwind CSS** or external UI frameworks unless explicitly requested by the user. Rely on CSS variables for thematic consistency.
*   **JS**: Modern modular ES6 JavaScript (`type="module"`). No bundlers, transpilers, or node build steps are used.
*   **External Libraries**:
    *   [pdf-lib](https://github.com/Hopding/pdf-lib) (loaded via CDN inside `index.html`) is used for generating print-ready PDFs.

---

## 2. File Directory Map

The codebase is organized as follows:

*   [`index.html`](file:///home/boomizes/code/funnel/index.html): Defines the DOM structure, including initial configuration panels, results grids, dialogs, spinners, and loads standard CDN scripts (like `pdf-lib`).
*   [`style.css`](file:///home/boomizes/code/funnel/style.css): Holds the design system, typography, keyframes, transitions, modal display logic, and theme configurations.
*   [`app.js`](file:///home/boomizes/code/funnel/app.js): Orchestrates app state, event binding, coordination between parser, generator, UI utilities, and local storage synchronization.
*   [`parser.js`](file:///home/boomizes/code/funnel/parser.js): Reads and parses `perchance_lists.txt` into an in-memory hierarchy tree of weighted nodes.
*   [`generator.js`](file:///home/boomizes/code/funnel/generator.js): Evaluates parsed Perchance trees, calculates attributes, modifiers, weapon data, and starting inventories.
*   [`carousel.js`](file:///home/boomizes/code/funnel/carousel.js): Implements touch/swipe gestures and slide animations for the mobile card view.
*   [`pdf-exporter.js`](file:///home/boomizes/code/funnel/pdf-exporter.js): Forges the print-friendly 2x2 PDF layout of character sheets.
*   [`ui-utils.js`](file:///home/boomizes/code/funnel/ui-utils.js): Exposes toast alerts, loading overlays, and mobile layout helper hacks.
*   [`perchance_lists.txt`](file:///home/boomizes/code/funnel/perchance_lists.txt): Custom raw data file containing tables, weights, D&D classes/professions, names, and equipment templates (excluding first names and last name components).
*   [`first_names.txt`](file:///home/boomizes/code/funnel/first_names.txt): Flattened text file containing a line-separated list of first names, loaded dynamically in `app.js`.
*   [`last_name_components.txt`](file:///home/boomizes/code/funnel/last_name_components.txt): Flattened text file containing a line-separated list of last name components, loaded dynamically in `app.js`.

---

## 3. Core Architecture Details

### A. Perchance Parsing & Dice Roller (`parser.js`, `generator.js`)
*   The data source `perchance_lists.txt` is based on the [Perchance.org](https://perchance.org) syntax, represented in tab-indented node trees.
*   `parser.js` builds trees where node weights are designated using `^weight` (e.g. `Human^4`).
*   `generator.js` implements a custom string parser that recursively evaluates bracketed lists `[...]`, braces choice selectors `{a|b|c}`, numeric ranges `{2-4}`, and calls the custom dice rolling engine (e.g., `dice("3d6")`).
*   The generator binds modifiers to standard D&D stats, referencing them as properties (like `[strbonus]`, `[dexbonus]`).

### B. State Management & Persistence (`app.js`)
*   App state is saved to `localStorage` under several keys:
    *   `charactersState`: JSON array of active level-0 characters.
    *   `excludeNameState`: Boolean indicating whether name field should be left blank.
    *   `activeIndex`: Current viewing index in the character list (primarily for mobile carousel).
    *   `currentView`: `'initial'` or `'results'`.
    *   `menuBarHidden`: Boolean controlling whether the floating control bar is collapsed.
*   When editing, adding, or deleting character entities, state is automatically saved, providing a persistent session across page reloads.

### C. PDF Generation Coordinates (`pdf-exporter.js`)
*   `pdf-lib` uses a **bottom-left coordinate origin (y=0 is the bottom of the page)**, unlike standard CSS or Canvas coordinate systems where y=0 is the top.
*   The export creates a 4-card layout on standard US Letter (612 x 792 pt).
*   Coordinates are mapped mathematically relative to `x` and `y` offsets of each grid quadrant. Ensure any manual shifts are added/subtracted correctly relative to the card's base coordinate.
*   The PDF generator immediately opens an empty target page (`window.open('', '_blank')`) prior to generation to prevent browser pop-up blockers from swallowing the final PDF render stream.

---

## 4. Coding Conventions & Best Practices

1.  **Icon Standardization**:
    *   Avoid raw emojis or external font-icon packages.
    *   **Always use inline SVG icons** formatted with `.icon-svg .icon-stroke` or `.icon-svg .icon-fill` to maintain identical cross-browser rendering, particularly across Chrome, Safari, and Firefox.
2.  **Responsive Layout**:
    *   Ensure all components adapt to viewport sizes.
    *   Use the custom property `--vh` from `ui-utils.js` (managed dynamically in `app.js` on window resize) rather than standard `100vh` to prevent jumping scrollbars and viewport clipping in Mobile Safari/Chrome.
3.  **Clean State Transitions**:
    *   When adding or removing classes to show modals, use CSS transitions (`opacity`, `transform`) rather than toggle commands to provide smooth user micro-animations.
    *   Always wrap file-system or state accesses in `try/catch` wrappers to handle environments with disabled cookies/storage.
4.  **No Placeholders**:
    *   Always verify lists generate complete stats and equipment descriptions. Avoid empty/stub blocks.

---

## 5. Maintenance Checklist for Future Runs

*   Verify all JS files keep standard ES6 import rules and relative paths (e.g. `import { foo } from './bar.js';`).
*   Check that `perchance_lists.txt` remains correctly tab-indented; standard space/tab mix-ups will break the recursive hierarchy parser.
*   When changing styling, update `style.css` in a way that preserves CSS variables for colors, transitions, and glow coordinates to keep themes uniform.
