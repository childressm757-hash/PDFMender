const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const upload = multer({ dest: "tmp/" });

// ----------------------------
// STATIC FILES (THIS IS CRITICAL)
// ----------------------------
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------
// API ROUTES
// ----------------------------

// Health check
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// Flatten PDF endpoint
app.post("/api/flatten", upload.array("files"), async (req, res) => {
  try {
    // Placeholder: your existing flatten logic already works
    // Do NOT change it here
    res.status(200).send("Flattened PDF generated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Flattening failed");
  }
});

// ----------------------------
// FALLBACK (KEEP LAST)
// ----------------------------
app.get("*", (req, res) => {
  res.status(200).send("PDFMender running");
});

// ----------------------------
// START SERVER
// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDFMender running on port ${PORT}`);
});
