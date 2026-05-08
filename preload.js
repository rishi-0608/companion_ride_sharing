// Preload script - bridge between main and renderer
const { contextBridge } = require('electron');
const fs   = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // Reads an HTML partial file from the app root directory
  readPartial: (filename) => {
    const filePath = path.join(__dirname, filename);
    return fs.readFileSync(filePath, 'utf8');
  }
});
