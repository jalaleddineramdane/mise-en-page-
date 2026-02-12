/**
 * Central configuration — all formatting constants.
 */
export const LEVELS = {
    0: { font: "Aptos", sizePt: 16, bold: true, colorHex: "E97031", label: "Subject Title" },
    1: { font: "Aptos", sizePt: 14, bold: true, colorHex: "EE0000", label: "Course Subtitle" },
    2: { font: "Aptos", sizePt: 12, bold: true, colorHex: "EE0000", label: "Main Part (Roman)" },
    3: { font: "Aptos", sizePt: 11, bold: true, colorHex: "00AF50", label: "Numbered Section" },
    4: { font: "Aptos", sizePt: 10, bold: true, colorHex: "006FC0", label: "Lettered Subsection" },
    5: { font: "Aptos", sizePt: 10, bold: true, colorHex: "E97031", label: "Table Header" },
    6: { font: "Aptos", sizePt: 10, bold: true, colorHex: "9F2B92", label: "Clinical Exam Label" },
};

export const BODY_STYLE = { font: "Aptos", sizePt: 10, bold: false, colorHex: "000000" };

export const PAGE = {
    widthMm: 210,
    heightMm: 297,
    marginLeftMm: 12.7,
    marginRightMm: 3.5,
    marginTopMm: 3.2,
    marginBottomMm: 19.4,
};

export const COLOR_MAP = {
    "00AF50": "00AF50",
    "008000": "00AF50",
    "EE0000": "EE0000",
    "FF0000": "EE0000",
    "006FC0": "006FC0",
    "0000FF": "006FC0",
    "E97031": "E97031",
    "FF8C00": "E97031",
    "9F2B92": "9F2B92",
    "800080": "9F2B92",
    "00AFEF": "00AFEF",
    "808080": "808080",
    "000000": "000000",
};
