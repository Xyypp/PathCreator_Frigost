# System Patterns - Frigost Path Creator V5

## 🏗️ Architecture Overview

### High-Level System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DofusDB Web   │    │  Chrome Ext.    │    │  Frigost Bot    │
│      Page       │◄──►│   Framework     │◄──►│   Framework     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Content Script  │    │ Background SW   │    │  Generated      │
│ (Map Interface) │    │ (Data Persist.) │    │  Lua Scripts    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Popup Interface │    │ Chrome Storage  │    │ Bot Execution   │
│ (User Controls) │    │ (State Mgmt.)   │    │ (Game Actions)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Relationships
- **Content Script** ↔ **DofusDB Page**: Direct DOM manipulation and event handling
- **Popup Interface** ↔ **Background Service**: Message passing for state management
- **Background Service** ↔ **Chrome Storage**: Persistent data storage
- **Content Script** ↔ **Popup Interface**: Runtime messaging for coordination

## 🔧 Core Design Patterns

### 1. Observer Pattern - Event-Driven Architecture
```javascript
// Event system for coordinate detection
class CoordinateDetector {
    constructor() {
        this.observers = [];
    }
    
    subscribe(callback) {
        this.observers.push(callback);
    }
    
    notify(coordinates) {
        this.observers.forEach(callback => callback(coordinates));
    }
}
```

**Usage**: Map click events trigger coordinate detection, which notifies UI updates and path building.

### 2. Strategy Pattern - Multiple Detection Methods
```javascript
// Multiple strategies for coordinate detection
const detectionStrategies = [
    priorityDofusDBStrategy,    // Target specific DofusDB elements
    debugAnalysisStrategy,      // Advanced element analysis
    urlExtractionStrategy,      // Fallback to URL parsing
    fallbackStrategy           // Default coordinates
];
```

**Usage**: Handles different DofusDB page variations and coordinate formats.

### 3. Command Pattern - Action Management
```javascript
// Encapsulate user actions for undo/redo
class PathAction {
    constructor(type, coordinates, config) {
        this.type = type;
        this.coordinates = coordinates;
        this.config = config;
    }
    
    execute() { /* Add to path */ }
    undo() { /* Remove from path */ }
}
```

**Usage**: Path building, marker management, and undo functionality.

### 4. Factory Pattern - Script Generation
```javascript
// Generate different script formats
class ScriptFactory {
    static create(format, pathData) {
        switch(format) {
            case 'complete': return new CompleteScriptGenerator(pathData);
            case 'route': return new RouteTableGenerator(pathData);
            case 'json': return new JSONGenerator(pathData);
        }
    }
}
```

**Usage**: Multiple export formats with consistent interface.

## 📡 Communication Patterns

### Message Passing Architecture
```javascript
// Content Script → Background → Popup
chrome.runtime.sendMessage({
    type: 'COORDINATE_DETECTED',
    data: { x: -16, y: -22, action: 'fight' }
});

// Popup → Background → Content Script
chrome.runtime.sendMessage({
    type: 'UPDATE_PATH',
    data: { pathIndex: 3, newAction: 'gather' }
});
```

### State Synchronization Pattern
```javascript
// Centralized state management
class StateManager {
    constructor() {
        this.state = {
            isRecording: false,
            currentPath: [],
            settings: {}
        };
    }
    
    async syncState() {
        await chrome.storage.local.set({ appState: this.state });
        this.notifyComponents();
    }
}
```

## 🎯 Coordinate Detection System

### Multi-Strategy Detection Pattern
```javascript
async function findDofusDBCoordinates() {
    // Strategy 1: Priority DofusDB element
    const specificElement = document.querySelector(
        'div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed'
    );
    if (specificElement) return extractCoordinates(specificElement);
    
    // Strategy 2: Advanced element analysis
    const debugResults = debugAllCoordinatesOnPage();
    const priorityElement = findHighestPriorityElement(debugResults);
    if (priorityElement) return extractCoordinates(priorityElement);
    
    // Strategy 3: URL fallback
    return extractCoordinatesFromURL();
}
```

