let { app, BrowserWindow, nativeTheme } = require('electron');

(async function() {
    nativeTheme.themeSource = 'light';

    function createWindow() {
        let mainWindow = new BrowserWindow({
            width: 400,
            height: 800,
            webPreferences: { nodeIntegration: true }
        });
        
        mainWindow.setMenuBarVisibility(false);
        mainWindow.setMaximizable(false);
        //mainWindow.setResizable(false);
    
        mainWindow.on('will-resize', function(event) { event.preventDefault() });
        
        nativeTheme.themeSource = 'light';
    
        mainWindow.webContents.loadFile('controllers.html');
        mainWindow.webContents.openDevTools();
    }

    await app.whenReady();
    createWindow()

    //app.on('activate', function() { });
    //app.on('renderer-process-crashed', function(event) { console.log(event) });
    //app.on('renderer-process-crashed', function() { mainWindow.loadURL('inputs.html') });
    //app.on('activate', function() { if (BrowserWindow.getAllWindows().length == 0) { mainWindow = createWindow() } });
    app.on('window-all-closed', function() { if (process.platform != 'darwin') { app.quit() } });
})();