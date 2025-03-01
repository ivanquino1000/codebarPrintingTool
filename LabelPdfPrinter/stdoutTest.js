const { execFile, exec } = require("child_process");
const { stat } = require("fs");
const util = require("util");

// Promisify exec to use async/await
const execFileAsync = util.promisify(execFile);

/* const properties = {
  DeviceID: "deviceId",
  Name: "name",
  JobCount: "jobCount",
  PrinterPaperNames: "paperSizes",
  Status: "status",
}; */

const properties = {
  DeviceID: "deviceId",
  Name: "name",
  JobCount: "jobCount",
  PrinterPaperNames: "paperSizes",
  PrinterStatus: "status",
};

// This function checks if the printer data is valid and parses the data
function IsValidPrinter(printer) {
  /* const printerData = {
        deviceId: "",
        name: "",
        paperSizes: [],
        status: "",
      }; */

  const printerData = {
    name: "",
    jobCount: "",
    status: "",
  };

  printer.split(/\r?\n/).forEach((line) => {
    let [label, value] = line.split(":").map((el) => el.trim());

    if (label === undefined || value === undefined) {
      return;
    }

    // handle array dots
    if (value.match(/^{(.*)(\.{3})}$/)) {
      value = value.replace("...}", "}");
    }

    // handle array returns
    const matches = value.match(/^{(.*)}$/);

    if (matches && matches[1]) {
      value = matches[1].split(", ");
    }

    const key = properties[label];

    if (key === undefined) return;

    // Assign value to the corresponding printer data field
    printerData[key] = value;
  });

  const isValid = !!(printerData.deviceId && printerData.name);

  console.log(printerData);
  return {
    isValid,
    printerData,
  };
}
async function getPrinters() {
  function stdoutHandler(stdout) {
    const printers = [];

    // Split stdout based on two or more line breaks
    stdout
      .split(/(\r?\n){2,}/)
      .map((printer) => printer.trim())
      .filter((printer) => !!printer)
      .forEach((printer) => {
        const { isValid, printerData } = IsValidPrinter(printer);

        if (!isValid) return;

        printers.push(printerData);
      });

    return printers;
  }

  try {
    const { stdout } = await execFileAsync("Powershell.exe", [
      "-Command",
      "Get-Printer | Format-List",
      //`Get-CimInstance Win32_Printer -Property DeviceID,Name,PrinterPaperNames,Status`,
    ]);
    return stdoutHandler(stdout);
  } catch (error) {
    throw error;
  }
}

getPrinters();
