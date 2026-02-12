/**
 * DOCX generation using the 'docx' library (loaded via CDN as window.docx).
 * Applies the full formatting specification.
 */

import { LEVELS, BODY_STYLE, PAGE, COLOR_MAP } from "./config.js";

const {
    Document, Paragraph, TextRun, Packer, HeadingLevel,
    AlignmentType, convertInchesToTwip, SectionType,
    PageOrientation, WidthType, Header, Footer,
    Tab, TabStopPosition, TabStopType,
} = window.docx;

function hexToColor(hex) {
    return hex.replace("#", "");
}

function mmToTwip(mm) {
    return Math.round(mm * 56.7);
}

function ptToHalfPt(pt) {
    return pt * 2;
}

export async function buildDocx(classifiedBlocks) {
    const children = [];

    for (const block of classifiedBlocks) {
        if (block.level === "image") {
            children.push(createImagePlaceholder(block));
        } else if (block.level === "body") {
            children.push(createBodyParagraph(block));
        } else if (typeof block.level === "number") {
            children.push(createHeading(block, block.level));
        } else {
            children.push(createBodyParagraph(block));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        width: mmToTwip(PAGE.widthMm),
                        height: mmToTwip(PAGE.heightMm),
                        orientation: PageOrientation.PORTRAIT,
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

    const blob = await Packer.toBlob(doc);
    return blob;
}

function createHeading(block, level) {
    const spec = LEVELS[level] || BODY_STYLE;

    // Spacing before headings (compact)
    let spaceBefore, spaceAfter;
    if (level <= 1) {
        spaceBefore = 80;  // ~4pt in twips
        spaceAfter = 20;
    } else if (level === 2) {
        spaceBefore = 60;
        spaceAfter = 20;
    } else {
        spaceBefore = 40;
        spaceAfter = 0;
    }

    return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: spaceBefore, after: spaceAfter, line: 240 },
        children: [
            new TextRun({
                text: block.text || "",
                font: spec.font,
                size: ptToHalfPt(spec.sizePt),
                bold: spec.bold,
                color: hexToColor(spec.colorHex),
            }),
        ],
    });
}

function createBodyParagraph(block) {
    const segments = block.segments || [];
    const children = [];

    if (segments.length === 0) {
        children.push(new TextRun({
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
            const mappedColor = mapColor(seg.colorHex || "000000");
            const run = new TextRun({
                text: seg.text,
                font: BODY_STYLE.font,
                size: ptToHalfPt(BODY_STYLE.sizePt),
                bold: seg.isBold || false,
                italics: seg.isItalic || false,
                color: hexToColor(mappedColor),
                highlight: seg.highlight ? "yellow" : undefined,
            });
            children.push(run);
        }
    }

    return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: children,
    });
}

function createImagePlaceholder(block) {
    const idx = block.imageIndex || 0;
    const desc = block.description || `Image ${idx}`;
    const pos = block.position || "inline";
    const text = `[IMAGE ${idx} \u2013 ${desc} \u2013 position : ${pos}]`;

    return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 20, after: 20, line: 240 },
        children: [
            new TextRun({
                text: text,
                font: "Aptos",
                size: ptToHalfPt(9),
                italics: true,
                color: "808080",
            }),
        ],
    });
}

function mapColor(colorHex) {
    const upper = colorHex.toUpperCase().replace("#", "");
    return COLOR_MAP[upper] || upper;
}
