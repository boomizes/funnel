import { formatModifier } from './generator.js';
import { showToast, showLoading } from './ui-utils.js';

// Draw and download PDF client-side using pdf-lib
export async function downloadPDF(charactersState, excludeNameState) {
    if (charactersState.length === 0) return;

    const PDFLib = window.PDFLib;
    if (!PDFLib) {
        showToast('PDF generator library (pdf-lib) is not loaded.', true);
        return;
    }

    // Open a blank window immediately to bypass browser pop-up blockers
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
        pdfWindow.document.write(`
            <html>
            <head>
                <title>Generating PDF...</title>
                <style>
                    body {
                        background-color: #09090b;
                        color: #e69a28;
                        font-family: 'Cinzel', serif, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .loading-container {
                        text-align: center;
                    }
                    .spinner {
                        width: 50px;
                        height: 50px;
                        margin: 0 auto 20px auto;
                        background: #e69a28;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        animation: rotate 2s infinite linear;
                    }
                    @keyframes rotate {
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Forging PDF character sheets... Please wait.</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        showLoading(true);
        showToast('Forging PDF character sheets...');

        // 1. Create a PDFDocument
        const pdfDoc = await PDFLib.PDFDocument.create();

        // 2. Embed Standard Fonts
        const fonts = {
            helveticaFont: await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica),
            helveticaBoldFont: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold),
            helveticaObliqueFont: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique),
            helveticaBoldObliqueFont: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique)
        };

        // Standard Colors
        const COLOR_BORDER = PDFLib.rgb(122/255, 32/255, 33/255);      // Hex #7A2021
        const COLOR_GOLD = PDFLib.rgb(230/255, 154/255, 40/255);      // Hex #E69A28
        const COLOR_BG_CARD = PDFLib.rgb(253/255, 251/255, 247/255);  // Hex #FDFBF7
        const COLOR_BG_STAT = PDFLib.rgb(245/255, 239/255, 230/255);  // Hex #F5EFE6
        const COLOR_TEXT_MAIN = PDFLib.rgb(26/255, 26/255, 26/255);    // Hex #1A1A1A
        const COLOR_TEXT_MUTED = PDFLib.rgb(85/255, 85/255, 85/255);   // Hex #555555
        const COLOR_LINE = PDFLib.rgb(211/255, 194/255, 176/255);      // Hex #D3C2B0

        // Page size standard letter: 612 x 792 points
        const pageW = 612;
        const pageH = 792;

        const marginX = 18.0;
        const marginY = 18.0;
        const gapX = 10.0;
        const gapY = 10.0;

        const cardW = (pageW - (2 * marginX) - gapX) / 2.0;  // 283 points
        const cardH = (pageH - (2 * marginY) - gapY) / 2.0;  // 373 points

        const numChars = charactersState.length;
        const numPages = Math.ceil(numChars / 4.0);

        // Define nested drawing helper functions
        function drawRoundedRect(page, x, y, w, h, r, fillColor, borderColor, borderWidth) {
            const path = `M ${r} 0 h ${w - 2*r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2*r} a ${r} ${r} 0 0 1 -${r} ${r} h -${w - 2*r} a ${r} ${r} 0 0 1 -${r} -${r} v -${h - 2*r} a ${r} ${r} 0 0 1 ${r} -${r} Z`;
            page.drawSvgPath(path, {
                x: x,
                y: y + h,
                color: fillColor,
                borderColor: borderColor,
                borderWidth: borderWidth
            });
        }

        function drawCharacterCard(page, x, y, width, height, char, excludeName) {
            // 1. Background (deep red border, warm parchment bg)
            drawRoundedRect(page, x, y, width, height, 8, COLOR_BG_CARD, COLOR_BORDER, 1.5);

            // Inner double border (gold)
            drawRoundedRect(page, x + 3, y + 3, width - 6, height - 6, 6, undefined, COLOR_GOLD, 0.5);

            // 2. Header (Name, Race, Profession)
            if (!excludeName) {
                page.drawText(char.name, {
                    x: x + 12,
                    y: y + height - 20,
                    size: 12,
                    font: fonts.helveticaBoldFont,
                    color: COLOR_TEXT_MAIN
                });
            }

            let headerSubtitle = `Lvl 0 ${char.race} ${char.profession}`;
            if (headerSubtitle.length > 42) {
                headerSubtitle = headerSubtitle.substring(0, 39) + "...";
            }
            page.drawText(headerSubtitle, {
                x: x + 12,
                y: y + height - 31,
                size: 8.5,
                font: fonts.helveticaBoldObliqueFont,
                color: COLOR_BORDER
            });

            // Decorative header separator
            page.drawLine({
                start: { x: x + 12, y: y + height - 37 },
                end: { x: x + width - 12, y: y + height - 37 },
                thickness: 1,
                color: COLOR_BORDER
            });

            // 3. Stats Block (6 boxes side by side)
            const statBoxW = 40.0;
            const statBoxH = 32.0;
            const statGap = (width - 24 - (6 * statBoxW)) / 5;
            const statNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

            for (let i = 0; i < statNames.length; i++) {
                const stat = statNames[i];
                const key = stat.toLowerCase();
                const score = char.stats[key];
                const mod = char.modifiers[key];
                const modStr = formatModifier(mod);

                const bx = x + 12 + i * (statBoxW + statGap);
                const by = y + height - 74;

                // Stat Box background and border
                drawRoundedRect(page, bx, by, statBoxW, statBoxH, 3, COLOR_BG_STAT, COLOR_LINE, 0.5);

                // Stat Label
                const labelWidth = fonts.helveticaBoldFont.widthOfTextAtSize(stat, 7);
                page.drawText(stat, {
                    x: bx + (statBoxW - labelWidth) / 2,
                    y: by + statBoxH - 10,
                    size: 7,
                    font: fonts.helveticaBoldFont,
                    color: COLOR_TEXT_MUTED
                });

                // Score
                const scoreStr = String(score);
                const scoreWidth = fonts.helveticaBoldFont.widthOfTextAtSize(scoreStr, 9);
                page.drawText(scoreStr, {
                    x: bx + (statBoxW - scoreWidth) / 2,
                    y: by + 13,
                    size: 9,
                    font: fonts.helveticaBoldFont,
                    color: COLOR_TEXT_MAIN
                });

                // Modifier
                const fullModStr = `(${modStr})`;
                const modWidth = fonts.helveticaFont.widthOfTextAtSize(fullModStr, 7.5);
                page.drawText(fullModStr, {
                    x: bx + (statBoxW - modWidth) / 2,
                    y: by + 4,
                    size: 7.5,
                    font: fonts.helveticaFont,
                    color: COLOR_TEXT_MAIN
                });
            }

            // Divider line
            page.drawLine({
                start: { x: x + 12, y: y + height - 80 },
                end: { x: x + width - 12, y: y + height - 80 },
                thickness: 0.5,
                color: COLOR_LINE
            });

            // 4. Vitals
            const vitalsY = y + height - 93;
            
            // AC
            page.drawText("AC:", { x: x + 15, y: vitalsY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(String(char.ac), { x: x + 35, y: vitalsY, size: 9, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MAIN });

            // HP
            page.drawText("HP:", { x: x + 60, y: vitalsY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(`${char.hp} / ${char.hp}`, { x: x + 80, y: vitalsY, size: 9, font: fonts.helveticaBoldFont, color: COLOR_BORDER });

            // Speed
            page.drawText("Speed:", { x: x + 115, y: vitalsY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(`${char.speed} ft.`, { x: x + 150, y: vitalsY, size: 8.5, font: fonts.helveticaFont, color: COLOR_TEXT_MAIN });

            // Attack Bonus
            page.drawText("Attack:", { x: x + 195, y: vitalsY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(char.attack_bonus, { x: x + 233, y: vitalsY, size: 8.5, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MAIN });

            // Line 2 of Vitals: Languages & Coins
            const vitalsY2 = y + height - 107;
            page.drawText("Coins:", { x: x + 15, y: vitalsY2, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(char.coins, { x: x + 50, y: vitalsY2, size: 8, font: fonts.helveticaFont, color: COLOR_TEXT_MAIN });

            page.drawText("Languages:", { x: x + 115, y: vitalsY2, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            let langs = char.languages;
            if (langs.length > 30) {
                langs = langs.substring(0, 27) + "...";
            }
            page.drawText(langs, { x: x + 172, y: vitalsY2, size: 7.5, font: fonts.helveticaObliqueFont, color: COLOR_TEXT_MAIN });

            // Divider line
            page.drawLine({
                start: { x: x + 12, y: y + height - 113 },
                end: { x: x + width - 12, y: y + height - 113 },
                thickness: 0.5,
                color: COLOR_LINE
            });

            // 5. Weapon and Attack details
            const weaponY = y + height - 125;
            page.drawText("Weapon:", { x: x + 15, y: weaponY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            let wName = char.weapon.name;
            if (wName.length > 32) {
                wName = wName.substring(0, 29) + "...";
            }
            page.drawText(wName, { x: x + 60, y: weaponY, size: 8.5, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MAIN });

            page.drawText("Damage:", { x: x + 15, y: weaponY - 12, size: 8, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
            page.drawText(char.weapon.damage, { x: x + 60, y: weaponY - 12, size: 8.5, font: fonts.helveticaBoldFont, color: COLOR_BORDER });

            // Divider line
            page.drawLine({
                start: { x: x + 12, y: y + height - 146 },
                end: { x: x + width - 12, y: y + height - 146 },
                thickness: 0.5,
                color: COLOR_LINE
            });

            // 6. Inventory Block
            const invTitleY = y + height - 156;
            page.drawText("STARTING INVENTORY", { x: x + 15, y: invTitleY, size: 8, font: fonts.helveticaBoldFont, color: COLOR_BORDER });

            const invStartY = y + height - 170;
            for (let idx = 0; idx < char.inventory.length; idx++) {
                if (idx >= 6) break; // limit to 6 items to avoid overflow
                const itemY = invStartY - (idx * 11);
                
                // Bullet point
                page.drawText("•", { x: x + 18, y: itemY, size: 9, font: fonts.helveticaBoldFont, color: COLOR_GOLD });
                
                let dispItem = char.inventory[idx];
                if (dispItem.length > 48) {
                    dispItem = dispItem.substring(0, 45) + "...";
                }
                page.drawText(dispItem, { x: x + 28, y: itemY, size: 8, font: fonts.helveticaFont, color: COLOR_TEXT_MAIN });
            }

            // 7. Coffin / Lethality Tracker (Footer Checkboxes)
            const footerY = y + 14;
            // Deceased checkbox
            page.drawRectangle({
                x: x + 15,
                y: footerY,
                width: 7,
                height: 7,
                borderColor: COLOR_TEXT_MUTED,
                borderWidth: 0.5
            });
            page.drawText("Deceased", { x: x + 26, y: footerY + 1, size: 7.5, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });

            // Survivor checkbox
            page.drawRectangle({
                x: x + 95,
                y: footerY,
                width: 7,
                height: 7,
                borderColor: COLOR_TEXT_MUTED,
                borderWidth: 0.5
            });
            page.drawText("Survivor (Level 1 Class: ___________________)", { x: x + 106, y: footerY + 1, size: 7.5, font: fonts.helveticaBoldFont, color: COLOR_TEXT_MUTED });
        }

        // Loop through characters in chunks of 4 (one page per chunk)
        for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
            const page = pdfDoc.addPage([pageW, pageH]);
            const startIdx = pageIdx * 4;
            const pageChars = charactersState.slice(startIdx, startIdx + 4);

            for (let i = 0; i < pageChars.length; i++) {
                const col = i % 2;
                const row = Math.floor(i / 2);

                const cx = marginX + col * (cardW + gapX);
                const cy = marginY + row * (cardH + gapY);

                drawCharacterCard(page, cx, cy, cardW, cardH, pageChars[i], excludeNameState);
            }

            // Add a page number / footer
            const footerText = `Page ${pageIdx + 1} of ${numPages} — Generated by Funnel Character Generator`;
            const footerWidth = fonts.helveticaFont.widthOfTextAtSize(footerText, 8);
            page.drawText(footerText, {
                x: (pageW - footerWidth) / 2,
                y: 8,
                size: 8,
                font: fonts.helveticaFont,
                color: COLOR_TEXT_MUTED
            });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);

        if (pdfWindow) {
            pdfWindow.location.href = url;
            showToast('PDF opened in a new window!');
        } else {
            // Fallback if window.open was blocked entirely
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to generate PDF', true);
        if (pdfWindow) {
            pdfWindow.close();
        }
    } finally {
        showLoading(false);
    }
}
