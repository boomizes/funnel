import { parseNameAndWeight, getProperties } from './parser.js';

/**
 * Rolls dice from string representation (e.g. "3d6", "1d4").
 */
function rollDice(diceStr) {
    const match = diceStr.trim().match(/^(\d+)d(\d+)$/);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    let sum = 0;
    for (let i = 0; i < num; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
    }
    return sum;
}

/**
 * Formats a modifier value with a leading sign.
 */
export function formatModifier(val) {
    return val >= 0 ? `+${val}` : `${val}`;
}

/**
 * Selects a child node using weight suffix (e.g. "^4").
 */
function selectWeightedChild(node) {
    const choices = [];
    const weights = [];
    let totalWeight = 0;
    for (let child of node.children) {
        const [_, weight] = parseNameAndWeight(child.text);
        choices.push(child);
        weights.push(weight);
        totalWeight += weight;
    }
    
    let r = Math.random() * totalWeight;
    for (let i = 0; i < choices.length; i++) {
        r -= weights[i];
        if (r <= 0) {
            return choices[i];
        }
    }
    return choices[choices.length - 1];
}

/**
 * Formats plurals by replacing {s} based on preceding counts.
 */
function formatPlurals(s) {
    while (s.includes("{s}")) {
        const idx = s.indexOf("{s}");
        const prefix = s.substring(0, idx);
        const numbers = prefix.match(/\d+/g);
        let replacement = "s";
        if (numbers && numbers.length > 0) {
            const lastNum = parseInt(numbers[numbers.length - 1], 10);
            if (lastNum === 1) {
                replacement = "";
            }
        }
        s = s.substring(0, idx) + replacement + s.substring(idx + 3);
    }
    return s;
}

/**
 * Evaluates curly brace choice options e.g. {a|b|c} or {2-4}.
 */
function evaluateBraces(s) {
    while (s.includes("{")) {
        const start = s.lastIndexOf("{");
        const end = s.indexOf("}", start);
        if (end === -1) break;
        const content = s.substring(start + 1, end).trim();

        let replacement = "";
        if (/^\d+-\d+$/.test(content)) {
            const parts = content.split("-").map(x => parseInt(x, 10));
            const low = parts[0];
            const high = parts[1];
            replacement = String(Math.floor(Math.random() * (high - low + 1)) + low);
        } else {
            const choices = content.split("|").map(c => c.trim());
            replacement = choices[Math.floor(Math.random() * choices.length)];
        }

        s = s.substring(0, start) + replacement + s.substring(end + 1);
    }
    return s;
}

/**
 * Recursively evaluates bracketed list references [...] inside string.
 */
function evaluateString(s, roots, context) {
    s = evaluateBraces(s);

    while (s.includes("[")) {
        const start = s.lastIndexOf("[");
        const end = s.indexOf("]", start);
        if (end === -1) break;
        const content = s.substring(start + 1, end).trim();

        let replacement = "";
        if (content.startsWith("dice(")) {
            const diceMatch = content.match(/["']?([^"']+)["']?/);
            if (diceMatch) {
                replacement = String(rollDice(diceMatch[1]));
            } else {
                replacement = "0";
            }
        } else if (content.includes("bonus = strbonus")) {
            replacement = formatModifier(context.strbonus);
        } else if (content.includes("atkbonus = Math.max")) {
            const atkBonus = Math.max(context.strbonus, context.dexbonus);
            replacement = formatModifier(atkBonus);
        } else if ([
            "strbonus",
            "dexbonus",
            "conbonus",
            "intbonus",
            "wisbonus",
            "chabonus"
        ].includes(content)) {
            replacement = formatModifier(context[content]);
        } else if (content.endsWith(".selectOne") || content.includes(".selectUnique(")) {
            const parts = content.split(".");
            const listName = parts[0];
            if (roots[listName]) {
                const listNode = roots[listName];
                if (content.includes("selectUnique(2)")) {
                    const items = listNode.children.map(c => c.text);
                    const shuffled = items.sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, 2);
                    const evalChoices = selected.map(c => evaluateString(c, roots, context));
                    replacement = evalChoices.join(", ");
                } else {
                    const choice = listNode.children[Math.floor(Math.random() * listNode.children.length)].text;
                    replacement = evaluateString(choice, roots, context);
                }
            } else {
                replacement = `MissingList:${listName}`;
            }
        } else if (roots[content]) {
            const node = roots[content];
            const props = getProperties(node);
            if (Object.keys(props).length > 0) {
                if (props.Damage) {
                    replacement = evaluateString(props.Damage, roots, context);
                } else if (props.Name) {
                    replacement = evaluateString(props.Name, roots, context);
                } else {
                    replacement = JSON.stringify(props);
                }
            } else {
                if (node.children.length > 0) {
                    const choice = node.children[Math.floor(Math.random() * node.children.length)].text;
                    replacement = evaluateString(choice, roots, context);
                } else {
                    replacement = node.text;
                }
            }
        } else {
            if (context[content] !== undefined) {
                replacement = String(context[content]);
            } else {
                replacement = `[${content}]`;
            }
        }

        s = s.substring(0, start) + replacement + s.substring(end + 1);
    }

    s = s.replace(/&mdash;/g, " — ");
    return s;
}

