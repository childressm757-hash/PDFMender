const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
const upload = multer({ dest: "tmp/" });

/* -----------------------------
   STATIC FILES (CRITICAL)
----------------------------- */
app.use(express.static(path.join(__dirname, "public")));

/* -----------------------------
   HELPERS
----------------------------- */
function safeUnlink(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
}

function readPdfAsLatin1(filePath) {
  const buf = fs.readFileSync(filePath);
  return buf.toString("latin1");
}

function includesAny(hay, needles) {
  return needles.some(n => hay.includes(n));
}

function basicDetect(fileText) {
  const findings = {
    hasAcroForm: fileText.includes("/AcroForm"),
    hasXFA: fileText.includes("/XFA"),
    hasWidget: includesAny(fileText, ["/Subtype/Widget", "/Subtype /Widget", "/Widget"]),
    hasEncrypt: fileText.includes("/Encrypt"),
    hasJavaScript: includesAny(fileText, ["/JavaScript", "/JS", "/S/JavaScript", "/S /JavaScript"]),
    hasEmbeddedFiles: includesAny(fileText, ["/EmbeddedFiles", "/Filespec", "/FileSpec"]),
    pdfVersion: null
  };

  // quick version sniff: first line is typically %PDF-1.7
  const firstLine = fileText.slice(0, 20);
  const match = firstLine.match(/%PDF-(\d\.\d)/);
  if (match) findings.pdfVersion = match[1];

  return findings;
}

function buildDetectedArray(findings) {
  const detected = [];

  if (findings.hasAcroForm || findings.hasXFA || findings.hasWidget) {
    detected.push({
      issue: "Interactive form elements detected (AcroForm/XFA/Widget annotations)",
      risk: "Filing systems (including CM/ECF and many state eFile portals) may reject interactive PDFs. Convert to a static PDF (flatten)."
    });
  }

  if (findings.hasEncrypt) {
    detected.push({
      issue: "Encryption / security marker detected",
      risk: "Encrypted or restricted PDFs may be rejected or blocked by filing systems. Remove restrictions or output a clean static PDF."
    });
  }

  if (findings.hasJavaScript) {
    detected.push({
      issue: "Active content (JavaScript) marker detected",
      risk: "Active content may trigger security rejection. Courts often require static PDFs with no scripts."
    });
  }

  if (findings.hasEmbeddedFiles) {
    detected.push({
      issue: "Embedded attachments marker detected",
      risk: "Embedded files/attachments may be rejected by filing systems. Remove attachments or output a clean static PDF."
    });
  }

  if (findings.pdfVersion) {
    detected.push({
      issue: `PDF version detected: ${findings.pdfVersion}`,
      risk: "Some portals are picky about PDF structure/version. A normalized output can reduce processing failures."
    });
  } else {
    detected.push({
      issue: "PDF version could not be determined",
      risk: "A normalized output can reduce processing failures in strict filing systems."
    });
  }

  return detected;
}

/**
 * Optional deep check:
 * - If qpdf exists, we can read encryption/permissions details.
 * - If pdffonts exists, we can check for non-embedded fonts.
 * These tools may not exist on Render. If they do not, we gracefully skip.
 */
function tryQpdfShowEncryption(inputPath) {
  return new Promise((resolve) => {
    execFile("qpdf", ["--show-encryption", inputPath], { timeout: 12000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.toString("utf8"));
    });
  });
}

function tryPdfFonts(inputPath) {
  return new Promise((resolve) => {
    execFile("pdffonts", [inputPath], { timeout: 12000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.toString("utf8"));
    });
  });
}

function parseQpdfEncryption(stdout) {
  // qpdf output varies; we just detect flags that matter
  // Example lines may include: "R = 3", "P = -44", "user password = none", "extract for accessibility = allowed", etc.
  const text = (stdout || "").toLowerCase();
  const info = {
    qpdfFound: !!stdout,
    encrypted: text.includes("encryption") && !text.includes("no encryption") ? true : null,
    hasPassword: text.includes("user password") && !text.includes("none"),
    hasRestrictions: text.includes("extract") || text.includes("modify") || text.includes("print")
  };
  return info;
}

