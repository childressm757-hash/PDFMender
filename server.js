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
   HEALTH CHECK (RENDER)
----------------------------- */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
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
