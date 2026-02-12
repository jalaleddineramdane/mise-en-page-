/**
 * PPTX extraction using JSZip.
 * PPTX files are ZIP archives containing XML slides.
 */

export async function extractPPTX(arrayBuffer) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const blocks = [];
    let imageCounter = 0;

    // Find all slide XML files
    const slideFiles = Object.keys(zip.files)
        .filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)[1]);
            const numB = parseInt(b.match(/slide(\d+)/)[1]);
            return numA - numB;
        });

    for (let slideIdx = 0; slideIdx < slideFiles.length; slideIdx++) {
        const slideNum = slideIdx + 1;
        const xmlStr = await zip.file(slideFiles[slideIdx]).async("string");
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, "application/xml");

        // Get all shape trees
        const spTree = doc.getElementsByTagName("p:spTree")[0];
        if (!spTree) continue;

        // Process shapes
        const shapes = spTree.children;
        for (const shape of shapes) {
            // Check for images (p:pic elements)
            if (shape.tagName === "p:pic" || shape.getElementsByTagName("p:pic").length > 0) {
                imageCounter++;
                blocks.push({
                    type: "image",
                    pageNum: slideNum,
                    imageIndex: imageCounter,
                    position: "right",
                    description: `Figure slide ${slideNum}`,
                });
                continue;
            }

            // Check for text body
            const txBodies = shape.getElementsByTagName("p:txBody");
            if (txBodies.length === 0) continue;

            for (const txBody of txBodies) {
                const paragraphs = txBody.getElementsByTagName("a:p");

                for (const para of paragraphs) {
                    const runs = para.getElementsByTagName("a:r");
                    if (runs.length === 0) continue;

                    const segments = [];
                    let fullText = "";

                    for (const run of runs) {
                        const textEl = run.getElementsByTagName("a:t")[0];
                        if (!textEl) continue;
                        const text = textEl.textContent || "";
                        if (!text) continue;

                        const rPr = run.getElementsByTagName("a:rPr")[0];
                        const fontSize = extractFontSize(rPr, para);
                        const isBold = extractBold(rPr, para);
                        const isItalic = extractItalic(rPr, para);
                        const colorHex = extractColor(rPr, para);
                        const fontName = extractFontName(rPr) || "Aptos";

                        segments.push({
                            text,
                            fontName,
                            fontSize,
                            isBold,
                            isItalic,
                            colorHex,
                        });
                        fullText += text;
                    }

                    if (!fullText.trim()) continue;

                    const merged = mergeSegments(segments);
                    const dominant = getDominant(merged);

                    blocks.push({
                        type: "text",
                        text: fullText.trim(),
                        segments: merged,
                        fontName: dominant.fontName,
                        fontSize: dominant.fontSize,
                        isBold: dominant.isBold,
                        isItalic: dominant.isItalic,
                        colorHex: dominant.colorHex,
                        pageNum: slideNum,
                    });
                }
            }
        }
    }

    return blocks;
}

function extractFontSize(rPr, para) {
    // Font size in OOXML is in hundredths of a point
    if (rPr) {
        const sz = rPr.getAttribute("sz");
        if (sz) return Math.round(parseInt(sz) / 100);
    }
    // Check paragraph-level default
    const pPr = para.getElementsByTagName("a:pPr")[0];
    if (pPr) {
        const defRPr = pPr.getElementsByTagName("a:defRPr")[0];
        if (defRPr) {
            const sz = defRPr.getAttribute("sz");
            if (sz) return Math.round(parseInt(sz) / 100);
        }
    }
    return 18; // Default slide text size
}

function extractBold(rPr, para) {
    if (rPr) {
        const b = rPr.getAttribute("b");
        if (b !== null) return b === "1" || b === "true";
    }
    const pPr = para.getElementsByTagName("a:pPr")[0];
    if (pPr) {
        const defRPr = pPr.getElementsByTagName("a:defRPr")[0];
        if (defRPr) {
            const b = defRPr.getAttribute("b");
            if (b !== null) return b === "1" || b === "true";
        }
    }
    return false;
}

function extractItalic(rPr, para) {
    if (rPr) {
        const i = rPr.getAttribute("i");
        if (i !== null) return i === "1" || i === "true";
    }
    return false;
}

function extractColor(rPr, para) {
    if (rPr) {
        // Solid fill color
        const solidFill = rPr.getElementsByTagName("a:solidFill")[0];
        if (solidFill) {
            const srgbClr = solidFill.getElementsByTagName("a:srgbClr")[0];
            if (srgbClr) {
                return srgbClr.getAttribute("val") || "000000";
            }
        }
    }
    return "000000";
}

function extractFontName(rPr) {
    if (rPr) {
        const latin = rPr.getElementsByTagName("a:latin")[0];
        if (latin) return latin.getAttribute("typeface");
    }
    return null;
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
    if (!segments.length) return { fontName: "", fontSize: 18, isBold: false, isItalic: false, colorHex: "000000" };
    return segments.reduce((best, s) => s.text.length > best.text.length ? s : best, segments[0]);
}
