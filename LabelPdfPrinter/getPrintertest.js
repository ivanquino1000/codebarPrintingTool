require("dotenv").config();
const { exec } = require("child_process");
const { error } = require("console");
const fs = require("fs");
const { waitForDebugger } = require("inspector");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { print } = require("pdf-to-printer");
const { getPrinters } = require("./printerData.js");


async function main() {
  const printers = await getPrinters();
  // Check the parsed printer data
  console.log("DEBUG: Printers list:", printers);

  printers.forEach((printer) => {
    console.log("Printer Status:", printer.status); // Ensure status is available and correct
  });
}

main();

async function waitForPrinter(printerName) {
  const timeout = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const printers = await getPrinters();
    const printer = printers.find((p) => p.name === printerName);

    if (printer && printer.status === "available") {
      return true; // Printer is ready
    }

    console.log(`Waiting for printer ${printerName} to become available...`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 1 second before checking again
  }

  throw new Error(
    `Printer ${printerName} is not available after waiting for ${timeout}ms`
  );
}
