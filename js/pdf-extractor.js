/**
 * PDF extraction using PDF.js.
 * Extracts text items with font metadata (size, bold/italic, color).
 * Note: PDF.js doesn't expose text color natively, so we rely on font size + bold detection.
 */

export async function extractPDF(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const blocks = [];
    let imageCounter = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent({ includeMarkedContent: false });
        const operatorList = await page.getOperatorList();

        // Count images on this page
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
                operatorList.fnArray[i] === pdfjsLib.OPS.paintJpegXObject) {
                imageCounter++;
                blocks.push({
                    type: "image",
                    pageNum: pageNum,
                    imageIndex: imageCounter,
                    position: "right",
                    description: `Figure page ${pageNum}`,
                });
            }
        }

        // Group text items into lines based on Y position
        const lines = groupIntoLines(textContent.items, textContent.styles);

        for (const line of lines) {
            const segments = [];
            let lineText = "";

            for (const item of line.items) {
                if (!item.str.trim() && item.str !== " ") continue;

                const style = textContent.styles[item.fontName] || {};
                const fontFamily = style.fontFamily || item.fontName || "";
                const fontSize = Math.round(item.transform ? Math.abs(item.transform[0]) : (item.height || 10));
                const isBold = detectBold(fontFamily, item.fontName);
                const isItalic = detectItalic(fontFamily, item.fontName);

                segments.push({
                    text: item.str,
                    fontName: fontFamily,
                    fontSize: fontSize,
                    isBold: isBold,
                    isItalic: isItalic,
                    colorHex: "000000",
                });
                lineText += item.str;
            }

            if (!lineText.trim()) continue;

            const merged = mergeSegments(segments);
            const dominant = getDominant(merged);

            blocks.push({
                type: "text",
                text: lineText.trim(),
                segments: merged,
                fontName: dominant.fontName,
                fontSize: dominant.fontSize,
                isBold: dominant.isBold,
                isItalic: dominant.isItalic,
                colorHex: dominant.colorHex,
                pageNum: pageNum,
            });
        }
    }

    return blocks;
}

function groupIntoLines(items, styles) {
    if (!items.length) return [];

    // Sort by Y (descending = top first in PDF coords) then X
    const sorted = [...items].filter(i => i.str).sort((a, b) => {
        const ay = a.transform ? a.transform[5] : 0;
        const by = b.transform ? b.transform[5] : 0;
        if (Math.abs(ay - by) > 3) return by - ay; // group items within 3pt vertically
        const ax = a.transform ? a.transform[4] : 0;
        const bx = b.transform ? b.transform[4] : 0;
        return ax - bx;
    });

    const lines = [];
    let currentLine = { y: sorted[0].transform ? sorted[0].transform[5] : 0, items: [sorted[0]] };

    for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        const y = item.transform ? item.transform[5] : 0;
        if (Math.abs(y - currentLine.y) <= 3) {
            currentLine.items.push(item);
        } else {
            lines.push(currentLine);
            currentLine = { y: y, items: [item] };
        }
    }
    lines.push(currentLine);
    return lines;
}

function detectBold(fontFamily, fontName) {
    const combined = (fontFamily + " " + (fontName || "")).toLowerCase();
    return combined.includes("bold") || combined.includes("gras");
}

function detectItalic(fontFamily, fontName) {
    const combined = (fontFamily + " " + (fontName || "")).toLowerCase();
    return combined.includes("italic") || combined.includes("oblique");
}

function mergeSegments(segments) {
    if (!segments.length) return segments;
    const merged = [{ ...segments[0] }];
    for (let i = 1; i < segments.length; i++) {
        const prev = merged[merged.length - 1];
        const seg = segments[i];
        if (prev.fontSize === seg.fontSize && prev.isBold === seg.isBold &&
            prev.isItalic === seg.isItalic && prev.colorHex === seg.colorHex) {
            prev.text += seg.text;
        } else {
            merged.push({ ...seg });
        }
    }
    return merged;
}

function getDominant(segments) {
    if (!segments.length) return { fontName: "", fontSize: 10, isBold: false, isItalic: false, colorHex: "000000" };
    return segments.reduce((best, s) => s.text.length > best.text.length ? s : best, segments[0]);
}
