//  Called From Shell with no Parameters
const fs = require('fs');
const {PDFDocument} =  require('pdf-lib');
const printer = require('printer');

const app_operation_mode  = process.argv[2] || 'download';

function main(){
    try {
        
        // Example usage: Create a 5-page PDF from a 1-page PDF
        createMultiPagePDF('single-page.pdf', 5);
        console.log("Hello World")
        process.exit(0)// Success Operation
    } catch(e) {

        process.exit(1)// Failed Operation
    }
}

async function createMultiPagePdf(){
    // Read the original 1-page PDF
    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const originalPdf = await PDFDocument.load(originalPdfBytes);

    // Create a new PDF document
    const newPdf = await PDFDocument.create();
    
    // Copy the pages from the original PDF to the new PDF `copies` times
    const [originalPage] = await newPdf.copyPages(originalPdf, [0]);
    for (let i = 0; i < copies; i++) {
        newPdf.addPage(originalPage);
    }

    // Save the new multi-page PDF
    const newPdfBytes = await newPdf.save();
    const newPdfPath = 'multi-page-output.pdf';
    fs.writeFileSync(newPdfPath, newPdfBytes);
    
    console.log(`Created new multi-page PDF at ${newPdfPath}`);

    // Print the new multi-page PDF
    printPDF(newPdfPath);
}
function printPDF(pdfPath) {
    printer.printFile({
        filename: pdfPath,
        printer: 'Microsoft Print to PDF', // Specify your printer name here
        success: function(jobID) {
            console.log(`Print job ${jobID} sent successfully`);
        },
        error: function(err) {
            console.log('Error printing:', err);
        }
    });
}
