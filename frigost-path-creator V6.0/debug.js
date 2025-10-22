// Fonction de log
function log(message, type = 'info') {
    const logs = document.getElementById('logs');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.color = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db';
    logEntry.textContent = `[${timestamp}] ${message}`;
    logs.appendChild(logEntry);
    logs.scrollTop = logs.scrollHeight;
}

// Vérifier l'état de l'extension
function checkExtensionStatus() {
    const statusDiv = document.getElementById('extension-status');
    
    try {
        if (chrome && chrome.runtime && chrome.runtime.id) {
            statusDiv.innerHTML = '<div class="status success">✅ Extension active et fonctionnelle</div>';
            log('Extension active', 'success');
            
            // Afficher la version
            const manifest = chrome.runtime.getManifest();
            statusDiv.innerHTML += `<div>Version: ${manifest.version}</div>`;
            statusDiv.innerHTML += `<div>ID: ${chrome.runtime.id}</div>`;
        } else {
            statusDiv.innerHTML = '<div class="status error">❌ Extension non chargée correctement</div>';
            log('Extension non chargée', 'error');
        }
    } catch (e) {
        statusDiv.innerHTML = '<div class="status error">❌ Erreur: ' + e.message + '</div>';
        log('Erreur: ' + e.message, 'error');
    }
}

// Tester le content script
function testContentScript() {
    log('Test du content script...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            log('Aucun onglet actif trouvé', 'error');
            return;
        }
        
        const currentTab = tabs[0];
        log(`Onglet actuel: ${currentTab.url}`);
        
        if (!currentTab.url.includes('dofusdb.fr')) {
            log('Vous devez être sur DofusDB pour tester', 'warning');
            return;
        }
        
        chrome.tabs.sendMessage(currentTab.id, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                log('Content script non répondant: ' + chrome.runtime.lastError.message, 'error');
            } else if (response && response.pong) {
                log('Content script actif et répondant!', 'success');
            } else {
                log('Réponse inattendue du content script', 'warning');
            }
        });
    });
}

// Tester le storage
function testStorage() {
    log('Test du storage...');
    
    chrome.storage.local.get(null, (data) => {
        const storageDiv = document.getElementById('storage-data');
        
        if (Object.keys(data).length === 0) {
            storageDiv.innerHTML = '<div>Aucune donnée stockée</div>';
            log('Storage vide', 'warning');
        } else {
            storageDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            log(`${Object.keys(data).length} entrée(s) trouvée(s) dans le storage`, 'success');
        }
    });
}

// Effacer le storage
function clearStorage() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ?')) {
        chrome.storage.local.clear(() => {
            log('Storage effacé', 'success');
            testStorage(); // Rafraîchir l'affichage
        });
    }
}

// Recharger l'extension
function reloadExtension() {
    log('Rechargement de l\'extension...');
    chrome.runtime.reload();
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    log('Page de diagnostic chargée');
    checkExtensionStatus();
    testStorage();
}); 