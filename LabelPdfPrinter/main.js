//  Called From Shell with no Parameters

require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { getPrinters, print } = require("pdf-to-printer");

const exeDir = path.dirname(process.execPath);

// packaged app Execution
let pdfLayoutDir = path.resolve(exeDir, "pdf-layout");
let pdfOutputDir = path.resolve(exeDir, "pdf-output");
let localSumatraPdfPath = path.resolve(exeDir, "SumatraPDF-3.4.6-32.exe");

// devEnviroment Execution
if (process.env.NODE_ENV === "development") {
  console.log(process.env.NODE_ENV);
  console.log(process.env.TEST);
  pdfLayoutDir = path.resolve(__dirname, "pdf-layout");
  pdfOutputDir = path.resolve(__dirname, "pdf-output");
  localSumatraPdfPath = "";
}

main();

//  Returns pdfObject with required data
async function parsePdfBindings(fileName) {
  // Parse input pdfName format instructions
  //    [printerName]-[productCode]-[pageCopies].pdf
  //    godex ez4401i-951570252516-120.pdf

  const regex = /^([a-zA-Z0-9\s\(\)-]+)-([a-zA-Z0-9-]+)-(\d+)\.pdf$/;
  const match = fileName.match(regex);
  if (match) {
    return {
      path: path.join(pdfLayoutDir, fileName),
      pdfName: fileName,
      printerName: match[1],
      productCode: match[2],
      pageCopies: parseInt(match[3], 10),
    };
  } else {
    throw new Error("Filename does not match expected format.");
  }
}

async function main() {
  // Exit the program if the input folder does not exist or is not accessible
  if (!fs.existsSync(pdfLayoutDir)) {
    //fs.mkdirSync(pdfLayoutDir, { recursive: true });
    console.error(`No pdf input folder found returning ./pdf-layout`);
    return;
  }

  const files = fs.readdirSync(pdfLayoutDir);

  // Exit if no files to process in the input folder
  if (files.length === 0) {
    console.error(`No files found in : ${pdfLayoutDir}`);
    return;
  }

  fs.mkdirSync(pdfOutputDir, { recursive: true });

  // iterate  over all pdfs
  for (let i = 0; i < files.length; i++) {
    try {
      const pdfName = files[i];
      const pdf = await parsePdfBindings(pdfName);
      multiPagePdf = await createMultiPagePdf(pdf);
      await printPDF(multiPagePdf, pdf.printerName);
    } catch (e) {
      console.error(`${i} ERROR at processing pdf.\n ${e}`);
    }
  }
  console.log(files);
}

async function createMultiPagePdf(pdf) {
  // Read the original 1-page PDF
  const originalPdfBytes = fs.readFileSync(pdf.path);
  const originalPdf = await PDFDocument.load(originalPdfBytes);

  // Create a new PDF document
  const newPdf = await PDFDocument.create();

  // Copy the pages from the original PDF to the new PDF `copies` times
  const [originalPage] = await newPdf.copyPages(originalPdf, [0]);
  for (let i = 0; i < pdf.pageCopies; i++) {
    newPdf.addPage(originalPage);
  }

  // Save the new multi-page PDF
  const newPdfBytes = await newPdf.save();

  if (!fs.existsSync(pdfOutputDir)) {
    fs.mkdirSync(pdfOutputDir, { recursive: true });
  }

  const newPdfPath = path.join(pdfOutputDir, `${pdf.pdfName}`);
  fs.writeFileSync(newPdfPath, newPdfBytes);

  console.log(`Created new multi-page PDF at ${newPdfPath}`);
  return newPdfPath;
}

async function listPrinters() {
  try {
    const printers = await getPrinters();
    console.log("Available Printers:");
    printers.forEach((printer, index) => {
      console.log(`${index + 1}. ${printer.name}`);
    });
    return printers;
  } catch (err) {
    console.error("Error fetching printers:", err);
    return [];
  }
}

// Example
//  listPrinters();

async function printPDF(pdfPath, printerName) {
  try {
    const options = {
      printer: printerName,
      sumatraPdfPath: localSumatraPdfPath,
      orientation: 'portrait'
    };
    const jobID = await print(pdfPath, options);
    console.log(
      `Print job ${jobID} sent successfully to printer "${printerName}".`
    );
  } catch (err) {
    console.error(`Error printing to printer "${printerName}":`, err);
  }
}
