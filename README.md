# D&D & DCC RPG Level-0 Character Funnel Generator

A beautiful, premium, client-side Single Page Application (SPA) for generating, curating, and exporting Level-0 characters for D&D 5e or DCC RPG (Dungeon Crawl Classics) funnel campaigns. 

Generate a band of zero-level peasants, curate their ranks as they face their tragic fates, and export them into print-ready, double-bordered character sheets.

---

## 🌟 Key Features

*   **Rule-Compliant Peasant Generation**: Rolls complete sets of attributes (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) using classic `3d6`, calculates modifiers, rolls random professions, starting weapon, damage values, languages, speeds, starting coins, and unique inventory items.
*   **Intuitive Character Curation**: 
    *   **Add Peasants**: Instantly add new random characters to your current pool.
    *   **Confirm Deaths**: Click the "X" button on any card to confirm a character's tragic end with a custom-themed confirm modal ("Peasant's Fate").
    *   **Exclude Names**: Toggle blank name fields so players can manually write in their names on printouts.
*   **Dynamic Responsive UI**:
    *   **Desktop Grid**: A structured multi-column card layout matching your viewport size.
    *   **Mobile Carousel**: A responsive swipeable slide layout with indicator and button/swipe navigation.
    *   **Interactive Control Panel**: Collapsible floating top control header triggered by clicking the bottom handle.
*   **Aesthetic Theme**: Curated RPG-medieval style utilizing Google Fonts (*Cinzel* & *Outfit*), CSS radial background glows, spinning D20 loading animation, and custom inline SVG icons for consistent cross-browser display.
*   **State Persistence**: Auto-saves active character lists, active card index, exclude-name toggle, and menu states to `localStorage` so your session persists across browser page reloads.
*   **High-Quality PDF Exports**: Uses `pdf-lib` to assemble characters into a 2x2 grid pattern on US Letter sheets, utilizing clean Helvetica font families, customized borders, and print-optimized lines.

---

## 📂 Project Structure

```
funnel/
├── css/
│   └── style.css             # Medieval CSS design tokens, custom animations, transitions, rules
├── js/
│   ├── app.js                # Core state controller, event handlers, and localStorage sync
│   ├── carousel.js           # Touch swiping controller for mobile slideshow
│   ├── generator.js          # Bracket evaluator, dice rolling, and attribute mapping logic
│   ├── parser.js             # Perchance tree parser for resolving weighted lists
│   ├── pdf-exporter.js       # Core PDF builder drawing on US Letter sheets
│   └── ui-utils.js           # Toast alerts, loading spin triggers, mobile viewport height fix
├── images/
│   ├── coin.png              # Coin status icon
│   ├── dice.png              # Dice icon for generation triggers
│   ├── heart.png             # HP vital icon
│   ├── pdf.png               # PDF export button icon
│   ├── shield.png            # AC vital icon
│   ├── skull.png             # Death modal/overlay icon
│   ├── speed.png             # Speed vital icon
│   ├── swords.png            # App header decorative icon
│   └── villager.png          # Add Peasant button icon
├── index.html            # Main UI layout, D20 loader, modal templates, CDN script loaders
├── perchance_lists.txt   # Custom RPG list database in Perchance text layout
├── README.md             # This document
└── AGENT.md              # AI Coding Assistant architectural reference document
```

---

## 🚀 How to Run Locally

Since this project is fully client-side and requires no build pipeline, it can be served using any standard static HTTP web server.

### Option 1: Python's Built-in Server
If you have Python installed, run this command in your terminal:
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your web browser.

### Option 2: Node.js/npm
If you prefer Node.js, serve the folder instantly with `npx`:
```bash
npx http-server -p 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your web browser.

### Option 3: Static Web Hosting
Deploy this repository directly to static platforms like **GitHub Pages**, **Vercel**, **Netlify**, or **Cloudflare Pages**. No build configurations or environment keys are needed.

---

## 🛠 Customizing Generator Tables

The generator parses character options from `perchance_lists.txt`. You can edit this file to add or modify professions, equipment, starting items, names, or races. The parser reads standard Perchance syntax structures:

*   **Weighted Choice Syntax**: Append `^weight` (e.g., `Human^4` or `Elf^1`) to balance races or professions.
*   **Bracketed Lists**: Use `[ListName]` to instruct the parser to recursively fetch a random choice from that table.
*   **Brace Options**: Use `{A|B|C}` to select randomly from inline lists, or `{3-18}` to draw from numeric ranges.
*   **Dice Roler**: Use `[dice("3d6")]` or similar strings to trigger custom dice calculations.
*   **Stats Modifiers**: Reference properties like `[strbonus]` to automatically insert calculated attribute modifiers.

---

## 📜 Credits and Licenses
*   Base tables and mechanics are adapted from the *Level-0 Character Tumbler OGL* guidelines.
*   Uses [pdf-lib](https://github.com/Hopding/pdf-lib) for client-side PDF document forging.
