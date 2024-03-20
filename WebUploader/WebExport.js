const { chromium } = require("playwright"); // Install npx install chromium
const notifier = require("node-notifier");
const os = require("os");
const fs = require("node:fs/promises");
const EventEmitter = require("events");

const URL_Address_Local_Path = `${__dirname}/WebExportUrls.json`;
const Platform_Downloads_Path = `${os.homedir}\\Downloads\\`;
const Export_Result_Path = `${__dirname}/WebExportResult.txt`;

const SucessNotification = {
    title: "Descarga de Archivos",
    message: "EXITOSO",
    timeout: 300000,
};
const FailedNotification = {
    title: "Descarga de Archivos",
    message: "FALLIDA",
    timeout: 300000,
};

class Downloader extends EventEmitter{
    
    constructor(){
        super();
        this.clients = {};
    }

    async main() {
        try {
            await updateResultFile("Undefined");
            this.clients = await getClientsData();
            await this.ExportFromWeb();

        } catch (e) {
            console.error("Main() Error:", e);
        }
    }

    // * Main Export : Redirects to client.webType Methods
    async ExportFromWeb() {
        const browser = await chromium.launch({ headless: false });
        let ResultsLogger = "";

        for (const client of this.clients.clients) {
            this.emit('newClient', client.name)
            let exportResult = "Undefined"; 
            
            switch (client.WebAppType) {
                case "ArcaDigital":

                    this.emit('progressUpdate', {
                        'stageDescription':"Iniciando Descarga ...",
                        'progress': 10
                    });

                    exportResult = await this.ExportArcaDigital(client, browser);

                    this.emit('completedOperation', exportResult);

                    ResultsLogger += `${exportResult}`;
                    break;
                case "Odoo":
                    this.emit('progressUpdate', {
                        'stageDescription':"Iniciando Descarga ...",
                        'progress': 10
                    });

                    exportResult = await this.exportOdoo(client, browser);            
                    this.emit('completedOperation', exportResult);
                    ResultsLogger += `${exportResult}`;
                    break;
                default:
                    console.log(`${client.name} = Invalid WebApp: ${client.Url}`);
                    break;
            }
        }

        console.log("ResultsLogger: ", ResultsLogger);

        const notification = ResultsLogger === "Success" ? SucessNotification : FailedNotification;
        notifier.notify(notification);

        updateResultFile(ResultsLogger);
        browser.close();
    }

    async loginArcaDgital(page, client) {

        this.emit('progressUpdate', {
            'stageDescription':"Iniciando Session ...",
            'progress': 30
        });

        let urlObject = UrlFactory(client.Url);

        await page.goto(urlObject.protocol + urlObject.domain + "/login");
        await page.type("#email", client.User);
        await page.type("#password", client.Password);
        await page.click(".btn-signin");
        
        return;
    }

    async ExportArcaDigital(client, browser) {
        const page = await browser.newPage();

        //Ensure Items Url Path to be loaded
        try {
            await this.loginArcaDgital(page, client);
            await page.goto(client.Url);

            //Log in - Items Redirection
            if (page.url().includes("login")) {
                await this.loginArcaDgital(page, client);
            }
            let loginRetries = 0;
            while (loginRetries < 4) {
                try {
                    // Error Loading site or LogIn Redirection
                    if (!page.url().includes("items")) {
                        console.log(
                            `URL Items Page Failed Retriying: ${loginRetries}`
                        );

                        //  LogIn Redirection - Login
                        if (page.url().includes("login")) {
                            await this.loginArcaDgital(page, client);
                        }
                        //  Error Redirection - Reload
                        await page.reload();
                    } else {
                        break;
                    }
                    loginRetries++;
                } catch (error) {
                    console.error("Error during Export:", error.message);
                    return "Failed";
                }
            }
        } catch (error) {
            console.error("Error during Export:", error.message);
            return "Failed";
        }

        // Place the download from the Items page
        try {
            this.emit('progressUpdate', {
                'stageDescription':"Descargando Productos ...",
                'progress': 60
            });

            await this.start_Download_ArcaDigital(page);


            console.log("SUCCESS OPERATION");
            return "Success";
        } catch (error) {
            console.error(
                "FAILED OPERATION: Error At Data Extracting :",
                error.message
            );

            return "Failed";
        } 
    }

    async start_Download_ArcaDigital(page) {


        // Click Export Button
        await page.click("button.btn.btn-custom.btn-sm.mt-2.mr-2.dropdown-toggle");

        // Wait for the dropdown menu to appear
        await page.waitForSelector("a.dropdown-item.text-1");

        // Click on the first element in the dropdown menu - Listado
        await page.click("a.dropdown-item.text-1");

        // Click on Time Period Selector
        const timeRangeLocator = await page.$$(".el-input__inner");
        await timeRangeLocator[2].click({ timeout: 3000 });

        // Click the ALL option
        //const periodOption = await  page.$$('.el-select-dropdown__item');

        const timeRangeOption = await page.getByText("Todos"); //$$('.el-select-dropdown__item');
        await timeRangeOption.click();

        // Click on Procced Button

        const ProccessButton = await page.$$(
            ".el-button.el-button--primary.el-button--small"
        );

        // Start waiting for download before clicking. Note no await.
        const downloadPromise = page.waitForEvent("download", { timeout: 300000 });

        await ProccessButton[2].click();
        //await page.getByText('Download file').click();
        const download = await downloadPromise;

        // Wait for the download process to complete and save the downloaded file somewhere.
        await download.saveAs(
            Platform_Downloads_Path + download.suggestedFilename()
        );
    }

}

// * Shell Execution
if (require.main === module) {
    const downloader = new Downloader();
    downloader.main(); // Call the main method
}

//  ?   Additional Helper/Support Functions

function UrlFactory(url) {
    const urlRegex =
        /^(https?:\/\/)?((\d{1,3}\.){3}\d{1,3}|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/\S*)?$/;
    const match = url.match(urlRegex);

    let urlObject = {};

    if (match) {
        const protocol = match[1] || "http://";
        const domain = match[2];
        const path = match[5] || "/";

        urlObject = {
            completeUrl: protocol + domain + path,
            domain: domain,
            path: path,
            protocol: protocol,
        };
        return urlObject;
    } else {
        return;
    }
}

// * Operation Results
// ?   Undefined: Proccess started
// *   Success: Proccess started
// !   Failed: Proccess started

async function updateResultFile(result) {
    try {
        await fs.writeFile(Export_Result_Path, result);
    } catch (err) {
        console.log(err);
    }
}

async function getClientsData() {
    try {
        const data = await fs.readFile(URL_Address_Local_Path, "utf8");
        try {
            // Parse the JSON content and return the parsed data
            return JSON.parse(data);
        } catch (parseError) {
            throw new Error(`Error Parsing Client Json: ${parseError}`);
        }
    } catch (readError) {
        throw new Error(`Error Reading Client Json: ${readError}`);
    }
}

module.exports = {
    Downloader,
};