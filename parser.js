export class PerchanceNode {
    constructor(text, indent) {
        this.text = text;
        this.indent = indent;
        this.children = [];
    }
}

/**
 * Parses perchance list text and returns a dictionary of root nodes.
 */
export function parsePerchanceText(text) {
    const roots = {};
    const stack = [];
    
    const lines = text.split(/\r?\n/);
    for (let line of lines) {
        const lineRaw = line.trimEnd();
        if (!lineRaw.trim()) {
            continue;
        }

        // Skip comments starting with //
        if (lineRaw.trim().startsWith("//")) {
            continue;
        }

        const indent = lineRaw.length - lineRaw.trimStart().length;
        const nodeText = lineRaw.trim();

        const node = new PerchanceNode(nodeText, indent);

        // Pop elements from stack until we find the parent (which has less indent)
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        if (stack.length > 0) {
            stack[stack.length - 1].children.push(node);
        } else {
            // Root level node (e.g. Profession, Race)
            const nameMatch = nodeText.split(/[=\^]/)[0].trim();
            roots[nameMatch] = node;
        }

        stack.push(node);
    }

    return roots;
}

/**
 * Extracts key-value properties (e.g. speed = 30) from child nodes.
 */
export function getProperties(node) {
    const props = {};
    for (let child of node.children) {
        if (child.text.includes("=")) {
            const parts = child.text.split("=");
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim();
            props[key] = value;
        }
    }
    return props;
}

/**
 * Parses weight suffixes (e.g. "Human^4") into [name, weight].
 */
export function parseNameAndWeight(text) {
    if (text.includes("^")) {
        const parts = text.split("^");
        const name = parts[0].trim();
        const weight = parseFloat(parts[1].trim());
        if (!isNaN(weight)) {
            return [name, weight];
        }
    }
    return [text.trim(), 1.0];
}