function parsePdffonts(stdout) {
  // pdffonts output has a table; we look for "emb" column being "no"
  // We'll do a simple heuristic.
  const lines = (stdout || "").split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return { pdffontsFound: !!stdout, hasUnembeddedFonts: null };

  // find header line with "emb"
  const headerIdx = lines.findIndex(l => l.toLowerCase().includes("emb"));
  if (headerIdx === -1) return { pdffontsFound: true, hasUnembeddedFonts: null };

  // scan remaining rows for "no" in emb-ish column; heuristic: if row contains " no " or endswith "no"
  let unembedded = false;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = " " + lines[i].toLowerCase() + " ";
    if (row.includes(" no ") || row.endsWith(" no")) {
      unembedded = true;
      break;
    }
  }
  return { pdffontsFound: true, hasUnembeddedFonts: unembedded };
}

/**
 * Ghostscript normalize/flatten:
 * - Produces a new PDF that is typically static.
 * - Adds font embedding flags to strengthen court-compatibility.
 */
function ghostscriptNormalize(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      "gs",
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.7",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",

        // Court-friendly strengthening:
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        "-dPDFSETTINGS=/prepress",

        // A reasonable resolution baseline for vector/text docs:
        "-r300",

        `-sOutputFile=${outputPath}`,
        inputPath
      ],
      { timeout: 60000 },
      (error) => {
        if (error) {
          console.error("Ghostscript error:", error);
          return reject(error);
        }
        resolve();
      }
    );
  });
}

/* -----------------------------
   API: FLATTEN (Direct Fixer)
----------------------------- */
app.post("/api/flatten", upload.single("file"), async (req, res) => {
  const inputPath = req.file?.path;
  const outputName = `flattened-${Date.now()}.pdf`;
  const outputPath = path.join("tmp", outputName);

  try {
    if (!inputPath) return res.status(400).send("No file uploaded.");

    await ghostscriptNormalize(inputPath, outputPath);

    res.download(outputPath, outputName, () => {
      safeUnlink(inputPath);
      safeUnlink(outputPath);
    });
  } catch (err) {
    console.error(err);
    safeUnlink(inputPath);
    safeUnlink(outputPath);
    res.status(500).send("Flattening failed");
  }
});

