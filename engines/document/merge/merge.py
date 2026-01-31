import sys
from PyPDF2 import PdfMerger

def main():
    if len(sys.argv) < 4:
        print("Usage: python merge.py input1.pdf input2.pdf ... output.pdf")
        sys.exit(1)

    input_files = sys.argv[1:-1]
    output_file = sys.argv[-1]

    merger = PdfMerger()

    for pdf in input_files:
        merger.append(pdf)

    merger.write(output_file)
    merger.close()

if __name__ == "__main__":
    main()

