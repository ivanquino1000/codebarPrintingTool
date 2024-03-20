const fs = require('node:fs/promises');
const { chromium } = require('playwright'); // Install npx install chromium 
const os = require('os');
const path = require('path');
const EventEmitter = require("events");

const Local_UploadFile_Path_ArcaDigital =  path.resolve(__dirname, '..', 'Config', 'items.xlsx');
const Local_UploadFile_Path_Odoo =  path.resolve(__dirname, '..', 'Config', 'Odoo_Items.xls');
const Upload_Result_Path =   `${__dirname}/WebUploadResult.txt`
const URL_Address_Local_Path =  `${__dirname}/WebUploadUrls.json`;

class Uploader extends EventEmitter{
    constructor(){
        super();
        this.clients = {};
    }
    async main(){
        try {
            await updateResultFile("Undefined");
            this.clients = await getClientsData();
            await this.UploadWebApp();

        } catch (e) {
            console.error("Main() Error:", e);
        }
    }
    
    // * Main Upload : Redirects to client.webType Methods
    async UploadWebApp() {
        const browser = await chromium.launch({ headless: false });
        let ResultsLogger = "";

        for (const client of this.clients.clients) {
            this.emit('newClient', client.name)
            let uploadResult = "Undefined"; 
            
            switch (client.WebAppType) {
                case "ArcaDigital":
                    this.emit('progressUpdate', {
                        'stageDescription':"Iniciando Subida ...",
                        'progress': 10
                    });

                    uploadResult = await this.uploadArcaDigital(client, browser);
                    this.emit('completedOperation', uploadResult);

                    ResultsLogger += `${client.name}=${uploadResult}\n`;
                    break;
                case "Odoo":
                    this.emit('progressUpdate', {
                        'stageDescription':"Iniciando Subida ...",
                        'progress': 10
                    });
                    uploadResult = await this.uploadOdoo(client, browser);
                    this.emit('completedOperation', uploadResult);
                    ResultsLogger += `${client.name}=${uploadResult}\n`;
                    break;
                default:
                    console.log(`${client.name} = Invalid WebApp: ${client.Url}`);
                    break;
            }
        }

        console.log("ResultsLogger: ", ResultsLogger);

        updateResultFile(ResultsLogger);
        browser.close();
    }

    async uploadArcaDigital(client,browser){
        const page = await browser.newPage();
        
        //  Go to the Upload URL Address
        try{
            await this.loginArcaDgital(page,client)
            await page.goto(client.Url)
    
            //Log in - Items Redirection
            if (page.url().includes('login')){
                await this.loginArcaDgital(page,client)
            }
            let loginRetries = 0 ;
            while (loginRetries<4){
                try{
                    if(!page.url().includes('items') ){
                        console.log(`URL Items Page Failed Retriying: ${loginRetries}`)
                        
                        if (page.url().includes('login')){
                            await this.loginArcaDgital(page,client)
                        }
    
                        await page.reload()
                    }else{
                        break;
                    }
                    loginRetries++
    
                }catch (error) {
                    console.error('Error during Upload:', error.message);
                    return "Failed";
                } 
            }
        }catch (error) {
            console.error('Error during Export:', error.message);
            return "Failed";
        } 
    
        // Place the download from the Items page
        try {
            this.emit('progressUpdate', {
                'stageDescription':"Subiendo Productos ...",
                'progress': 60
            });
            await this.beginUploadArcaDigital(page)
            console.error('SUCCESS OPERATION');
            return "Success"
            
        }catch(error){
            console.error('FAILED OPERATION: Error At Data Uploading :', error.message);
            return "Failed";
        }
    }


    async  beginUploadArcaDigital (page){
        // Click Export Button
        await page.getByText('Importar').click();
    
        //await page.click('button.btn.btn-custom.btn-sm.mt-2.mr-2.dropdown-toggle');
    
        // Products Dropdown Option 
    
        await page.locator(".dropdown-item.text-1").getByText('Productos').click();
        
    
        // Click on WareHouse Selector 
        await page.getByPlaceholder("Seleccionar").click();
    
        //Select Principal warehouse
        await page.locator(".el-select-dropdown__item").getByText('Almacén Oficina Principal').click();
    
        //Select the Upload File Element and uploads the webapp Uploads Format
        
        // Find the input element by CSS selector
        const inputElement = await page.$(".el-upload__input[name='file']");
    
        // Set the input files for the input element
        await inputElement.setInputFiles(Local_UploadFile_Path_ArcaDigital);
       
        // PROCEED BUTTON
        await page.locator(".el-button.el-button--primary.el-button--small").getByText('Procesar').click();
        // Wait network to end
        await page.waitForLoadState("networkidle");
    }
    
    async  loginArcaDgital(page,client){
        
        this.emit('progressUpdate', {
            'stageDescription':"Iniciando Session ...",
            'progress': 30
        });

        let urlObject = UrlFactory(client.Url);
    
        await page.goto(urlObject.protocol + urlObject.domain + "/login")
        await page.type('#email', client.User)
        await page.type('#password', client.Password)
        await page.click('.btn-signin')
        return;
    }

}

// * Shell Execution
if (require.main === module) {
    const uploader = new Uploader();
    uploader.main(); // Call the main method
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

async function getClientsData() {
    try {
        const data = await fs.readFile(URL_Address_Local_Path, 'utf8');
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

async function updateResultFile(result) {
    try {
      await fs.writeFile(Upload_Result_Path, result);
    } catch (err) {
      console.log(err);
    }
}

module.exports = {
    Uploader,
}