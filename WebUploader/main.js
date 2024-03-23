
const { exec } = require('child_process');
const {app, BrowserWindow, screen, ipcMain } = require('electron'); 
const path = require('path');

const {Downloader} = require('./WebExport')
const {Uploader} = require('./WebUpload');
const { triggerAsyncId } = require('async_hooks');

//  * shell defined operation => download | upload
// - Default Operation = Download 
const ipc = ipcMain
const app_operation_mode  = process.argv[2] || 'download';

let mainWindow;

app.on('ready',()=>{
    createWindow()
    //  * Upload Specification Handler
    if (app_operation_mode == "upload" ){
        webUpload_init();
    }else{
        webDownload_init();
    }
})



const createWindow = async () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 500,
        height: 200,
        alwaysOnTop:true,
        autoHideMenuBar:true,
        //maximizable:false,
        //minimizable:false,
        frame:false,
        //roundedCorners:true,
        //titleBarStyle:'hidden',
        webPreferences: {
            devTools:true,
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        
        x: width - 500, 
        y: height - 400,
    })
    mainWindow.setTitle(app_operation_mode == 'upload'? 'Subida de Productos':'Descarga de Productos')
    mainWindow.loadFile('progressView.html');
    
    ipc.on('minimizeApp',()=>{
        mainWindow.minimize()
    })
    ipc.on('maximizeApp',()=>{
        if(mainWindow.isMaximized()){
            mainWindow.restore()
        }else{
            mainWindow.maximize()
        }
    })
    ipc.on('closeApp',()=>{
        mainWindow.close()
    })
}


//  * Upload - Events Handler
function webUpload_init() {
    const uploader = new Uploader();
    uploader.main();
    
    uploader.on('newClient', (client)=> {
        mainWindow.webContents.send('new-client', client);
        console.log(`new Client: ${client} `);
    });

    uploader.on('progressUpdate', (action)=> {
        const {stageDescription,progress} =action;
        mainWindow.webContents.send('update-progress', action);
        console.log(`upload update: ${stageDescription} ,${progress} `);
    });

    uploader.on('completedOperation', (result)=> {
        mainWindow.webContents.send('completed-process', result);
        console.log(`upload Completed: ${result} `);
    });

    uploader.on('end', () => {
        console.log('File uploaded successfully.');
    });

    uploader.on('error', error => {
        mainWindow.webContents.send('error-process');
        console.error('Error uploading file:', error);
    });
}

//  * Download - Events Handler
function webDownload_init() {
    const exportProcess = new Downloader();
    exportProcess.main();

    exportProcess.on('newClient', (client)=> {
        mainWindow.webContents.send('new-client', client);
        console.log(`new Client: ${client} `);
    });

    exportProcess.on('progressUpdate', (action)=> {
        const {stageDescription,progress} =action;
        mainWindow.webContents.send('update-progress', action);
        console.log(`Download update: ${stageDescription} ,${progress} `);
    });

    exportProcess.on('completedOperation', (result)=> {
        mainWindow.webContents.send('completed-process', result);
        console.log(`Download Completed: ${result} `);
        
        const excelPath = path.resolve(__dirname, '../Src/Barcodes.xlsm');
        exec(`start ${excelPath}`, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
    });

    exportProcess.on('end', () => {
        console.log('File downloaded successfully.');
    });

    exportProcess.on('error', error => {
        mainWindow.webContents.send('error-process');
        console.error('Error downloading file:', error);
    });
}




app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }

})