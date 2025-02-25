require("dotenv").config();
const { exec } = require('child_process');
const { error } = require("console");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { getPrinters,print } = require("pdf-to-printer");

const exeDir = path.dirname(process.execPath);

// packaged app Execution
let pdfLayoutDir = path.resolve(exeDir, "pdf-layout");
let pdfOutputDir = path.resolve(exeDir, "pdf-output");
let localSumatraPdfPath = path.resolve(exeDir, "SumatraPDF-3.4.6-32.exe");

// devEnviroment Execution
if (process.env.NODE_ENV === "development") {
  console.log(process.env.NODE_ENV);
  pdfLayoutDir = path.resolve(__dirname, "pdf-layout");
  pdfOutputDir = path.resolve(__dirname, "pdf-output");
  localSumatraPdfPath = "";
}

main();

//  Returns pdfObject with required data
async function parsePdfBindings(fileName, filePath) {
  // Parse input pdfName format instructions
  //    [printerName]-[productCode]-[pageCopies].pdf
  //    godex ez4401i-951570252516-120.pdf

  const regex = /^(\d+)?-?([a-zA-Z0-9\s\(\)-]+)-([a-zA-Z0-9-]+)-(\d+)\.pdf$/;
  const match = fileName.match(regex);
  if (match) {
    return {
      path: path.join(filePath, fileName),
      pdfName: fileName,
      printerName: match[2],
      productCode: match[3],
      pageCopies: parseInt(match[4], 10),
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

  // Restart output folder
  if (fs.existsSync(pdfOutputDir)) {
    fs.rmSync(pdfOutputDir, { recursive: true, force: true });
  }

  fs.mkdirSync(pdfOutputDir, { recursive: true });

  // generate multi-page pdf
  for (let i = 0; i < files.length; i++) {
    try {
      const pdfName = files[i];
      const pdf = await parsePdfBindings(pdfName, pdfLayoutDir);
      await createMultiPagePdf(pdf);
    } catch (e) {
      console.error(`${i} ERROR at creating pdf.\n ${e}`);
    }
  }

  // PRINT multi-page pdf
  const multiPagePdf = fs.readdirSync(pdfOutputDir); /*list of pdf names*/

  // Exit if no files to process in the input folder
  if (multiPagePdf.length === 0) {
    console.error(`No files found in : ${pdfOutputDir}`);
    return;
  }

  for (let i = 0; i < multiPagePdf.length; i++) {
    try {
      const pdfName = multiPagePdf[i];
      const pdf = await parsePdfBindings(pdfName, pdfOutputDir);
      await printPDF(pdf);
    } catch (e) {
      console.error(`${i} ERROR at processing pdf.\n ${e}`);
    }
  }
  console.log(files);
}


async function waitForPrinter(printerName) {
  const timeout = 30000
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const printers = await getPrinters();
    const printer = printers.find(p => p.name === printerName);

    if (printer && printer.status === 'idle') {
      return true; // Printer is ready
    }

    console.log(`Waiting for printer ${printerName} to become available...`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 1 second before checking again
  }

  throw new Error(`Printer ${printerName} is not available after waiting for ${timeout}ms`);
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

  // Create output folder 
  if (!fs.existsSync(pdfOutputDir)) {
    fs.mkdirSync(pdfOutputDir, { recursive: true });
  }

  const newPdfPath = path.join(pdfOutputDir, `${pdf.pdfName}`);
  fs.writeFileSync(newPdfPath, newPdfBytes);

  console.log(`Created new multi-page PDF at : \n ${newPdfPath}`);
  return newPdfPath;
}

async function printPDF(pdf) {

  try {
    const options = {
      printer: pdf.printerName,
      sumatraPdfPath: localSumatraPdfPath,
      orientation: 'landscape'
    };

    // await waitForPrinter(pdf.printerName)
    const jobID = await print(pdf.path, options);

    console.log(
      `Print job ${jobID} sent successfully to printer "${pdf.printerName}".`
    );
  } catch (err) {
    console.error(`Error printing to printer "${pdf.printerName}":`, err);
  }
}