### Coordinate Validation Pattern
```javascript
function isValidDofusCoordinate(x, y) {
    return Number.isInteger(x) && 
           Number.isInteger(y) && 
           x >= -100 && x <= 100 && 
           y >= -100 && y <= 100;
}
```

## 🎨 UI Component Patterns

### Progressive Enhancement Pattern
```javascript
// Base functionality works without JavaScript
// Enhanced features added progressively
class UIEnhancer {
    constructor() {
        this.baseFeatures = ['click-to-add', 'basic-export'];
        this.enhancedFeatures = ['visual-markers', 'keyboard-shortcuts', 'undo-redo'];
    }
    
    initialize() {
        this.enableBaseFeatures();
        if (this.supportsEnhancedFeatures()) {
            this.enableEnhancedFeatures();
        }
    }
}
```

### Component Lifecycle Pattern
```javascript
class PathMarker {
    constructor(coordinates, index) {
        this.coordinates = coordinates;
        this.index = index;
        this.element = null;
    }
    
    mount() { /* Create DOM element */ }
    update(newData) { /* Update display */ }
    unmount() { /* Clean up DOM */ }
}
```

## 🔄 Data Flow Patterns

### Unidirectional Data Flow
```
User Action → State Update → UI Re-render → DOM Update
     ↑                                           ↓
Event Handler ←── DOM Event ←── User Interaction
```

### Reactive Updates Pattern
```javascript
// Reactive path updates
class PathManager {
    constructor() {
        this.path = [];
        this.subscribers = [];
    }
    
    addPoint(coordinates) {
        this.path.push(coordinates);
        this.notifySubscribers();
    }
    
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.path));
    }
}
```

## 🛡️ Error Handling Patterns

### Graceful Degradation Pattern
```javascript
async function detectCoordinates() {
    try {
        return await advancedDetection();
    } catch (error) {
        console.warn('Advanced detection failed, using fallback');
        try {
            return await basicDetection();
        } catch (fallbackError) {
            console.error('All detection methods failed');
            return getDefaultCoordinates();
        }
    }
}
```

### Circuit Breaker Pattern
```javascript
class CoordinateDetectionCircuitBreaker {
    constructor() {
        this.failureCount = 0;
        this.threshold = 5;
        this.isOpen = false;
    }
    
    async execute(detectionFunction) {
        if (this.isOpen) {
            return this.fallbackDetection();
        }
        
        try {
            const result = await detectionFunction();
            this.reset();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }
}
```

## 📊 Performance Patterns

### Lazy Loading Pattern
```javascript
// Load heavy components only when needed
class ScriptGenerator {
    constructor() {
        this.templates = null;
    }
    
    async getTemplates() {
        if (!this.templates) {
            this.templates = await import('./script-templates.js');
        }
        return this.templates;
    }
}
```

### Debouncing Pattern
```javascript
// Prevent excessive coordinate detection calls
const debouncedDetection = debounce(detectCoordinates, 300);

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

## 🔐 Security Patterns

### Content Security Policy Compliance
```javascript
// No inline scripts, use message passing
// No eval(), use structured data
// Minimal permissions in manifest
{
    "permissions": ["activeTab", "storage", "clipboardWrite"],
    "host_permissions": ["*://dofusdb.fr/*"]
}
```

### Input Sanitization Pattern
```javascript
function sanitizeCoordinates(input) {
    const x = parseInt(input.x, 10);
    const y = parseInt(input.y, 10);
    
    if (!isValidDofusCoordinate(x, y)) {
        throw new Error('Invalid coordinates');
    }
    
    return { x, y };
}
```

## 🧪 Testing Patterns

### Mock Strategy Pattern
```javascript
// Mock different DofusDB page states for testing
class MockDofusDBPage {
    constructor(scenario) {
        this.scenario = scenario;
    }
    
    setupDOM() {
        switch(this.scenario) {
            case 'negative-coordinates':
                return this.createNegativeCoordElements();
            case 'positive-coordinates':
                return this.createPositiveCoordElements();
        }
    }
}
```

---

**Architecture Philosophy**: "Build for reliability first, optimize for performance second, enhance for user experience third." 