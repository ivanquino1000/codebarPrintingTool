const {ipcRenderer}= require('electron/renderer')
const ipc = ipcRenderer
let currentClient= ""

// * UI update events

ipcRenderer.on('new-client', (event,client) => {
    currentClient = client
    console.log('Renderer Received New Client:', client); // Log the received progress update
    updateName(client)
    updateProgress(0);
});

ipcRenderer.on('update-progress', (event,progressData) => {
    const { stageDescription, progress } = progressData;
    
    console.log('Renderer Received progress update:', stageDescription, progress); // Log the received progress update
    
    updateProgress(progress);
});

ipcRenderer.on('completed-process', (event,result) => {
    
    console.log('Renderer Received progress completed:', result); // Log the received progress update
    appendResult(result)
    updateProgress(100,{ processResult: result });
});

minBtn.addEventListener('click',()=>{
    ipc.send('minimizeApp')
})

maxBtn.addEventListener('click',()=>{
    ipc.send('maximizeApp')
})
endBtn.addEventListener('click',()=>{
    ipc.send('closeApp')
})









function updateName(clientName){
    if (clientName !== ""){
        const labelClientName = capitalize(clientName)
        var clientNameLabel = document.getElementById('clientName');
        clientNameLabel.innerText = `Procesando para : ${labelClientName}`
    }
}

function updateProgress(progress) {
    
    var progressBar = document.getElementById('progressBar');
    var progressLabel = document.getElementById('progressLabel');

    progressBar.style.width = progress + '%';
    progressLabel.innerText = progress + '%';
    
}

function appendResult(processResult){
    if (processResult !== ""){
        var resumeDiv = document.createElement('div');
        resumeDiv.classList.add('resume');

        resumeDiv.style.color = 'white';
        resumeDiv.style.margin = '0';
        resumeDiv.style.marginLeft = '20px';
        resumeDiv.style.font = '13px Arial, sans-serif';
        resumeDiv.style.marginTop = '5px';

        // Populate the resume div with data (example)
        let resultLabel = processResult === "Success" ? "Exitoso" : "Fallido";
         

        resumeDiv.innerHTML = `
        <h3 style="font-weight: normal;">${capitalize(currentClient)} Completado : ${capitalize(resultLabel)}</h3>
        `;  
        var processResultContainer = document.getElementById('processResultContainer');
        processResultContainer.appendChild(resumeDiv);
    }
}

//  * Support Fucntions

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
