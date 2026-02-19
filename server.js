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
   FLATTEN ENDPOINT
----------------------------- */
app.post("/api/flatten", upload.single("file"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputName = `flattened-${Date.now()}.pdf`;
    const outputPath = path.join("tmp", outputName);

    await new Promise((resolve, reject) => {
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
          "-r300",
          `-sOutputFile=${outputPath}`,
          inputPath
        ],
        (error) => {
          if (error) {
            console.error("Ghostscript error:", error);
            return reject(error);
          }
          resolve();
        }
      );
    });

    res.download(outputPath, outputName, () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Flattening failed");
  }
});
/* -----------------------------
   COURT CHECK ENDPOINT
----------------------------- */
app.post("/court/check", upload.single("file"), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileText = fileBuffer.toString("latin1");

    const findings = [];

    if (fileText.includes("/AcroForm")) {
      findings.push({ type: "acroform", severity: "high" });
    }

    if (fileText.includes("/XFA")) {
      findings.push({ type: "xfa", severity: "high" });
    }

    if (fileText.includes("/Encrypt")) {
      findings.push({ type: "encryption", severity: "high" });
    }

    if (fileText.includes("/JavaScript")) {
      findings.push({ type: "javascript", severity: "medium" });
    }

    if (fileText.includes("/EmbeddedFiles")) {
      findings.push({ type: "attachments", severity: "medium" });
    }

    fs.unlinkSync(req.file.path);

    let status = "pass";
    if (findings.length > 0) {
      status = "risk";
    }

    res.json({
      status,
      findings
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Court check failed" });
  }
});
/* -----------------------------
   COURT READY PIPELINE
----------------------------- */
app.post("/court/court-ready", upload.single("file"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const tempOutputName = `court-ready-${Date.now()}.pdf`;
    const tempOutputPath = path.join("tmp", tempOutputName);

    // --- STEP 1: Read file for detection
    const fileBuffer = fs.readFileSync(inputPath);
    const fileText = fileBuffer.toString("latin1");

    const findings = [];

    if (fileText.includes("/AcroForm")) {
      findings.push({ type: "acroform", severity: "high" });
    }

    if (fileText.includes("/XFA")) {
      findings.push({ type: "xfa", severity: "high" });
    }

    if (fileText.includes("/Encrypt")) {
      findings.push({ type: "encryption", severity: "high" });
    }

    if (fileText.includes("/JavaScript")) {
      findings.push({ type: "javascript", severity: "medium" });
    }

    if (fileText.includes("/EmbeddedFiles")) {
      findings.push({ type: "attachments", severity: "medium" });
    }

    let processedPath = inputPath;

    // --- STEP 2: Auto-fix if needed (flatten)
    if (findings.length > 0) {
      await new Promise((resolve, reject) => {
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
            "-r300",
            `-sOutputFile=${tempOutputPath}`,
            inputPath
          ],
          (error) => {
            if (error) {
              console.error("Ghostscript error:", error);
              return reject(error);
            }
            resolve();
          }
        );
      });

      processedPath = tempOutputPath;
    }

    // --- STEP 3: Re-check processed file
    const finalBuffer = fs.readFileSync(processedPath);
    const finalText = finalBuffer.toString("latin1");

    const remainingRisks = [];

    if (finalText.includes("/AcroForm")) {
      remainingRisks.push("acroform");
    }

    if (finalText.includes("/XFA")) {
      remainingRisks.push("xfa");
    }

    if (finalText.includes("/Encrypt")) {
      remainingRisks.push("encryption");
    }

    // --- STEP 4: Return cleaned file + report
    res.download(processedPath, tempOutputName, () => {
      fs.unlinkSync(inputPath);
      if (processedPath !== inputPath) {
        fs.unlinkSync(tempOutputPath);
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Court-ready processing failed" });
  }
});
/* -----------------------------
   HEALTH CHECK (RENDER)
----------------------------- */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});
app.get("/court/check/test", (req, res) => {
  res.send("Court check route exists.");
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
