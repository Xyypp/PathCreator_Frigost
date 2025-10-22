// State management
let extensionStatus = 'checking';

// DOM elements
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Popup loaded');
    initializeTabs();
    checkExtensionStatus();
    setupEventListeners();
    loadConfiguration();
});

// Tab management
function initializeTabs() {
    const tabs = document.querySelectorAll('.config-tab');
    const panels = document.querySelectorAll('.config-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding panel
            const targetPanel = document.getElementById(`${targetTab}-panel`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// Extension status checking
async function checkExtensionStatus() {
    try {
        // Update status to checking
        updateStatus('checking', 'Vérification en cours...');
        
        // Query active tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab) {
            updateStatus('inactive', 'Impossible de vérifier le statut');
            return;
        }
        
        // Check if we're on DofusDB
        const isDofusDB = tab.url && (
            tab.url.includes('dofusdb.fr') || 
            tab.url.includes('dofusdb.com')
        );
        
        if (!isDofusDB) {
            updateStatus('inactive', 'Naviguez vers DofusDB pour utiliser l\'extension');
            return;
        }
        
        // Try to inject a simple test script to see if content script is loaded
        try {
            const result = await chrome.tabs.sendMessage(tab.id, {action: 'ping'});
            if (result && result.pong) {
                updateStatus('active', 'Extension active sur DofusDB');
            } else {
                updateStatus('inactive', 'Extension non chargée. Rafraîchissez la page.');
            }
        } catch (error) {
            updateStatus('inactive', 'Extension non chargée. Rafraîchissez la page.');
        }
        
    } catch (error) {
        console.error('Error checking extension status:', error);
        updateStatus('inactive', 'Erreur lors de la vérification');
    }
}

// Update status display
function updateStatus(status, message) {
    extensionStatus = status;
    
    // Update icon
    switch (status) {
        case 'checking':
            statusIcon.textContent = '🔄';
            statusIcon.className = 'status-icon';
            break;
        case 'active':
            statusIcon.textContent = '✅';
            statusIcon.className = 'status-icon';
            break;
        case 'inactive':
            statusIcon.textContent = '❌';
            statusIcon.className = 'status-icon';
            break;
    }
    
    // Update text
    statusText.textContent = message;
    statusText.className = `status-text ${status}`;
    
    // Add loading animation for checking state
    if (status === 'checking') {
        statusIcon.style.animation = 'spin 1s linear infinite';
    } else {
        statusIcon.style.animation = 'none';
    }
}

// Event listeners
function setupEventListeners() {
    // Link clicks
    const links = document.querySelectorAll('a[target="_blank"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            chrome.tabs.create({url: this.href});
        });
    });
    
    // Status refresh on click
    const statusSection = document.querySelector('.status-section');
    if (statusSection) {
        statusSection.addEventListener('click', function() {
            if (extensionStatus !== 'checking') {
                checkExtensionStatus();
            }
        });
        
        // Add cursor pointer to indicate clickable
        statusSection.style.cursor = 'pointer';
        statusSection.title = 'Cliquez pour actualiser le statut';
    }
    
    // Auto-travel checkbox
    const autoTravelCheckbox = document.getElementById('autoTravelEnabled');
    if (autoTravelCheckbox) {
        autoTravelCheckbox.addEventListener('change', function() {
            saveConfiguration();
        });
    }
}

// Configuration management
async function loadConfiguration() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab) return;
        
        // Send message to content script to get current config
        const result = await chrome.tabs.sendMessage(tab.id, {action: 'getConfig'});
        if (result && result.config) {
            const config = result.config;
            
            // Update auto-travel checkbox
            const autoTravelCheckbox = document.getElementById('autoTravelEnabled');
            if (autoTravelCheckbox) {
                autoTravelCheckbox.checked = config.autoTravel || false;
            }
        }
    } catch (error) {
        console.log('Could not load configuration:', error);
    }
}

async function saveConfiguration() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab) return;
        
        // Get current values
        const autoTravelCheckbox = document.getElementById('autoTravelEnabled');
        const config = {
            autoTravel: autoTravelCheckbox ? autoTravelCheckbox.checked : false
        };
        
        // Send to content script
        await chrome.tabs.sendMessage(tab.id, {
            action: 'updateConfig',
            config: config
        });
        
        console.log('Configuration saved:', config);
    } catch (error) {
        console.log('Could not save configuration:', error);
    }
}

// Message handling for content script communication
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'statusUpdate') {
        updateStatus(request.status, request.message);
    }
});

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 12px;
        z-index: 999999;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add to popup
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Debug functions (available in console)
window.debugPopup = {
    checkStatus: checkExtensionStatus,
    updateStatus: updateStatus,
    currentStatus: () => extensionStatus
};

// CSS for animations (in case not in CSS file)
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .status-section:hover {
        background: rgba(255, 255, 255, 0.05);
        transition: background 0.2s ease;
    }
`;
document.head.appendChild(style);

console.log('🎉 Popup script initialized'); 