/**
 * Resolves starting weapon and its damage.
 */
function resolveWeapon(weaponExpr, roots, context) {
    const expr = weaponExpr.trim().replace(/^\[|\]$/g, "");
    let name = "";
    let damageExpr = "";

    if (expr.endsWith(".selectOne")) {
        const listName = expr.split(".")[0];
        const listNode = roots[listName];
        const selectedChild = listNode.children[Math.floor(Math.random() * listNode.children.length)];
        const props = getProperties(selectedChild);
        name = props.Name || selectedChild.text;
        damageExpr = props.Damage || "";
    } else {
        const weaponNode = roots[expr];
        if (weaponNode) {
            const props = getProperties(weaponNode);
            name = props.Name || weaponNode.text;
            damageExpr = props.Damage || "";
        } else {
            name = expr;
            damageExpr = "";
        }
    }

    const evaluatedName = evaluateString(name, roots, context);
    const evaluatedDamage = evaluateString(damageExpr, roots, context);

    return [evaluatedName, evaluatedDamage];
}

/**
 * Generates a random first name.
 */
function generateFirstName(roots) {
    const namesNode = roots.FirstName;
    return namesNode.children[Math.floor(Math.random() * namesNode.children.length)].text;
}

/**
 * Generates a random last name using LastNameComponent list.
 */
function generateLastName(roots) {
    const componentsNode = roots.LastNameComponent;
    const items = componentsNode.children.map(c => c.text);
    const shuffled = items.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);
    const fullName = selected.join("");
    return fullName.charAt(0).toUpperCase() + fullName.slice(1).toLowerCase();
}

/**
 * Generates a single DCC level 0 peasant character sheet data.
 */
export function generateCharacter(roots) {
    const stats = {
        str: rollDice("3d6"),
        dex: rollDice("3d6"),
        con: rollDice("3d6"),
        int: rollDice("3d6"),
        wis: rollDice("3d6"),
        cha: rollDice("3d6")
    };

    const context = {};
    for (let stat of ["str", "dex", "con", "int", "wis", "cha"]) {
        context[`${stat}bonus`] = Math.floor((stats[stat] - 10) / 2);
    }

    const raceNode = selectWeightedChild(roots.Race);
    const [raceName] = parseNameAndWeight(raceNode.text);
    const raceProps = getProperties(raceNode);
    const speed = raceProps.speed || "30";
    const langs = raceProps.langs || "Common";

    const profNode = selectWeightedChild(roots.Profession);
    const [profName] = parseNameAndWeight(profNode.text);
    const profProps = getProperties(profNode);
    const weaponExpr = profProps.Weapon || "";
    const itemExpr = profProps.Item || "";

    const [weaponName, weaponDamage] = resolveWeapon(weaponExpr, roots, context);
    let profItem = evaluateString(itemExpr, roots, context);

    const hp = Math.max(1, rollDice("1d4") + context.conbonus);
    const ac = 10 + context.dexbonus;
    const atkBonus = Math.max(context.strbonus, context.dexbonus);
    const coins = `${rollDice("5d12")} cp`;

    const randomItemsNode = roots.RandomItem;
    const itemsList = randomItemsNode.children.map(c => c.text);
    const shuffledItems = itemsList.sort(() => 0.5 - Math.random());
    const randomItemsSelected = shuffledItems.slice(0, 2);
    const evalRandomItems = randomItemsSelected.map(it => evaluateString(it, roots, context));

    const name = `${generateFirstName(roots)} ${generateLastName(roots)}`;

    const finalProfItem = formatPlurals(profItem);
    const finalRandomItems = evalRandomItems.map(it => formatPlurals(it));
    const finalWeaponName = formatPlurals(weaponName);

    return {
        name: name,
        race: raceName,
        profession: profName,
        stats: stats,
        modifiers: {
            str: context.strbonus,
            dex: context.dexbonus,
            con: context.conbonus,
            int: context.intbonus,
            wis: context.wisbonus,
            cha: context.chabonus
        },
        hp: hp,
        ac: ac,
        speed: /^\d+$/.test(speed) ? parseInt(speed, 10) : 30,
        languages: langs,
        coins: coins,
        attack_bonus: formatModifier(atkBonus),
        weapon: {
            name: finalWeaponName,
            damage: weaponDamage
        },
        inventory: [finalWeaponName, finalProfItem, ...finalRandomItems]
    };
}
