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
      req.file.path
    ],
    (error, stdout, stderr) => {
      if (error) {
        console.error("Ghostscript error:", error);
        return reject(error);
      }
      resolve();
    }
  );
});

    res.download(outputPath, outputName, () => {
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Flattening failed");
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
