# Technical Context - Frigost Path Creator V5

## 🛠️ Technology Stack

### Core Technologies
- **JavaScript ES6+**: Modern JavaScript with async/await, modules, classes
- **Chrome Extension APIs**: Manifest V3 compliance with service workers
- **HTML5/CSS3**: Modern web standards for UI components
- **Lua Script Generation**: Target language for Frigost bot framework

### Chrome Extension Framework
```json
{
  "manifest_version": 3,
  "name": "Frigost Path Creator V5",
  "version": "5.0",
  "permissions": ["activeTab", "storage", "clipboardWrite", "contextMenus", "scripting", "webNavigation"],
  "host_permissions": ["*://dofusdb.fr/*"]
}
```

### Development Environment
- **Browser**: Chrome/Chromium-based browsers
- **Development Tools**: Chrome DevTools, Extension Developer Mode
- **Version Control**: Git-based workflow
- **Documentation**: Markdown-based Memory Bank system

## 🏗️ Architecture Components

### 1. Content Script (`content/content.js`)
**Purpose**: Integrates with DofusDB pages for coordinate detection and UI injection

**Key Responsibilities**:
- DOM manipulation and event handling on DofusDB pages
- Coordinate detection from multiple sources
- Visual marker management
- Real-time user interface injection

**Technical Details**:
- **Size**: ~83KB, 1969 lines
- **Injection**: Runs at `document_end` for reliable DOM access
- **Scope**: Isolated from page scripts for security

```javascript
// Core coordinate detection function
async function findDofusDBCoordinates() {
    // Priority strategy for specific DofusDB elements
    const specificElement = document.querySelector(
        'div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed'
    );
    // ... multiple fallback strategies
}
```

### 2. Popup Interface (`popup/`)
**Purpose**: User control panel and configuration interface

**Components**:
- `popup.html` (12KB, 246 lines): Structure and layout
- `popup.js` (7.9KB, 260 lines): Logic and Chrome API integration
- `popup.css` (6.6KB, 389 lines): Styling and responsive design

**Features**:
- Recording start/stop controls
- Action type selection (combat/gather)
- Export format options
- Settings and configuration

### 3. Background Service Worker (`background.js`)
**Purpose**: Persistent state management and inter-component communication

**Key Functions**:
- Message routing between popup and content script
- Data persistence using Chrome Storage API
- Context menu management
- Extension lifecycle management

**Technical Details**:
- **Size**: ~3.8KB, 107 lines
- **Type**: Service Worker (Manifest V3 requirement)
- **Persistence**: Event-driven activation

### 4. Styling System (`content/content.css`)
**Purpose**: Visual integration with DofusDB interface

**Features**:
- **Size**: ~20KB, 923 lines
- Dark theme integration
- Responsive marker system
- Non-intrusive UI overlay
- Animation and transition effects

## 🔧 Technical Constraints

### Chrome Extension Limitations
- **Content Security Policy**: No inline scripts or eval()
- **Permissions Model**: Minimal required permissions
- **Manifest V3**: Service Worker instead of background pages
- **Cross-Origin**: Limited to specified host permissions

### DofusDB Integration Challenges
- **Dynamic Content**: Maps loaded via JavaScript
- **Multiple URL Patterns**: Different language versions
- **Coordinate Formats**: Various display methods
- **DOM Structure Changes**: Requires robust selectors

### Performance Requirements
- **Memory Usage**: <50MB peak consumption
- **CPU Impact**: <5% during active use
- **Response Time**: <100ms for user interactions
- **Load Time**: <500ms extension initialization

## 📡 API Integration

### Chrome Extension APIs Used

#### Storage API
```javascript
// Persistent data storage
await chrome.storage.local.set({ pathData: currentPath });
const { pathData } = await chrome.storage.local.get('pathData');
```

#### Runtime Messaging
```javascript
// Inter-component communication
chrome.runtime.sendMessage({
    type: 'COORDINATE_DETECTED',
    data: { x: -16, y: -22 }
});
```

#### Clipboard API
```javascript
// Script export functionality
await navigator.clipboard.writeText(generatedScript);
```

#### Scripting API
```javascript
// Dynamic content script injection
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/content.js']
});
```

### DofusDB Integration Points

#### Coordinate Detection Selectors
```javascript
const dofusDBSelectors = [
    'div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed', // Primary
    'div.bg-darker.text-white.text-bold',                        // Fallback
    '[class*="tooltip"]',                                        // Generic
    '[data-tooltip]'                                             // Attribute-based
];
```