/* -----------------------------
   COURT READY PIPELINE (INSPECT → FIX → RECHECK → REPORT)
   Endpoint consumed by your court-ready.html fetch("/court/court-ready")
----------------------------- */
app.post("/court/court-ready", upload.single("file"), async (req, res) => {
  const inputPath = req.file?.path;
  const outputName = `court-ready-${Date.now()}.pdf`;
  const outputPath = path.join("tmp", outputName);

  try {
    if (!inputPath) return res.status(400).json({ error: "No file uploaded." });

    const originalSize = fs.statSync(inputPath).size;

    const originalText = readPdfAsLatin1(inputPath);
    const findings = basicDetect(originalText);

    const detected = buildDetectedArray(findings);
    const resolved = [];

    // Optional deep checks (only if tools exist)
    const qpdfOut = await tryQpdfShowEncryption(inputPath);
    if (qpdfOut) {
      const info = parseQpdfEncryption(qpdfOut);
      if (info.hasPassword || info.hasRestrictions) {
        detected.push({
          issue: "PDF security restrictions detected (permissions)",
          risk: "Restrictions on copying/printing/modifying can interfere with portal processing. A normalized output often resolves this."
        });
      }
    }

    const pdffontsOut = await tryPdfFonts(inputPath);
    if (pdffontsOut) {
      const fontsInfo = parsePdffonts(pdffontsOut);
      if (fontsInfo.hasUnembeddedFonts === true) {
        detected.push({
          issue: "Potential unembedded fonts detected",
          risk: "Some portals reject PDFs with missing embedded fonts. Normalization with font embedding reduces this risk."
        });
      }
    }

    // Decide if we should process:
    // If any high-risk items exist, process.
    const highRisk =
      findings.hasAcroForm ||
      findings.hasXFA ||
      findings.hasWidget ||
      findings.hasEncrypt ||
      findings.hasJavaScript ||
      findings.hasEmbeddedFiles;

    let processedPath = inputPath;

    if (highRisk) {
      await ghostscriptNormalize(inputPath, outputPath);
      processedPath = outputPath;

      resolved.push("Normalized PDF output created (static pdfwrite).");
      resolved.push("Fonts embedded/subset to reduce portal rendering issues.");

      if (findings.hasAcroForm || findings.hasXFA || findings.hasWidget) {
        resolved.push("Interactive form elements converted to static page content (flattened).");
      }
      if (findings.hasEncrypt) {
        resolved.push("Security/encryption markers removed in normalized output (where possible).");
      }
      if (findings.hasJavaScript) {
        resolved.push("Active content removed in normalized output (where possible).");
      }
      if (findings.hasEmbeddedFiles) {
        resolved.push("Embedded attachments removed in normalized output (where possible).");
      }
    }

    // Re-check after processing (validation pass)
    const finalText = readPdfAsLatin1(processedPath);
    const finalFindings = basicDetect(finalText);

    const postChecks = {
      interactiveCleared: !(finalFindings.hasAcroForm || finalFindings.hasXFA || finalFindings.hasWidget),
      encryptCleared: !finalFindings.hasEncrypt,
      jsCleared: !finalFindings.hasJavaScript,
      embeddedCleared: !finalFindings.hasEmbeddedFiles
    };

    if (highRisk) {
      if (postChecks.interactiveCleared) resolved.push("Validation: no interactive elements detected after processing.");
      if (postChecks.encryptCleared) resolved.push("Validation: no encryption markers detected after processing.");
      if (postChecks.jsCleared) resolved.push("Validation: no active-content markers detected after processing.");
      if (postChecks.embeddedCleared) resolved.push("Validation: no embedded-attachment markers detected after processing.");
    }

    const finalSize = fs.statSync(processedPath).size;

    // Respond with JSON report + download route
    res.json({
      status: highRisk ? "processed_with_corrections" : "no_risk_detected",
      detected,
      resolved,
      metrics: {
        originalBytes: originalSize,
        finalBytes: finalSize,
        pdfVersionDetected: findings.pdfVersion || null
      },
      download: `/court/download/${outputName}`,
      disclaimer: "Processed to reduce common technical rejection causes. Technical processing only. Subject to clerk review."
    });

    // NOTE: we do NOT delete here because user still needs to download.
    // file will be deleted on download endpoint below.

    // But if no processing was done, we still need a downloadable file.
    // In that case, copy original into outputName for consistent download.
    if (!highRisk) {
      try {
        fs.copyFileSync(inputPath, outputPath);
      } catch (_) {}
    }

  } catch (err) {
    console.error(err);
    safeUnlink(inputPath);
    safeUnlink(outputPath);
    res.status(500).json({ error: "Court-ready processing failed" });
  }
});

/* -----------------------------
   DOWNLOAD (SAFE + DELETE AFTER)
----------------------------- */
app.get("/court/download/:filename", (req, res) => {
  const filename = req.params.filename;

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).send("Invalid filename.");
  }

  const filePath = path.join("tmp", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  res.download(filePath, filename, () => {
    safeUnlink(filePath);
  });
});

/* -----------------------------
   HEALTH CHECK (RENDER)
----------------------------- */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

/* -----------------------------
   TEST ROUTES
----------------------------- */
app.get("/court/check/test", (req, res) => {
  res.send("Court check route exists.");
});
app.get("/court/court-ready/test", (req, res) => {
  res.send("Court-ready route exists.");
});

/* -----------------------------
   FALLBACK (DO NOT OVERRIDE STATIC)
----------------------------- */
app.use((req, res) => {
  res.status(404).send("Not found");
});

/* -----------------------------
   START SERVER
----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDFMender running on port ${PORT}`);
});
