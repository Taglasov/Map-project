const { app, BrowserWindow } = require('electron');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1000, // Ширина окна
        height: 800, // Высота окна
        webPreferences: {
            contextIsolation: false, // Безопасность
        }
    });

    mainWindow.loadFile('index.html'); // Укажите ваш HTML-файл

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
