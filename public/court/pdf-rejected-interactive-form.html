<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PDF Rejected by Court — Fix Interactive or XFA Forms</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f6f7f8;
      margin: 0;
      padding: 40px 20px;
      color: #111;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }

    h1 {
      font-size: 26px;
      margin-bottom: 16px;
    }

    p {
      line-height: 1.6;
      margin-bottom: 14px;
      color: #333;
    }

    .upload-box {
      border: 2px dashed #d0d0d0;
      border-radius: 10px;
      padding: 28px;
      text-align: center;
      margin-top: 28px;
    }

    .conversion-note {
      font-weight: 600;
      margin-bottom: 14px;
    }

    input[type="file"] {
      margin: 14px 0 18px;
    }

    button {
      background: #000;
      color: #fff;
      border: none;
      padding: 14px 22px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .footer-note {
      margin-top: 16px;
      font-size: 13px;
      color: #666;
    }

    .status {
      margin-top: 16px;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="container">
    <h1>PDF Rejected by Court: Interactive or XFA Form Detected</h1>

    <p>
      Your court filing was rejected because the PDF contains interactive form fields or XFA form data.
      Most courts require PDFs to be fully flattened before submission.
    </p>

    <p>
      This usually happens when a document is created from Word, Adobe forms, or court-provided templates
      that keep form fields active — even after exporting to PDF.
    </p>

    <p>
      Flattening the PDF removes all interactive elements and converts the document into a static,
      court-acceptable file.
    </p>

    <div class="upload-box">
      <!-- ✅ CONVERSION SENTENCE (STEP 3) -->
      <div class="conversion-note">
        This fixes the most common court rejection: interactive or XFA forms.
      </div>

      <form id="flattenForm">
        <input
          type="file"
          name="files"
          id="pdfFile"
          accept="application/pdf"
          required
        />

        <br />

        <button type="submit" id="submitBtn">
          Fix PDF and Download Court-Ready File
        </button>
      </form>

      <div class="status" id="status"></div>

      <div class="footer-note">
        Files are processed automatically and are not stored after processing.
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById("flattenForm");
    const fileInput = document.getElementById("pdfFile");
    const statusEl = document.getElementById("status");
    const submitBtn = document.getElementById("submitBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!fileInput.files.length) {
        return;
      }

      const originalFile = fileInput.files[0];
      const originalName = originalFile.name.replace(/\.pdf$/i, "");

      const now = new Date();
      const dateStr =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

      const outputFilename =
        `${originalName} — Court-Approved — ${dateStr}.pdf`;

      const formData = new FormData();
      formData.append("files", originalFile);

      submitBtn.disabled = true;
      statusEl.textContent = "Processing PDF… please wait.";

      try {
        const response = await fetch("/api/flatten", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error("Flattening failed");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = outputFilename;
        document.body.appendChild(a);
        a.click();

        a.remove();
        window.URL.revokeObjectURL(url);

        statusEl.textContent = "Download complete. Your file is court-ready.";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error processing PDF. Please try again.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>
