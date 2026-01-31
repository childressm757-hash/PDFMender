import os
import uuid
from flask import Flask, render_template, request, send_file, redirect, url_for
from PyPDF2 import PdfMerger

app = Flask(__name__)

# --- Folder setup ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# --- Home page ---
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

# --- Merge PDFs ---
@app.route("/merge", methods=["POST"])
def merge_pdfs():
    files = request.files.getlist("pdfs")

    if not files or len(files) < 2:
        return "Please upload at least two PDF files.", 400

    merger = PdfMerger()

    input_paths = []

    for file in files:
        if file.filename.lower().endswith(".pdf"):
            file_id = f"{uuid.uuid4()}.pdf"
            input_path = os.path.join(UPLOAD_FOLDER, file_id)
            file.save(input_path)
            input_paths.append(input_path)
            merger.append(input_path)

    output_filename = f"merged_{uuid.uuid4()}.pdf"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    merger.write(output_path)
    merger.close()

    # Clean up uploaded files
    for path in input_paths:
        try:
            os.remove(path)
        except:
            pass

    return redirect(url_for("download_file", filename=output_filename))

# --- Download result ---
@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    return send_file(file_path, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
