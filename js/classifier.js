/**
 * Rule-based hierarchy classifier.
 * Assigns levels 0-6 or "body" to each text block.
 */

const ROMAN = /^(I{1,3}|IV|VI{0,3}|IX|X{0,3}I{0,3}|X{0,3}V?I{0,3})\s*[\.:\-–]\s*/i;
const NUMBERED = /^\d+[\.\)\-]\s+/;
const LETTERED = /^[a-z][\.\)\-]\s+/i;

const CLINICAL_KW = [
    "examen clinique", "examen neurologique", "examen physique",
    "inspection", "palpation", "auscultation", "percussion",
    "signes fonctionnels", "signes physiques", "signes généraux",
    "subjectifs", "objectifs", "interrogatoire",
    "l'examen neurologique", "l'examen clinique",
];

const TABLE_KW = [
    "classification", "tableau", "stade", "grade", "type",
    "causes", "étiologies", "diagnostic différentiel",
    "formes cliniques", "complications",
];

export function classify(blocks) {
    const textBlocks = blocks.filter(b => b.type === "text");

    // Find body text size (most frequent font size)
    const sizeCounts = {};
    for (const b of textBlocks) {
        const s = b.fontSize || 10;
        sizeCounts[s] = (sizeCounts[s] || 0) + 1;
    }
    let bodySize = 10;
    let maxCount = 0;
    for (const [size, count] of Object.entries(sizeCounts)) {
        if (count > maxCount) {
            maxCount = count;
            bodySize = parseFloat(size);
        }
    }

    for (const block of blocks) {
        if (block.type === "image") {
            block.level = "image";
            continue;
        }

        block.level = classifyBlock(block, bodySize);
    }

    return blocks;
}

function classifyBlock(block, bodySize) {
    const text = (block.text || "").trim();
    const fontSize = block.fontSize || 10;
    const isBold = block.isBold || false;
    const colorHex = (block.colorHex || "000000").toUpperCase();
    const sizeDiff = fontSize - bodySize;
    const isShort = text.length < 80;
    const textLower = text.toLowerCase();

    const hasRoman = ROMAN.test(text);
    const hasNumber = NUMBERED.test(text);
    const hasLetter = LETTERED.test(text);
    const isClinical = CLINICAL_KW.some(kw => textLower.includes(kw));
    const isTableHeader = TABLE_KW.some(kw => textLower.includes(kw));

    // Level 0: Very large bold short text
    if (sizeDiff >= 5 && isBold && isShort) return 0;

    // Level 1: Large bold
    if (sizeDiff >= 3 && isBold && isShort) return 1;

    // Level 2: Roman numerals or medium-large
    if (hasRoman && isBold) return 2;
    if (sizeDiff >= 1.5 && isBold && isShort) return 2;

    // Level 3: Numbered sections
    if (hasNumber && isBold && isShort) return 3;

    // Level 6: Clinical exam labels
    if (isClinical && isBold && isShort) return 6;

    // Level 4: Lettered subsections
    if (hasLetter && isBold && isShort) return 4;

    // Level 5: Table headers
    if (isTableHeader && isBold && isShort) return 5;

    // Color-based fallback for bold short text
    if (isBold && isShort && sizeDiff >= 0) {
        if (colorHex === "00AF50") return 3;
        if (colorHex === "006FC0") return 4;
        if (colorHex === "E97031") return 5;
        if (colorHex === "9F2B92") return 6;
        if (colorHex === "EE0000" || colorHex === "FF0000") return sizeDiff >= 1 ? 2 : 3;
    }

    return "body";
}
