const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
const upload = multer({ dest: path.join(__dirname, "tmp") });

/* -----------------------------
   STATIC FILES
----------------------------- */
app.use(express.static(path.join(__dirname, "public")));

/* -----------------------------
   FLATTEN ENDPOINT
----------------------------- */
app.post("/api/flatten", upload.single("file"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputName = `flattened-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, "tmp", outputName);

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
          if (error) return reject(error);
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
   COURT READY PIPELINE
----------------------------- */
app.post("/court/court-ready", upload.single("file"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputName = `court-ready-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, "tmp", outputName);

    const fileBuffer = fs.readFileSync(inputPath);
    const fileText = fileBuffer.toString("latin1");

    const detected = [];
    const resolved = [];

    if (fileText.includes("/AcroForm") || fileText.includes("/XFA")) {
      detected.push({
        issue: "Interactive form fields detected",
        risk: "Filing systems such as CM/ECF may reject interactive PDFs."
      });
    }

    if (fileText.includes("/Encrypt")) {
      detected.push({
        issue: "Encryption detected",
        risk: "Encrypted PDFs may be rejected by filing systems."
      });
    }

    if (fileText.includes("/JavaScript")) {
      detected.push({
        issue: "Embedded JavaScript detected",
        risk: "Active content may trigger security rejection."
      });
    }

    if (fileText.includes("/EmbeddedFiles")) {
      detected.push({
        issue: "Embedded attachments detected",
        risk: "Attachments may not be accepted by court filing systems."
      });
    }

    let processedPath = inputPath;

    if (detected.length > 0) {
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
            if (error) return reject(error);
            resolve();
          }
        );
      });

      processedPath = outputPath;

      const finalBuffer = fs.readFileSync(processedPath);
      const finalText = finalBuffer.toString("latin1");

      if (!finalText.includes("/AcroForm") && !finalText.includes("/XFA")) {
        resolved.push("Interactive form fields flattened.");
      }

      if (!finalText.includes("/Encrypt")) {
        resolved.push("Encryption removed or not present.");
      }
    }

    res.json({
      status: detected.length > 0 ? "processed_with_corrections" : "no_risk_detected",
      detected,
      resolved,
      download: `/court/download/${outputName}`,
      disclaimer: "Processed to reduce common rejection causes. Subject to clerk review."
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Court-ready processing failed" });
  }
});

/* -----------------------------
   DOWNLOAD ROUTE
----------------------------- */
app.get("/court/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "tmp", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  res.download(filePath, (err) => {
    if (!err) {
      fs.unlinkSync(filePath);
    }
  });
});

/* -----------------------------
   HEALTH CHECK
----------------------------- */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

/* -----------------------------
   FALLBACK
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
