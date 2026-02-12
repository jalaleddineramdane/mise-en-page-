/**
 * DOCX generation using the 'docx' library (loaded via CDN as window.docx).
 * Applies the full formatting specification.
 */

import { LEVELS, BODY_STYLE, PAGE, COLOR_MAP } from "./config.js";

function hexToColor(hex) {
    return hex.replace("#", "");
}

function mmToTwip(mm) {
    return Math.round(mm * 56.7);
}

function ptToHalfPt(pt) {
    return pt * 2;
}

function mapColor(colorHex) {
    const upper = colorHex.toUpperCase().replace("#", "");
    return COLOR_MAP[upper] || upper;
}

function waitForDocxLibrary(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (window.docx) {
                clearInterval(checkInterval);
                resolve(window.docx);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error("La librairie docx n'a pas pu être chargée dans le délai imparti."));
            }
        }, 100);
    });
}

export async function buildDocx(classifiedBlocks) {
    const D = await waitForDocxLibrary();
    console.log("docx library loaded successfully");

    const children = [];

    for (const block of classifiedBlocks) {
        if (block.level === "image") {
            children.push(makeImagePlaceholder(D, block));
        } else if (block.level === "body") {
            children.push(makeBody(D, block));
        } else if (typeof block.level === "number") {
            children.push(makeHeading(D, block, block.level));
        } else {
            children.push(makeBody(D, block));
        }
    }

    const doc = new D.Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        width: mmToTwip(PAGE.widthMm),
                        height: mmToTwip(PAGE.heightMm),
                        orientation: D.PageOrientation.PORTRAIT,
                    },
                    margin: {
                        top: mmToTwip(PAGE.marginTopMm),
                        right: mmToTwip(PAGE.marginRightMm),
                        bottom: mmToTwip(PAGE.marginBottomMm),
                        left: mmToTwip(PAGE.marginLeftMm),
                    },
                },
            },
            children: children,
        }],
    });

    const blob = await D.Packer.toBlob(doc);
    return blob;
}

function makeHeading(D, block, level) {
    const spec = LEVELS[level] || BODY_STYLE;
    let spaceBefore, spaceAfter;
    if (level <= 1) { spaceBefore = 80; spaceAfter = 20; }
    else if (level === 2) { spaceBefore = 60; spaceAfter = 20; }
    else { spaceBefore = 40; spaceAfter = 0; }

    return new D.Paragraph({
        alignment: D.AlignmentType.LEFT,
        spacing: { before: spaceBefore, after: spaceAfter, line: 240 },
        children: [
            new D.TextRun({
                text: block.text || "",
                font: spec.font,
                size: ptToHalfPt(spec.sizePt),
                bold: spec.bold,
                color: hexToColor(spec.colorHex),
            }),
        ],
    });
}

function makeBody(D, block) {
    const segments = block.segments || [];
    const children = [];

    if (segments.length === 0) {
        children.push(new D.TextRun({
            text: block.text || "",
            font: BODY_STYLE.font,
            size: ptToHalfPt(BODY_STYLE.sizePt),
            bold: block.isBold || false,
            italics: block.isItalic || false,
            color: hexToColor(BODY_STYLE.colorHex),
        }));
    } else {
        for (const seg of segments) {
            if (!seg.text) continue;
            const mc = mapColor(seg.colorHex || "000000");
            children.push(new D.TextRun({
                text: seg.text,
                font: BODY_STYLE.font,
                size: ptToHalfPt(BODY_STYLE.sizePt),
                bold: seg.isBold || false,
                italics: seg.isItalic || false,
                color: hexToColor(mc),
                highlight: seg.highlight ? "yellow" : undefined,
            }));
        }
    }

    return new D.Paragraph({
        alignment: D.AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: children,
    });
}

function makeImagePlaceholder(D, block) {
    const idx = block.imageIndex || 0;
    const desc = block.description || `Image ${idx}`;
    const pos = block.position || "inline";
    const text = `[IMAGE ${idx} \u2013 ${desc} \u2013 position : ${pos}]`;

    return new D.Paragraph({
        alignment: D.AlignmentType.LEFT,
        spacing: { before: 20, after: 20, line: 240 },
        children: [
            new D.TextRun({
                text: text,
                font: "Aptos",
                size: ptToHalfPt(9),
                italics: true,
                color: "808080",
            }),
        ],
    });
}
