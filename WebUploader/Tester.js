const path = require('path');
const { exec } = require('child_process');

const excelPath = path.resolve(__dirname, '../Src/Barcodes.xlsm');
exec(`start ${excelPath}`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});