#### URL Pattern Matching
```javascript
const supportedPatterns = [
    "*://dofusdb.fr/map/tools/map*",
    "*://dofusdb.fr/fr/tools/map*",
    "*://dofusdb.fr/tools/map*",
    "*://dofusdb.fr/*/tools/map*"
];
```

## 🎯 Frigost Framework Integration

### Lua Script Generation
**Target Framework**: Official Frigost Bot Syntax

#### Core Parameters Support
```lua
-- Generated script structure
MAX_MONSTERS = 8
MIN_MONSTERS = 2
GATHER = { 254, 255, -256 }  -- Positive = gather, negative = avoid
AUTO_DELETE = { "Pain", "Eau" }
PLANNING = { start = 8, stop = 23 }

mapActionsTable = {
    { map = "-16,-22", path = "right", fight = true },
    { map = "-15,-22", path = "bottom", fight = true }
}
```

#### Script Templates
- **Complete Script**: Full bot implementation with functions
- **Route Table**: Just the mapActionsTable data
- **JSON Export**: Structured data for other tools

### Coordinate System Compatibility
```javascript
// Dofus coordinate validation
function isValidDofusCoordinate(x, y) {
    return Number.isInteger(x) && 
           Number.isInteger(y) && 
           x >= -100 && x <= 100 && 
           y >= -100 && y <= 100;
}
```

## 🔍 Debugging and Development Tools

### Built-in Debugging System
```javascript
// Advanced coordinate debugging
function debugAllCoordinatesOnPage() {
    const elements = document.querySelectorAll('*');
    return Array.from(elements)
        .map(el => ({
            element: el,
            coordinates: extractCoordinatesFromElement(el),
            zIndex: getComputedStyle(el).zIndex,
            visibility: isElementVisible(el)
        }))
        .filter(item => item.coordinates)
        .sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex));
}
```

### Development Utilities
- **Test HTML Pages**: Standalone testing environments
- **Debug Console**: Comprehensive logging system
- **Parameter Testing**: Validation for different configurations
- **Performance Monitoring**: Memory and CPU usage tracking

## 🛡️ Security Implementation

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Permission Justification
- **activeTab**: Required for DofusDB page interaction
- **storage**: Persistent user data and settings
- **clipboardWrite**: Script export functionality
- **contextMenus**: Right-click debugging tools
- **scripting**: Dynamic content script injection
- **webNavigation**: URL change detection

### Data Security
- **Local Storage Only**: No external data transmission
- **Input Sanitization**: All user inputs validated
- **XSS Prevention**: No innerHTML usage with user data
- **CSRF Protection**: No cross-origin requests

## 📊 Performance Optimization

### Memory Management
```javascript
// Efficient marker cleanup
class MarkerManager {
    constructor() {
        this.markers = new Map();
    }
    
    cleanup() {
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();
    }
}
```

### Event Optimization
```javascript
// Debounced coordinate detection
const debouncedDetection = debounce(detectCoordinates, 300);

// Event delegation for map clicks
document.addEventListener('click', handleMapClick, { passive: true });
```

### Code Splitting
- **Lazy Loading**: Heavy components loaded on demand
- **Modular Architecture**: Separate concerns into focused modules
- **Minimal Initial Load**: Core functionality first, enhancements second

## 🧪 Testing Strategy

### Manual Testing Scenarios
1. **Coordinate Detection**: Various DofusDB page states
2. **Negative Coordinates**: Frigost zone testing (-16,-22)
3. **Export Formats**: All output format validation
4. **Performance**: Memory and CPU usage monitoring
5. **Cross-Browser**: Chrome, Edge, Brave compatibility

### Automated Testing Considerations
- **Unit Tests**: Core coordinate detection functions
- **Integration Tests**: Chrome API interactions
- **E2E Tests**: Full user workflow validation
- **Performance Tests**: Memory leak detection

## 🔄 Deployment and Distribution

### Development Workflow
1. **Local Development**: Chrome Developer Mode
2. **Testing**: Manual validation on DofusDB
3. **Packaging**: Extension folder preparation
4. **Distribution**: Direct installation (no Chrome Web Store)

### Version Management
- **Semantic Versioning**: Major.Minor.Patch format
- **Changelog Tracking**: Detailed version history
- **Backward Compatibility**: Settings migration support

---

**Technical Philosophy**: "Build with modern web standards, optimize for performance, ensure reliability through robust error handling." 