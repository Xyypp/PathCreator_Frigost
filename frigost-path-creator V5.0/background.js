// Background script for Frigost Path Creator

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Frigost Path Creator] Extension installed or updated:', details.reason);
    
    // Initialize storage with default values
    chrome.storage.local.get(['isRecording', 'pathData', 'startingMap'], (result) => {
        if (result.isRecording === undefined) {
            chrome.storage.local.set({
                isRecording: false,
                pathData: [],
                startingMap: null
            });
        }
    });
    
    // Create context menu only on install/update to avoid duplicate ID error
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'debugFrigostPathCreator',
            title: 'Diagnostiquer Frigost Path Creator',
            contexts: ['page'],
            documentUrlPatterns: ['*://dofusdb.fr/*']
        });
    });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Frigost Path Creator Background] Received message:', message);
    
    // Forward path updates to popup if it's open
    if (message.action === 'pathUpdate') {
        chrome.runtime.sendMessage(message);
    }
    
    return true; // Keep the message channel open for async response
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'debugFrigostPathCreator') {
        chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
    }
});

// Utility: inject content script & CSS into a tab
function injectContentScripts(tabId) {
    // Check if we've already injected to avoid duplicates
    chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            if (window.__frigostPathCreatorInjected) {
                return 'already';
            }
            window.__frigostPathCreatorInjected = true;
            return 'inject';
        }
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.warn('[Frigost Path Creator] Injection check failed:', chrome.runtime.lastError.message);
            return;
        }
        const result = results && results[0] && results[0].result;
        if (result === 'already') {
            // Script already injected
            return;
        }
        // Inject CSS first
        chrome.scripting.insertCSS({
            target: { tabId },
            files: ['content/content.css']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Frigost Path Creator] Failed to insert CSS:', chrome.runtime.lastError.message);
            }
        });
        // Inject JS
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Frigost Path Creator] Failed to inject content script:', chrome.runtime.lastError.message);
            } else {
                console.log('[Frigost Path Creator] Content script injected via background');
            }
        });
    });
}

// Listen for SPA navigation events in DofusDB
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) return; // only top frame
    if (/^https?:\/\/[^\/]*dofusdb\.fr\/.*tools\/map/.test(details.url)) {
        injectContentScripts(details.tabId);
    }
});

// Also inject when a qualifying page finishes loading (in case loaded directly)
chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId !== 0) return;
    if (/^https?:\/\/[^\/]*dofusdb\.fr\/.*tools\/map/.test(details.url)) {
        injectContentScripts(details.tabId);
    }
}); 