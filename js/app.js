/**
 * Main application — handles upload, orchestrates pipeline, triggers download.
 */

import { extractPDF } from "./pdf-extractor.js";
import { extractPPTX } from "./pptx-extractor.js";
import { classify } from "./classifier.js";
import { buildDocx } from "./docx-builder.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Medical Doc Converter initialized");
    
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const fileInfo = document.getElementById("fileInfo");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const removeFileBtn = document.getElementById("removeFile");
    const convertBtn = document.getElementById("convertBtn");
    const progressContainer = document.getElementById("progressContainer");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const errorMsg = document.getElementById("errorMsg");

    let selectedFile = null;

    // Validate required elements exist
    if (!dropZone || !fileInput) {
        console.error("Required DOM elements not found");
        if (errorMsg) {
            errorMsg.textContent = "Erreur d'initialisation: éléments manquants";
            errorMsg.style.display = "block";
        }
        return;
    }

    dropZone.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Dropzone clicked, triggering file input");
        fileInput.click();
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
        console.log("File dropped, files:", e.dataTransfer.files.length);
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener("change", (e) => {
        console.log("File input changed, files:", fileInput.files.length);
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    removeFileBtn.addEventListener("click", () => {
        selectedFile = null;
        fileInput.value = "";
        fileInfo.style.display = "none";
        dropZone.style.display = "block";
        convertBtn.disabled = true;
        errorMsg.style.display = "none";
    });

    convertBtn.addEventListener("click", async () => {
        if (!selectedFile) return;
        await convert(selectedFile);
    });

    function handleFile(file) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["pdf", "pptx"].includes(ext)) {
            showError("Format non supporté. Utilisez PDF ou PPTX.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showError("Fichier trop volumineux (max 50 Mo).");
            return;
        }
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        fileInfo.style.display = "flex";
        dropZone.style.display = "none";
        convertBtn.disabled = false;
        errorMsg.style.display = "none";
    }

    async function convert(file) {
        console.log("Starting conversion for:", file.name);
        convertBtn.disabled = true;
        progressContainer.style.display = "block";
        errorMsg.style.display = "none";

        try {
            // Step 1: Read file
            updateProgress(20, "Lecture du fichier...");
            const arrayBuffer = await file.arrayBuffer();
            const ext = file.name.split(".").pop().toLowerCase();

            // Step 2: Extract
            updateProgress(40, "Extraction du contenu...");
            let blocks;
            if (ext === "pdf") {
                blocks = await extractPDF(arrayBuffer);
            } else {
                blocks = await extractPPTX(arrayBuffer);
            }

            if (!blocks || blocks.length === 0) {
                throw new Error("Aucun contenu extrait du fichier.");
            }

            // Step 3: Classify
            updateProgress(60, "Classification de la hiérarchie...");
            const classified = classify(blocks);

            // Step 4: Build DOCX
            updateProgress(80, "Génération du DOCX...");
            const blob = await buildDocx(classified);

            // Step 5: Download
            updateProgress(100, "Terminé !");
            const outputName = file.name.replace(/\.(pdf|pptx)$/i, "_formatted.docx");
            downloadBlob(blob, outputName);

            setTimeout(() => {
                progressContainer.style.display = "none";
                progressFill.style.width = "0%";
                convertBtn.disabled = false;
            }, 2000);

        } catch (err) {
            console.error(err);
            progressContainer.style.display = "none";
            showError("Erreur: " + err.message);
            convertBtn.disabled = false;
        }
    }

    function updateProgress(percent, text) {
        progressFill.style.width = percent + "%";
        progressText.textContent = text;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + " o";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
