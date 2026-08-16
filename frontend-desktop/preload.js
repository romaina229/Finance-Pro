const { contextBridge } = require('electron')

// Expose une API restreinte au renderer (frontend-web) au lieu de
// donner un accès Node.js complet, pour rester sécurisé.
// La couche offline (accès à la base SQLite locale via better-sqlite3)
// sera exposée ici au fur et à mesure, ex :
//
// contextBridge.exposeInMainWorld('localDb', {
//   getExpenses: () => ipcRenderer.invoke('db:getExpenses'),
//   saveExpense: (expense) => ipcRenderer.invoke('db:saveExpense', expense),
// })

contextBridge.exposeInMainWorld('ongFinancePro', {
  platform: process.platform,
  isDesktop: true,
})
