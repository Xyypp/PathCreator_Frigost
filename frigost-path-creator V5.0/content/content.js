// État global (protection contre les déclarations multiples)
if (typeof window.frigostPathCreator === 'undefined') {
    // Load config from localStorage if available
    let savedConfig = {};
    try {
        const saved = localStorage.getItem('frigostPathCreatorConfig');
        if (saved) {
            savedConfig = JSON.parse(saved);
            debug('💾 Configuration chargée depuis localStorage:', savedConfig);
        }
    } catch (error) {
        console.error('Failed to load config from localStorage:', error);
    }
    
    window.frigostPathCreator = {
        currentPath: [],
        selectedActions: new Set(),
        selectedDirections: new Set(),
        initialized: false,
        config: {
            maxMonsters: '8',
            minMonsters: '2',
            forceMonsters: '',
            forbiddenMonsters: '',
            amountMonsters: '',
            gatherResources: '',
            autoDeleteResources: '',
            planningHours: '',
            startX: '',
            startY: '',
            startDelay: '',
            mapChangeDelay: '2000',
            mapDelayRandom: true,
            autoTravel: false,
            ...savedConfig // Override with saved config
        }
    };
}

// Références directes aux objets globaux (pas de déclarations locales pour éviter les conflits)
// Utilisation directe de window.frigostPathCreator.currentPath, etc.


// Configuration globale (déjà définie ci-dessus)

// Configuration
const DEBUG = true; // Activé pour diagnostiquer les coordonnées
function debug(...args) {
    if (DEBUG) console.log('[FrigostPathCreator]', ...args);
}

// Fonction de diagnostic pour analyser les éléments DofusDB
function debugDofusDBElements() {
    debug('🔍 DIAGNOSTIC: Analyse des éléments DofusDB...');
    
    // Chercher tous les éléments contenant des chiffres qui pourraient être des coordonnées
    const allElements = document.querySelectorAll('*');
    const potentialCoordElements = [];
    
    allElements.forEach(element => {
        if (element.textContent && element.textContent.match(/\d+/)) {
            const text = element.textContent.trim();
            const style = getComputedStyle(element);
            
            // Filtrer les éléments visibles avec des patterns de coordonnées
            if (style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null) {
                if (text.match(/\d+\s*[,:/]\s*\d+/) || text.match(/\[\d+\s*,\s*\d+\]/)) {
                    potentialCoordElements.push({
                        element,
                        text: text.substring(0, 100),
                        className: element.className,
                        id: element.id,
                        tagName: element.tagName,
                        zIndex: parseInt(style.zIndex) || 0
                    });
                }
            }
        }
    });
    
    // Trier par z-index (les tooltips ont généralement un z-index élevé)
    potentialCoordElements.sort((a, b) => b.zIndex - a.zIndex);
    
    debug('📊 Éléments potentiels trouvés:', potentialCoordElements.slice(0, 10));
    
    return potentialCoordElements;
}

// Exposer les fonctions de diagnostic globalement pour tests
window.debugDofusDB = debugDofusDBElements;
window.testCoordExtraction = function() {
    debug('🧪 TEST: Extraction des coordonnées...');
    const coords = findDofusDBCoordinates();
    if (coords) {
        console.log(`✅ Coordonnées trouvées: (${coords.x}, ${coords.y})`);
        return coords;
    } else {
        console.log('❌ Aucune coordonnée trouvée');
        return null;
    }
};

// Fonction pour surveiller en continu les coordonnées (pour debug)
window.startCoordMonitoring = function() {
    if (window.coordMonitorInterval) {
        clearInterval(window.coordMonitorInterval);
    }
    
    console.log('🔄 Démarrage de la surveillance des coordonnées...');
    window.coordMonitorInterval = setInterval(() => {
        const coords = findDofusDBCoordinates();
        if (coords) {
            console.log(`📍 Coordonnées actuelles: (${coords.x}, ${coords.y})`);
        }
    }, 2000);
};

window.stopCoordMonitoring = function() {
    if (window.coordMonitorInterval) {
        clearInterval(window.coordMonitorInterval);
        window.coordMonitorInterval = null;
        console.log('⏹️ Surveillance des coordonnées arrêtée');
    }
};



// Interface utilisateur
function createPathCreatorUI() {
    debug("Création de l'interface utilisateur...");
    
    // Vérifier si l'interface existe déjà
    const existingUI = document.querySelector('.frigost-path-creator');
    if (existingUI) {
        debug("Interface déjà présente, suppression de l'ancienne...");
        existingUI.remove();
    }
    
    const ui = document.createElement('div');
    ui.className = 'frigost-path-creator';
    ui.innerHTML = `
        <div class="header">
            <h2>❄️🗺️ Frigost Path Creator</h2>
            <div class="version">v3.0 📋 Syntaxe Officielle</div>
        </div>
        
        <div class="section">
            <h3>🎯 Actions</h3>
            <div class="action-buttons">
                <button class="action-btn" data-action="combat" title="Combat">⚔️ Combat</button>
                <button class="action-btn" data-action="recolte" title="Récolte">🌿 Récolte</button>
            </div>
        </div>
        
        <div class="section">
            <h3>🧭 Direction de sortie</h3>
            <div class="direction-grid">
                <button class="dir-btn" data-direction="top" title="Haut (Z)">⬆️</button>
                <button class="dir-btn" data-direction="left" title="Gauche (Q)">⬅️</button>
                <div class="joystick-center" title="Centre du joystick">🗺️</div>
                <button class="dir-btn" data-direction="right" title="Droite (D)">➡️</button>
                <button class="dir-btn" data-direction="bottom" title="Bas (S)">⬇️</button>
            </div>
        </div>
        
        <div class="section">
            <h3>📍 Chemin (<span class="path-count">0</span> points)</h3>
            <div class="path-points">
                <div class="empty-path">Aucun point ajouté<br><small>🖱️ Cliquez sur la carte pour commencer</small></div>
            </div>
        </div>
        
        <div class="section">
            <div class="control-buttons">
                <button class="control-btn copy-btn" title="Copier le chemin">📋 Copier</button>
                <button class="control-btn clear-btn" title="Effacer tout">🗑️ Effacer</button>
                <button class="control-btn undo-btn" title="Annuler (Ctrl+Z)">↩️ Annuler</button>
            </div>
        </div>
        
        <div class="section collapsible">
            <h3 class="section-header" data-section="monsters">
                <span class="toggle-icon">▼</span> 👹 Configuration Monstres (Frigost Officiel)
            </h3>
            <div class="section-content" id="monsters-content">
                <div class="config-item">
                    <label>🔢 MAX_MONSTERS (1-8):</label>
                    <input type="number" id="max-monsters" min="1" max="8" value="8" title="Nombre maximum de monstres dans un groupe">
                    <small>Syntaxe: MAX_MONSTERS = 8</small>
                </div>
                <div class="config-item">
                    <label>🔢 MIN_MONSTERS (1-8):</label>
                    <input type="number" id="min-monsters" min="1" max="8" value="2" title="Nombre minimum de monstres dans un groupe">
                    <small>Syntaxe: MIN_MONSTERS = 2</small>
                </div>
                <div class="config-item">
                    <label>✅ FORCE_MONSTERS (IDs obligatoires):</label>
                    <input type="text" id="force-monsters" placeholder="Ex: 4845, 2321, 4236" title="IDs des monstres obligatoires dans le groupe">
                    <small>Syntaxe: FORCE_MONSTERS = { 4845, 2321, 4236 }</small>
                </div>
                <div class="config-item">
                    <label>❌ FORBIDDEN_MONSTERS (IDs interdits):</label>
                    <input type="text" id="forbidden-monsters" placeholder="Ex: 5896, 4564" title="IDs des monstres interdits dans le groupe">
                    <small>Syntaxe: FORBIDDEN_MONSTERS = { 5896, 4564 }</small>
                </div>
                <div class="config-item">
                    <label>📊 AMOUNT_MONSTERS (ID, min, max):</label>
                    <textarea id="amount-monsters" rows="2" placeholder="Ex: 236, 2, 4&#10;489, 4, 4" title="Format: ID, nbrMin, nbrMax (une ligne par monstre)"></textarea>
                    <small>Syntaxe: AMOUNT_MONSTERS = { {236, 2, 4}, {489, 4, 4} }</small>
                </div>
            </div>
        </div>
        
        <div class="section collapsible">
            <h3 class="section-header" data-section="resources">
                <span class="toggle-icon">▼</span> 🌱 Configuration Ressources (Frigost Officiel)
            </h3>
            <div class="section-content" id="resources-content">
                <div class="config-item">
                    <label>🌿 GATHER (IDs ressources):</label>
                    <input type="text" id="gather-resources" placeholder="Ex: 254, 255, -67" title="IDs positifs = récolter, IDs négatifs = éviter">
                    <small>Syntaxe: GATHER = { 254, 255, -67 } (négatif = éviter)</small>
                </div>
                <div class="config-item">
                    <label>🗑️ AUTO_DELETE (IDs objets):</label>
                    <input type="text" id="auto-delete" placeholder="Ex: 156, 5478, 546, 1221" title="IDs des objets à supprimer automatiquement">
                    <small>Syntaxe: AUTO_DELETE = { 156, 5478, 546, 1221 }</small>
                </div>
            </div>
        </div>
        
        <div class="section collapsible">
            <h3 class="section-header" data-section="planning">
                <span class="toggle-icon">▼</span> ⏰ Planning Déconnexion (Frigost Officiel)
            </h3>
            <div class="section-content" id="planning-content">
                <div class="config-item">
                    <label>🕐 PLANNING (heures 0-23):</label>
                    <input type="text" id="planning-hours" placeholder="Ex: 1, 2, 4, 20, 21, 22" title="Heures de déconnexion automatique (0-23)">
                    <small>Syntaxe: PLANNING = { 1, 2, 4, 20, 21, 22 }</small>
                </div>
            </div>
        </div>
        
        <div class="section collapsible">
            <h3 class="section-header" data-section="startpos">
                <span class="toggle-icon">▼</span> 🗺️ Position de Départ
            </h3>
            <div class="section-content" id="startpos-content">
                <div class="config-item">
                    <label>📍 Coordonnées de départ (optionnel):</label>
                    <div class="coordinate-inputs">
                        <input type="number" id="start-x" placeholder="X (ex: -25)" title="Coordonnée X">
                        <input type="number" id="start-y" placeholder="Y (ex: -36)" title="Coordonnée Y">
                    </div>
                    <small>💡 Le bot se téléportera automatiquement à cette position au démarrage</small>
                </div>
                <div class="config-item">
                    <label>⏱️ Délai d'attente (ms) - Obligatoire si coordonnées spécifiées:</label>
                    <input type="number" id="start-delay" placeholder="Ex: 5000" min="1000" max="30000" title="Temps d'attente en millisecondes après la téléportation">
                    <small>⚠️ Temps nécessaire pour que le personnage arrive à destination (recommandé: 3000-8000ms)</small>
                </div>
            </div>
        </div>
        
        <div class="section collapsible">
            <h3 class="section-header" data-section="mapdelay">
                <span class="toggle-icon">▼</span> ⏱️ Délais de Changement de Carte
            </h3>
            <div class="section-content" id="mapdelay-content">
                <div class="config-item">
                    <label>🕐 Délai de base avant changement de carte (ms):</label>
                    <input type="number" id="map-change-delay" placeholder="Ex: 2000" min="0" max="10000" value="2000" title="Délai en millisecondes avant chaque changement de carte">
                    <small>💡 Délai de base appliqué avant chaque changement de carte (0 = désactivé)</small>
                </div>
                <div class="config-item">
                    <label>🎲 Mode aléatoire:</label>
                    <div class="checkbox-container">
                        <input type="checkbox" id="map-delay-random" checked title="Active la variation aléatoire du délai">
                        <label for="map-delay-random">Varier le délai aléatoirement (jusqu'au double)</label>
                    </div>
                    <small>🎯 Si activé, le délai variera entre la valeur de base et le double (ex: 2000ms → 2000-4000ms)</small>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(ui);
    debug("Interface créée et ajoutée au DOM");
    
    // Configurer les événements
    setupEventListeners(ui);
    
    // Charger les valeurs de configuration dans l'interface
    loadConfigurationIntoUI();
    
    return ui;
}

// Fonction pour basculer l'affichage des sections
function toggleSection(sectionId) {
    const content = document.getElementById(`${sectionId}-content`);
    if (!content) {
        debug(`Erreur: Section ${sectionId} non trouvée`);
        return;
    }
    
    const header = content.parentElement.querySelector('.section-header');
    const icon = header ? header.querySelector('.toggle-icon') : null;
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (icon) {
            icon.textContent = '▼';
            icon.style.transform = 'rotate(0deg)';
        }
        debug(`Section ${sectionId} ouverte`);
        showNotification(`Configuration ${sectionId} ouverte`, 'info');
    } else {
        content.classList.add('collapsed');
        if (icon) {
            icon.textContent = '▶';
            icon.style.transform = 'rotate(-90deg)';
        }
        debug(`Section ${sectionId} fermée`);
        showNotification(`Configuration ${sectionId} fermée`, 'info');
    }
}

// Fonction pour charger la configuration dans l'interface
function loadConfigurationIntoUI() {
    debug('🔄 Chargement de la configuration dans l\'interface...');
    
    const config = window.frigostPathCreator.config;
    
    // Charger les valeurs dans les champs
    const fieldMappings = {
        'max-monsters': config.maxMonsters,
        'min-monsters': config.minMonsters,
        'force-monsters': config.forceMonsters,
        'forbidden-monsters': config.forbiddenMonsters,
        'amount-monsters': config.amountMonsters,
        'gather-resources': config.gatherResources,
        'auto-delete': config.autoDeleteResources,
        'planning-hours': config.planningHours,
        'start-x': config.startX,
        'start-y': config.startY,
        'start-delay': config.startDelay,
        'map-change-delay': config.mapChangeDelay
    };
    
    Object.entries(fieldMappings).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field && value !== undefined) {
            field.value = value;
            debug(`📝 Champ ${fieldId} initialisé avec: ${value}`);
        }
    });
    
    // Charger la checkbox du mode aléatoire
    const mapDelayRandomCheckbox = document.getElementById('map-delay-random');
    if (mapDelayRandomCheckbox) {
        mapDelayRandomCheckbox.checked = config.mapDelayRandom !== false;
        debug(`☑️ Checkbox mode aléatoire initialisée: ${mapDelayRandomCheckbox.checked}`);
    }
    
    debug('✅ Configuration chargée dans l\'interface');
}

// Fonction pour sauvegarder la configuration
function saveConfiguration() {
    try {
        localStorage.setItem('frigostPathCreatorConfig', JSON.stringify(window.frigostPathCreator.config));
        debug('💾 Configuration sauvegardée:', window.frigostPathCreator.config);
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde de la configuration:', error);
    }
}





// Gestionnaires d'événements
function setupEventListeners(ui) {
    // Configuration inputs
    const inputMappings = {
        'min-monsters': 'minMonsters',
        'max-monsters': 'maxMonsters',
        'force-monsters': 'forceMonsters',
        'forbidden-monsters': 'forbiddenMonsters',
        'amount-monsters': 'amountMonsters',
        'gather-resources': 'gatherResources',
        'auto-delete': 'autoDeleteResources',
        'planning-hours': 'planningHours',
        'start-x': 'startX',
        'start-y': 'startY',
        'start-delay': 'startDelay',
        'map-change-delay': 'mapChangeDelay'
    };
    
    Object.entries(inputMappings).forEach(([id, configKey]) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', (e) => {
                window.frigostPathCreator.config[configKey] = e.target.value.trim();
                debug(`${configKey} mis à jour:`, window.frigostPathCreator.config[configKey]);
                saveConfiguration();
            });
        }
    });

    // Checkbox pour le mode aléatoire des délais
    const mapDelayRandomCheckbox = document.getElementById('map-delay-random');
    if (mapDelayRandomCheckbox) {
        mapDelayRandomCheckbox.addEventListener('change', (e) => {
            window.frigostPathCreator.config.mapDelayRandom = e.target.checked;
            debug('mapDelayRandom mis à jour:', window.frigostPathCreator.config.mapDelayRandom);
            saveConfiguration();
        });
    }

    // Boutons d'action
    ui.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (window.frigostPathCreator.selectedActions.has(action)) {
                window.frigostPathCreator.selectedActions.delete(action);
                btn.classList.remove('active');
                debug(`Action ${action} désélectionnée`);
            } else {
                window.frigostPathCreator.selectedActions.add(action);
                btn.classList.add('active');
                debug(`Action ${action} sélectionnée`);
            }
            debug('Actions actuellement sélectionnées:', Array.from(window.frigostPathCreator.selectedActions));
            
            // Mise à jour visuelle immédiate
            updateActionButtons();
        });
    });

    // Boutons de direction
    ui.querySelectorAll('.dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.dataset.direction;
            if (window.frigostPathCreator.selectedDirections.has(dir)) {
                window.frigostPathCreator.selectedDirections.delete(dir);
                btn.classList.remove('active');
            } else {
                window.frigostPathCreator.selectedDirections.add(dir);
                btn.classList.add('active');
            }
            debug('Directions sélectionnées:', Array.from(window.frigostPathCreator.selectedDirections));
        });
    });

    // Boutons de contrôle
    const copyBtn = ui.querySelector('.copy-btn');
    const clearBtn = ui.querySelector('.clear-btn');
    const undoBtn = ui.querySelector('.undo-btn');
    
    if (copyBtn) copyBtn.addEventListener('click', exportPath);
    if (clearBtn) clearBtn.addEventListener('click', clearPath);
    if (undoBtn) undoBtn.addEventListener('click', undoLastAction);

    // Sections accordéon
    ui.querySelectorAll('.section-header[data-section]').forEach(header => {
        header.addEventListener('click', () => {
            const sectionId = header.dataset.section;
            toggleSection(sectionId);
        });
    });

    // Lien Discord
    const discordLink = document.getElementById('discordLink');
    if (discordLink) {
        discordLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Copier le handle Discord dans le presse-papiers
            navigator.clipboard.writeText('.ryutenchi').then(() => {
                showNotification('💬 Handle Discord copié: .ryutenchi', 'success');
                debug('Handle Discord copié dans le presse-papiers');
            }).catch(() => {
                showNotification('💬 Handle Discord: .ryutenchi', 'info');
                debug('Fallback: affichage du handle Discord');
            });
        });
    }

    // Raccourcis clavier
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Clic sur la carte
    document.addEventListener('click', handleMapClick);
}

// Gestion des raccourcis clavier
function handleKeyboardShortcuts(event) {
    // Ignorer si l'utilisateur est en train de taper dans un champ texte
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Gérer Ctrl+Z en priorité (avant les autres touches)
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        undoLastAction();
        event.preventDefault();
        debug('🎹 Raccourci Ctrl+Z utilisé pour annuler');
        return;
    }

    // Raccourcis pour les directions (seulement si Ctrl n'est pas pressé)
    if (!event.ctrlKey) {
        switch (event.key.toLowerCase()) {
            case 'z':
                setDirection('top');
                break;
            case 'q':
                setDirection('left');
                break;
            case 'd':
                setDirection('right');
                break;
            case 's':
                setDirection('bottom');
                break;
        }
    }
}

// Gestion du clic sur la carte
function handleMapClick(event) {
    debug("Click détecté, tentative de lecture des coordonnées DofusDB...");

    // Ne rien faire si le clic est dans l'interface de l'extension
    const uiContainer = document.querySelector('.frigost-path-creator');
    if (uiContainer && uiContainer.contains(event.target)) {
        debug("⛔ Clic ignoré : fait dans l'interface");
        return;
    }

    setTimeout(() => {
        // DEBUG AVANCÉ: Lister TOUS les éléments avec des coordonnées
        debugAllCoordinatesOnPage();
        
        // Stratégie 1: Chercher les coordonnées dans les tooltips/overlays DofusDB
        let coordinates = findDofusDBCoordinates();
        
        if (!coordinates) {
            debug('❌ Aucune coordonnée DofusDB trouvée');
            showNotification("❌ Coordonnées non trouvées - Vérifiez la console pour le debug");
            return;
        }

        const { x, y } = coordinates;
        debug(`✅ Coordonnées DofusDB récupérées : (${x}, ${y})`);
        addPathPoint(x, y);
    }, 500); // délai augmenté pour laisser plus de temps à DofusDB
}

// Fonction de debug avancée pour lister TOUS les éléments avec des coordonnées
function debugAllCoordinatesOnPage() {
    debug('🔍 === DEBUG AVANCÉ: TOUS LES ÉLÉMENTS AVEC COORDONNÉES ===');
    
    const allElements = document.querySelectorAll('*');
    const coordinateElements = [];
    
    for (const element of allElements) {
        if (!element.textContent) continue;
        
        const text = element.textContent.trim();
        const style = getComputedStyle(element);
        
        // Chercher tous les patterns de coordonnées possibles
        const patterns = [
            /(-?\d+)\s*,\s*(-?\d+)/g,
            /(-?\d+)\s*:\s*(-?\d+)/g,
            /(-?\d+)\s*\/\s*(-?\d+)/g,
            /(-?\d+)\s*\|\s*(-?\d+)/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const x = parseInt(match[1], 10);
                const y = parseInt(match[2], 10);
                
                if (!isNaN(x) && !isNaN(y)) {
                    coordinateElements.push({
                        element,
                        coordinates: { x, y },
                        text: text.substring(0, 100),
                        zIndex: parseInt(style.zIndex) || 0,
                        display: style.display,
                        visibility: style.visibility,
                        position: style.position,
                        className: element.className,
                        tagName: element.tagName,
                        isVisible: element.offsetParent !== null
                    });
                }
            }
        }
    }
    
    // Trier par z-index décroissant
    coordinateElements.sort((a, b) => b.zIndex - a.zIndex);
    
    debug(`📊 Trouvé ${coordinateElements.length} éléments avec des coordonnées:`);
    
    coordinateElements.slice(0, 20).forEach((item, index) => {
        debug(`${index + 1}. (${item.coordinates.x}, ${item.coordinates.y}) - z-index: ${item.zIndex} - ${item.tagName}.${item.className} - Visible: ${item.isVisible}`);
        debug(`   Texte: "${item.text}..."`);
        debug(`   Style: display=${item.display}, visibility=${item.visibility}, position=${item.position}`);
        debug('   ---');
    });
    
    debug('🔍 === FIN DEBUG AVANCÉ ===');
    
    return coordinateElements;
}

// Fonction pour trouver les vraies coordonnées DofusDB
function findDofusDBCoordinates() {
    debug('🔍 Recherche des coordonnées DofusDB authentiques...');
    
    // Stratégie PRIORITAIRE: Chercher directement l'élément DofusDB identifié
    const specificDofusElement = document.querySelector('div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed');
    if (specificDofusElement && specificDofusElement.textContent) {
        debug(`🎯 Élément DofusDB spécifique trouvé: "${specificDofusElement.textContent}"`);
        const coords = extractCoordinatesFromElement(specificDofusElement);
        if (coords && isValidDofusCoordinate(coords.x, coords.y)) {
            debug(`✅ PRIORITÉ: Coordonnées trouvées via élément DofusDB spécifique: (${coords.x}, ${coords.y})`);
            return coords;
        }
    }
    
    // Stratégie 0: Utiliser les résultats du debug avancé
    const allCoordinateElements = debugAllCoordinatesOnPage();
    
    // Prioriser les éléments visibles avec z-index élevé
    const visibleElements = allCoordinateElements.filter(item => 
        item.isVisible && 
        item.display !== 'none' && 
        item.visibility !== 'hidden'
    );
    
    debug(`🔍 ${visibleElements.length} éléments visibles avec coordonnées`);
    
    // Essayer d'abord les éléments avec z-index > 1000 (tooltips/overlays)
    for (const item of visibleElements) {
        if (item.zIndex > 1000 && isValidDofusCoordinate(item.coordinates.x, item.coordinates.y)) {
            debug(`✅ Coordonnées trouvées via z-index très élevé (${item.zIndex}): (${item.coordinates.x}, ${item.coordinates.y})`);
            return item.coordinates;
        }
    }
    
    // Ensuite essayer les éléments avec z-index > 100
    for (const item of visibleElements) {
        if (item.zIndex > 100 && isValidDofusCoordinate(item.coordinates.x, item.coordinates.y)) {
            debug(`✅ Coordonnées trouvées via z-index élevé (${item.zIndex}): (${item.coordinates.x}, ${item.coordinates.y})`);
            return item.coordinates;
        }
    }
    
    // Enfin essayer tous les éléments visibles
    for (const item of visibleElements) {
        if (isValidDofusCoordinate(item.coordinates.x, item.coordinates.y)) {
            debug(`✅ Coordonnées trouvées via élément visible: (${item.coordinates.x}, ${item.coordinates.y}) - z-index: ${item.zIndex}`);
            return item.coordinates;
        }
    }
    
    // Stratégie 1: Utiliser la fonction de diagnostic pour analyser la page
    const potentialElements = debugDofusDBElements();
    
    // Stratégie 2: Chercher dans les éléments identifiés par le diagnostic
    for (const item of potentialElements.slice(0, 20)) { // Top 20 éléments les plus prometteurs
        const coords = extractCoordinatesFromElement(item.element);
        if (coords && isValidDofusCoordinate(coords.x, coords.y)) {
            debug(`✅ Coordonnées trouvées via diagnostic: (${coords.x}, ${coords.y}) dans ${item.tagName}.${item.className}`);
            return coords;
        }
    }
    
    // Stratégie 1: Chercher spécifiquement l'élément DofusDB des coordonnées
    const dofusDBCoordinateElement = document.querySelector('div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed');
    if (dofusDBCoordinateElement && dofusDBCoordinateElement.textContent) {
        const coords = extractCoordinatesFromElement(dofusDBCoordinateElement);
        if (coords && isValidDofusCoordinate(coords.x, coords.y)) {
            debug(`✅ Coordonnées trouvées via sélecteur DofusDB spécifique: (${coords.x}, ${coords.y})`);
            return coords;
        }
    }
    
    // Stratégie 2: Chercher spécifiquement les sélecteurs DofusDB connus
    const dofusDBSelectors = [
        // Sélecteur spécifique identifié pour DofusDB
        'div.bg-darker.text-white.text-bold.q-px-md.q-py-sm.fixed',
        'div.bg-darker.text-white.text-bold',
        '.bg-darker.text-white',
        // Sélecteurs spécifiques à DofusDB
        '[class*="tooltip"]',
        '[class*="popup"]',
        '[class*="overlay"]',
        '[class*="coord"]',
        '[class*="position"]',
        '[class*="map-info"]',
        '[class*="cell-info"]',
        '[data-tooltip]',
        '[title]',
        // Sélecteurs génériques pour les coordonnées
        'div[style*="position: absolute"]',
        'div[style*="z-index"]',
        '.tooltip',
        '.popup',
        '.overlay'
    ];
    
    for (const selector of dofusDBSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const coords = extractCoordinatesFromElement(element);
            if (coords && isValidDofusCoordinate(coords.x, coords.y)) {
                debug(`✅ Coordonnées trouvées via ${selector}: (${coords.x}, ${coords.y})`);
                return coords;
            }
        }
    }
    
    // Stratégie 3: Chercher dans l'URL ou les attributs data
    const urlCoords = extractCoordinatesFromURL();
    if (urlCoords && isValidDofusCoordinate(urlCoords.x, urlCoords.y)) {
        debug(`✅ Coordonnées trouvées dans l'URL: (${urlCoords.x}, ${urlCoords.y})`);
        return urlCoords;
    }
    
    // Stratégie 4: Chercher dans les éléments récemment modifiés (fallback)
    const recentElements = document.querySelectorAll('div, span, p, td, th');
    const sortedElements = Array.from(recentElements)
        .filter(el => el.textContent && el.textContent.match(/\d+/))
        .sort((a, b) => {
            const aZIndex = parseInt(getComputedStyle(a).zIndex) || 0;
            const bZIndex = parseInt(getComputedStyle(b).zIndex) || 0;
            return bZIndex - aZIndex;
        });
    
    for (const element of sortedElements.slice(0, 100)) {
        const coords = extractCoordinatesFromElement(element);
        if (coords && isValidDofusCoordinate(coords.x, coords.y)) {
            debug(`✅ Coordonnées trouvées en fallback: (${coords.x}, ${coords.y})`);
            return coords;
        }
    }
    
    debug('❌ Aucune coordonnée DofusDB valide trouvée après toutes les stratégies');
    return null;
}

// Extraire les coordonnées d'un élément DOM
function extractCoordinatesFromElement(element) {
    if (!element || !element.textContent) return null;
    
    const text = element.textContent.trim();
    const style = getComputedStyle(element);
    
    // Ignorer les éléments cachés
    if (style.display === 'none' || style.visibility === 'hidden' || element.offsetParent === null) {
        return null;
    }
    
    // Chercher le pattern de coordonnées DofusDB (incluant les coordonnées négatives)
    const patterns = [
        // Patterns prioritaires pour coordonnées DofusDB (positives ET négatives)
        /^(-?\d+)\s*,\s*(-?\d+)$/,         // Format exact: "-20,-22" ou "8,5" (début et fin de chaîne)
        /\b(-?\d+)\s*,\s*(-?\d+)\b/,       // Format: "-20, -22" avec limites de mots
        /^(-?\d+)\s*:\s*(-?\d+)$/,         // Format exact: "-20:-22"
        
        // Patterns avec délimiteurs (coordonnées négatives)
        /\[(-?\d+)\s*,\s*(-?\d+)\]/,       // Format: "[-20, -22]"
        /\((-?\d+)\s*,\s*(-?\d+)\)/,       // Format: "(-20, -22)"
        /"(-?\d+)\s*,\s*(-?\d+)"/,         // Format: "-20, -22" entre guillemets
        
        // Patterns avec labels (coordonnées négatives)
        /x:\s*(-?\d+).*?y:\s*(-?\d+)/i,    // Format: "x: -20, y: -22"
        /pos:\s*(-?\d+)\s*,\s*(-?\d+)/i,   // Format: "pos: -20, -22"
        /coord:\s*(-?\d+)\s*,\s*(-?\d+)/i, // Format: "coord: -20, -22"
        
        // Patterns génériques (coordonnées négatives)
        /(-?\d+)\s*\/\s*(-?\d+)/,          // Format: "-20/-22"
        /(-?\d+)\s*\|\s*(-?\d+)/,          // Format: "-20|-22"
        
        // Pattern spécial pour éviter la confusion avec les soustractions
        /(?:^|[^\d])(-\d+)\s*,\s*(-\d+)(?:[^\d]|$)/  // Format: "-20,-22" en évitant les faux positifs
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const x = parseInt(match[1], 10);
            const y = parseInt(match[2], 10);
            
            if (!isNaN(x) && !isNaN(y)) {
                debug(`📍 Pattern trouvé dans "${text.substring(0, 50)}...": (${x}, ${y})`);
                return { x, y };
            }
        }
    }
    
    return null;
}

// Extraire les coordonnées de l'URL
function extractCoordinatesFromURL() {
    const url = window.location.href;
    const patterns = [
        /[?&]x=(\d+)&y=(\d+)/,
        /[?&]coord=(\d+),(\d+)/,
        /[?&]pos=(\d+),(\d+)/,
        /\/(\d+),(\d+)/,
        /\/(\d+)_(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            const x = parseInt(match[1], 10);
            const y = parseInt(match[2], 10);
            if (!isNaN(x) && !isNaN(y)) {
                return { x, y };
            }
        }
    }
    
    return null;
}

// Valider si les coordonnées sont dans une plage réaliste pour Dofus
function isValidDofusCoordinate(x, y) {
    // Plages réalistes basées sur le guide des coordonnées (élargie pour inclure toutes les zones)
    const isValidRange = (
        x >= -100 && x <= 100 &&  // Plage très élargie pour couvrir toutes les zones Dofus
        y >= -100 && y <= 100     // Plage très élargie pour couvrir toutes les zones Dofus
    );
    
    // Éviter les coordonnées manifestement incorrectes
    const isNotObviouslyWrong = (
        Math.abs(x) < 1000 &&   // Éviter les coordonnées pixel
        Math.abs(y) < 1000 &&   // Éviter les coordonnées pixel
        !isNaN(x) && !isNaN(y)  // Éviter les NaN
    );
    
    const isValid = isValidRange && isNotObviouslyWrong;
    
    if (!isValid) {
        debug(`⚠️ Coordonnées rejetées comme invalides: (${x}, ${y}) - Range: ${isValidRange}, NotWrong: ${isNotObviouslyWrong}`);
    } else {
        debug(`✅ Coordonnées validées: (${x}, ${y})`);
    }
    
    return isValid;
}

// Fonction pour formater les directions
function formatDirections() {
    const dirs = ['top', 'right', 'bottom', 'left'].filter(dir => window.frigostPathCreator.selectedDirections.has(dir));
    return dirs.length > 0 ? dirs.join('|') : 'top'; // 'top' par défaut si rien n'est sélectionné
}

// Ajout d'un point au chemin
function addPathPoint(x, y) {
    // Conversion explicite en entiers pour éviter les problèmes de format
    const intX = parseInt(x, 10);
    const intY = parseInt(y, 10);
    
    // Validation stricte des coordonnées
    if (isNaN(intX) || isNaN(intY)) {
        debug(`❌ Coordonnées invalides : x=${x} (${typeof x}), y=${y} (${typeof y})`);
        showNotification("❌ Coordonnées invalides", 'error');
        return;
    }
    
    debug(`Adding path point: (${intX}, ${intY}) - types: x=${typeof intX}, y=${typeof intY}`);
    
    if (window.frigostPathCreator.selectedDirections.size === 0) {
        debug('No direction selected');
        showNotification('Veuillez sélectionner au moins une direction !');
        return;
    }

    const point = {
        x: intX,
        y: intY,
        direction: formatDirections(),
        actions: Array.from(window.frigostPathCreator.selectedActions)
    };

    window.frigostPathCreator.currentPath.push(point);
    debug('Point added to path:', point);
    debug('Current path length:', window.frigostPathCreator.currentPath.length);

    addCheckmarkToMap(intX, intY);
    updatePathList();
    showNotification(`Point ajouté: (${intX}, ${intY})`, 'success');
}

// Fonction pour ajouter un marqueur sur la carte
// Fonction pour mettre à jour un marqueur existant
function updateExistingMarker(marker, x, y, pointIndex) {
    const point = window.frigostPathCreator.currentPath[pointIndex];
    const directions = point.direction.split('|');
    
    // Mettre à jour l'index
    marker.setAttribute('data-index', pointIndex);
    
    // Mettre à jour le contenu du marqueur
    const container = marker.querySelector('.marker-container');
    if (container) {
        // Mettre à jour les classes du conteneur
        container.className = 'marker-container';
        if (directions.length === 4) {
            container.className += ' all-directions';
        } else if (directions.length > 1) {
            container.className += ' multi-directions';
        }
        
        // Mettre à jour les flèches directionnelles
        const arrows = container.querySelectorAll('.arrow');
        arrows.forEach(arrow => {
            const direction = arrow.classList.contains('top') ? 'top' :
                            arrow.classList.contains('right') ? 'right' :
                            arrow.classList.contains('bottom') ? 'bottom' : 'left';
            
            if (directions.includes(direction)) {
                arrow.classList.add('active');
            } else {
                arrow.classList.remove('active');
            }
        });
        
        // Mettre à jour le numéro
        const numberSpan = container.querySelector('.marker-number');
        if (numberSpan) {
            numberSpan.textContent = pointIndex + 1;
        }
        
        // Mettre à jour les actions
        const actionsDiv = container.querySelector('.marker-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = `
                ${point.actions.includes('combat') ? '<span class="action-icon" title="Combat">⚔️</span>' : ''}
                ${point.actions.includes('recolte') ? '<span class="action-icon" title="Récolte">🌿</span>' : ''}
            `;
        }
    }
    
    debug(`🔄 Marqueur mis à jour pour (${x}, ${y})`);
}

function addCheckmarkToMap(x, y) {
    const key = `${x},${y}`;
    debug(`🚀 Tentative d'ajout de marqueur pour (${x}, ${y})`);
    
    // Trouver l'index du point dans le chemin
    const pointIndex = window.frigostPathCreator.currentPath.findIndex(p => p.x === x && p.y === y);
    
    // Vérifier si déjà existant
    const existingMarker = document.querySelector(`[data-check="${key}"]`);
    if (existingMarker) {
        debug(`✅ Marqueur déjà existant pour (${x}, ${y}), mise à jour...`);
        // Mettre à jour le marqueur existant au lieu de le supprimer
        updateExistingMarker(existingMarker, x, y, pointIndex);
        return;
    }
    if (pointIndex === -1) {
        debug(`❌ Point non trouvé dans le chemin`);
        return;
    }
    
    const point = window.frigostPathCreator.currentPath[pointIndex];
    const directions = point.direction.split('|');
    
    // NOUVEAU SYSTÈME: Chercher la cellule correspondant aux coordonnées exactes
    debug(`🔍 Recherche de la cellule pour les coordonnées (${x}, ${y})...`);
    
    // Stratégie 1: Chercher un élément qui affiche exactement ces coordonnées
    let targetCell = null;
    const coordinateText = `${x},${y}`;
    
    // Chercher dans tous les éléments visibles qui contiennent nos coordonnées
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
        if (element.textContent && element.textContent.includes(coordinateText)) {
            const style = getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null) {
                // Vérifier si c'est vraiment nos coordonnées (pas juste une partie d'un nombre plus grand)
                const coords = extractCoordinatesFromElement(element);
                if (coords && coords.x === x && coords.y === y) {
                    targetCell = element;
                    debug(`✅ Cellule trouvée via coordonnées exactes: ${element.tagName}.${element.className}`);
                    break;
                }
            }
        }
    }
    
    // Stratégie 2: Si pas trouvé, chercher la cellule de carte la plus récemment mise à jour
    if (!targetCell) {
        debug(`🔍 Recherche de cellule via éléments de carte récents...`);
        
        // Chercher les éléments de carte DofusDB
        const mapSelectors = [
            'div[class*="map-position"]',
            'div[class*="cell"]',
            'div[class*="tile"]',
            'div[style*="position: absolute"]',
            'div[style*="transform"]'
        ];
        
        for (const selector of mapSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const style = getComputedStyle(element);
                if (style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null) {
                    // Prendre le premier élément valide trouvé
                    targetCell = element;
                    debug(`✅ Cellule trouvée via sélecteur ${selector}`);
                    break;
                }
            }
            if (targetCell) break;
        }
    }

    // Créer le marqueur amélioré
    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.setAttribute('data-check', key);
    marker.setAttribute('data-coords', `${x},${y}`);
    marker.setAttribute('data-index', pointIndex);
    
    // Déterminer la classe spéciale pour le conteneur
    let containerClass = 'marker-container';
    if (directions.length === 4) {
        containerClass += ' all-directions';
    } else if (directions.length > 1) {
        containerClass += ' multi-directions';
    }
    
    // Structure HTML du marqueur
    marker.innerHTML = `
        <div class="${containerClass}">
            <!-- Flèches directionnelles -->
            <div class="direction-arrows">
                <div class="arrow top ${directions.includes('top') ? 'active' : ''}" title="Sortie: Haut">↑</div>
                <div class="arrow right ${directions.includes('right') ? 'active' : ''}" title="Sortie: Droite">→</div>
                <div class="arrow bottom ${directions.includes('bottom') ? 'active' : ''}" title="Sortie: Bas">↓</div>
                <div class="arrow left ${directions.includes('left') ? 'active' : ''}" title="Sortie: Gauche">←</div>
            </div>
            
            <!-- Centre du marqueur -->
            <div class="marker-center">
                <span class="marker-number">${pointIndex + 1}</span>
                <div class="marker-actions">
                    ${point.actions.includes('combat') ? '<span class="action-icon" title="Combat">⚔️</span>' : ''}
                    ${point.actions.includes('recolte') ? '<span class="action-icon" title="Récolte">🌿</span>' : ''}
                </div>
            </div>
        </div>
    `;
    
    // Positionner le marqueur avec le nouveau système
    if (targetCell) {
        const rect = targetCell.getBoundingClientRect();
        debug(`✅ Cellule trouvée! Position: ${rect.left}, ${rect.top}, taille: ${rect.width}x${rect.height}`);
        
        // Trouver le meilleur conteneur pour le marqueur
        const mapContainer = findBestMapContainer(targetCell);
        
        if (mapContainer && mapContainer !== document.body) {
            // Position relative au conteneur de la carte
            const containerRect = mapContainer.getBoundingClientRect();
            const relativeX = rect.left - containerRect.left + rect.width / 2;
            const relativeY = rect.top - containerRect.top + rect.height / 2;
            
            marker.style.position = 'absolute';
            marker.style.left = `${relativeX}px`;
            marker.style.top = `${relativeY}px`;
            marker.style.transform = 'translate(-50%, -50%)';
            marker.style.zIndex = '10000';

            mapContainer.appendChild(marker);
            debug(`🎯 Marqueur attaché au conteneur de carte: ${mapContainer.tagName}.${mapContainer.className}`);
        } else {
            // Position fixe sur le body avec les coordonnées de la cellule
            marker.style.position = 'fixed';
            marker.style.left = `${rect.left + rect.width / 2}px`;
            marker.style.top = `${rect.top + rect.height / 2}px`;
            marker.style.transform = 'translate(-50%, -50%)';
            marker.style.zIndex = '10000';

            document.body.appendChild(marker);
            debug(`⚠️ Marqueur attaché au body avec position de cellule`);
        }
    } else {
        // Fallback: utiliser un système de positionnement basé sur les coordonnées
        debug(`⚠️ FALLBACK: Positionnement basé sur les coordonnées (${x}, ${y})`);
        
        const mapContainer = findBestMapContainer() || document.body;
        const position = calculatePositionFromCoordinates(x, y, mapContainer);
        
        if (position) {
            marker.style.position = mapContainer === document.body ? 'fixed' : 'absolute';
            marker.style.left = `${position.x}px`;
            marker.style.top = `${position.y}px`;
            marker.style.transform = 'translate(-50%, -50%)';
            marker.style.zIndex = '10000';

            mapContainer.appendChild(marker);
            debug(`🎯 FALLBACK: Marqueur positionné via calcul de coordonnées`);
        } else {
            debug(`❌ ÉCHEC: Impossible de calculer la position pour (${x}, ${y})`);
            showNotification(`❌ Impossible de placer le marqueur (${x}, ${y})`, 'error');
            return;
        }
    }
    
    debug(`🎉 Marqueur amélioré ajouté pour (${x}, ${y}) avec ${directions.length} direction(s)`);
    
    // Animation d'apparition
    marker.classList.add('marker-appear');
    setTimeout(() => marker.classList.remove('marker-appear'), 300);
}

// Fonction pour trouver le meilleur conteneur de carte
function findBestMapContainer(referenceElement = null) {
    debug('🔍 Recherche du meilleur conteneur de carte...');
    
    // Liste des sélecteurs de conteneurs de carte par ordre de priorité
    const containerSelectors = [
        '.worldmap-map-container',
        '[class*="map-container"]',
        '[class*="worldmap"]',
        '[class*="game-map"]',
        'canvas',
        '[class*="map"]'
    ];
    
    // Si on a un élément de référence, chercher son conteneur parent
    if (referenceElement) {
        for (const selector of containerSelectors) {
            const container = referenceElement.closest(selector);
            if (container) {
                debug(`✅ Conteneur trouvé via élément de référence: ${selector}`);
                return container;
            }
        }
    }
    
    // Chercher dans le document
    for (const selector of containerSelectors) {
        const container = document.querySelector(selector);
        if (container) {
            debug(`✅ Conteneur trouvé dans le document: ${selector}`);
            return container;
        }
    }
    
    debug('⚠️ Aucun conteneur de carte spécifique trouvé, utilisation du body');
    return document.body;
}

// Fonction pour calculer la position basée sur les coordonnées
function calculatePositionFromCoordinates(x, y, container) {
    debug(`🧮 Calcul de position pour (${x}, ${y}) dans le conteneur`);
    
    // Obtenir les dimensions du conteneur
    const containerRect = container.getBoundingClientRect();
    
    // Système de coordonnées DofusDB: généralement centré sur (0,0)
    // Les coordonnées vont typiquement de -30 à +30 pour chaque axe
    const mapRange = 60; // Plage totale (-30 à +30)
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Calculer la position relative
    const cellSize = Math.min(containerRect.width, containerRect.height) / mapRange;
    const posX = centerX + (x * cellSize);
    const posY = centerY + (y * cellSize);
    
    // Vérifier que la position est dans les limites du conteneur
    if (posX >= 0 && posX <= containerRect.width && posY >= 0 && posY <= containerRect.height) {
        debug(`✅ Position calculée: (${posX}, ${posY})`);
        return { x: posX, y: posY };
    } else {
        debug(`⚠️ Position calculée hors limites: (${posX}, ${posY})`);
        // Fallback: placer au centre
        return { x: centerX, y: centerY };
    }
}



// Mise à jour de la liste des points
function updatePathList() {
    debug('Updating path list...');
    const pathList = document.querySelector('.path-points');
    const pathCount = document.querySelector('.path-count');
    
    if (!pathList) {
        debug('ERROR: Path list element not found!');
        showNotification('Erreur: Liste de chemin non trouvée');
        return;
    }

    // Mettre à jour le compteur
    if (pathCount) {
        pathCount.textContent = window.frigostPathCreator.currentPath.length;
    }

    if (window.frigostPathCreator.currentPath.length === 0) {
        pathList.innerHTML = '<div class="empty-path">Aucun point ajouté<br><small>Cliquez sur la carte pour commencer</small></div>';
        return;
    }

    pathList.innerHTML = window.frigostPathCreator.currentPath.map((point, index) => {
        const mapCoord = `${point.x},${point.y}`;
        const fight = point.actions.includes('combat');
        const gather = point.actions.includes('recolte');
        const directions = point.direction.split('|');
        
        const actionsText = [];
        if (fight) actionsText.push('⚔️ Combat');
        if (gather) actionsText.push('🌿 Récolte');
        if (actionsText.length === 0) actionsText.push('➡️ Mouvement');

        const actionIcons = [];
        if (fight) actionIcons.push('⚔️');
        if (gather) actionIcons.push('🌿');
        if (actionIcons.length === 0) actionIcons.push('➡️');

        // Créer l'affichage visuel des directions
        const directionDisplay = `
            <div class="path-direction-visual">
                <div class="path-direction-label">🧭 Directions:</div>
                <div class="mini-direction-arrows">
                    <div class="mini-arrow top ${directions.includes('top') ? 'active' : ''}" title="Sortie: Haut"></div>
                    <div class="mini-arrow right ${directions.includes('right') ? 'active' : ''}" title="Sortie: Droite"></div>
                    <div class="mini-arrow bottom ${directions.includes('bottom') ? 'active' : ''}" title="Sortie: Bas"></div>
                    <div class="mini-arrow left ${directions.includes('left') ? 'active' : ''}" title="Sortie: Gauche"></div>
                </div>
            </div>
        `;

        return `
            <div class="path-item" data-index="${index}">
                <div class="path-item-header">
                    <span class="path-index">${index + 1}</span>
                    <span class="path-coord">(${point.x}, ${point.y})</span>
                    <span class="path-actions">${actionIcons.join(' ')}</span>
                    <button class="path-item-delete" data-index="${index}" title="Supprimer ce point">❌</button>
                </div>
                <div class="path-item-details">
                    ${directionDisplay}
                    <span class="path-action-details">${actionsText.join(' + ')}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Ajouter les event listeners pour les boutons de suppression
    setTimeout(() => {
        const deleteButtons = document.querySelectorAll('.path-item-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Éviter les conflits avec d'autres events
                const index = parseInt(button.dataset.index, 10);
                removePathPoint(index);
            });
        });
    }, 0);
    
    debug('Path list updated with', window.frigostPathCreator.currentPath.length, 'points');
}

// Export du chemin en LUA avec structure fonctionnelle
function exportPath() {
    if (window.frigostPathCreator.currentPath.length === 0) {
        showNotification('❌ Aucun point dans le chemin à exporter', 'error');
        return;
    }

    // Récupération des configurations depuis l'interface
    const config = window.frigostPathCreator.config;
    const maxMonsters = parseInt(config.maxMonsters) || 8;
    const minMonsters = parseInt(config.minMonsters) || 2;
    const forceMonsters = config.forceMonsters || '';
    const forbiddenMonsters = config.forbiddenMonsters || '';
    const amountMonsters = config.amountMonsters || '';
    const gatherResources = config.gatherResources || '';
    const autoDeleteResources = config.autoDeleteResources || '';
    const planningHours = config.planningHours || '';
    const startX = config.startX || '';
    const startY = config.startY || '';
    const startDelay = config.startDelay || '';

    // Conversion des chaînes en tableaux d'IDs
    const forceMonstersArray = forceMonsters ? forceMonsters.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
    const forbiddenMonstersArray = forbiddenMonsters ? forbiddenMonsters.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
    const gatherArray = gatherResources ? gatherResources.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
    const autoDeleteArray = autoDeleteResources ? autoDeleteResources.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
    const planningArray = planningHours ? planningHours.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23) : [];
    
    // Traitement AMOUNT_MONSTERS (format: ID, min, max par ligne)
    const amountMonstersArray = [];
    if (amountMonsters) {
        const lines = amountMonsters.split('\n');
        for (const line of lines) {
            const parts = line.split(',').map(p => parseInt(p.trim(), 10));
            if (parts.length === 3 && parts.every(p => !isNaN(p))) {
                amountMonstersArray.push(parts);
            }
        }
    }

    let luaScript = '';
    
    // En-tête du script
    luaScript += `-- ==================================================================================\n`;
    luaScript += `-- ==          SCRIPT GÉNÉRÉ PAR FRIGOST PATH CREATOR v3.0                     ==\n`;
    luaScript += `-- ==                    SYNTAXE OFFICIELLE FRIGOST                            ==\n`;
    luaScript += `-- ==================================================================================\n`;
    luaScript += `-- Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
    luaScript += `-- Nombre de points: ${window.frigostPathCreator.currentPath.length}\n`;
    luaScript += `-- Documentation: https://doc.frigost.dev/abonnement-frigost-bot/parametres-du-script\n`;
    luaScript += `-- ==================================================================================\n\n`;
    
    // Paramètres officiels Frigost (syntaxe exacte de la documentation)
    luaScript += `-- Paramètres du script (syntaxe officielle Frigost)\n`;
    luaScript += `MAX_MONSTERS = ${maxMonsters}\n`;
    luaScript += `MIN_MONSTERS = ${minMonsters}\n`;
    
    if (forbiddenMonstersArray.length > 0) {
        luaScript += `FORBIDDEN_MONSTERS = { ${forbiddenMonstersArray.join(', ')} }\n`;
    }
    
    if (forceMonstersArray.length > 0) {
        luaScript += `FORCE_MONSTERS = { ${forceMonstersArray.join(', ')} }\n`;
    }
    
    if (amountMonstersArray.length > 0) {
        const amountStr = amountMonstersArray.map(arr => `{${arr.join(', ')}}`).join(', ');
        luaScript += `AMOUNT_MONSTERS = { ${amountStr} }\n`;
    }
    
    if (gatherArray.length > 0) {
        luaScript += `GATHER = { ${gatherArray.join(', ')} }\n`;
    }
    
    if (autoDeleteArray.length > 0) {
        luaScript += `AUTO_DELETE = { ${autoDeleteArray.join(', ')} }\n`;
    }
    
    if (planningArray.length > 0) {
        luaScript += `PLANNING = { ${planningArray.join(', ')} }\n`;
    }
    
    luaScript += `\n`;
    
    // Configuration du script linéaire + circulaire (syntaxe officielle Frigost)
    luaScript += `-- Configuration du script linéaire + circulaire\n`;
    luaScript += `-- true = recommencer le script depuis le début, nécessite que la dernière carte vous mène à la première carte.\n`;
    luaScript += `RC_CIRCULAR = true\n\n`;
    
    // Variables globales pour les délais de changement de carte
    const mapChangeDelay = window.frigostPathCreator.config.mapChangeDelay || '2000';
    const mapDelayRandom = window.frigostPathCreator.config.mapDelayRandom !== false; // true par défaut
    
    luaScript += `-- Variables globales\n`;
    luaScript += `MAP_CHANGE_DELAY = ${mapChangeDelay} -- Délai de base en millisecondes avant chaque changement de carte (configurable par l'utilisateur)\n`;
    luaScript += `MAP_CHANGE_DELAY_RANDOM = ${mapDelayRandom} -- Si true, le délai sera aléatoire entre MAP_CHANGE_DELAY et MAP_CHANGE_DELAY*2\n\n`;
    
    // Fonction de téléportation si coordonnées spécifiées
    if (startX && startY && startDelay) {
        const startXNum = parseInt(startX, 10);
        const startYNum = parseInt(startY, 10);
        const delayNum = parseInt(startDelay, 10);
        
        if (!isNaN(startXNum) && !isNaN(startYNum) && !isNaN(delayNum)) {
            luaScript += `STARTING_MAP = "${startXNum},${startYNum}"\n\n`;
            luaScript += `-- Fonction de téléportation vers la zone de départ\n`;
            luaScript += `function teleportToStartZone()\n`;
            luaScript += `    console.print("🚀 Téléportation vers la zone de départ: " .. STARTING_MAP)\n`;
            luaScript += `    \n`;
            luaScript += `    -- Cliquer sur le chat et attendre\n`;
            luaScript += `    mouse.click(152, 996, false)\n`;
            luaScript += `    global.sleep(1000)\n`;
            luaScript += `    \n`;
            luaScript += `    -- Écrire la commande /travel et attendre\n`;
            luaScript += `    local travelCommand = "/travel " .. STARTING_MAP\n`;
            luaScript += `    keyboard.write(travelCommand)\n`;
            luaScript += `    global.sleep(500)\n`;
            luaScript += `    \n`;
            luaScript += `    -- Appuyer sur Entrée et attendre\n`;
            luaScript += `    keyboard.press(0x0D, false, false, false)\n`;
            luaScript += `    global.sleep(1000)\n`;
            luaScript += `    \n`;
            luaScript += `    -- Deuxième clic et attendre la téléportation\n`;
            luaScript += `    mouse.click(883, 559, false)\n`;
            luaScript += `    global.sleep(${delayNum})\n`;
            luaScript += `    \n`;
            luaScript += `    console.print("✅ Téléportation terminée")\n`;
            luaScript += `end\n\n`;
        }
    }
    
    // Tableau des actions (mapActionsTable)
    luaScript += `-- Tableau des actions\n`;
    luaScript += `mapActionsTable =\n`;
    luaScript += `{\n`;
    
    // Générer le tableau des cartes selon la syntaxe mapActionsTable
    for (let i = 0; i < window.frigostPathCreator.currentPath.length; i++) {
        const point = window.frigostPathCreator.currentPath[i];
        const x = parseInt(point.x, 10);
        const y = parseInt(point.y, 10);
        const mapCoord = `${x},${y}`;
        const fight = point.actions.includes('combat');
        const gather = point.actions.includes('recolte');
        const pathDirections = point.direction || "top|bottom|left|right";
        
        luaScript += `    { map = "${mapCoord}", path = "${pathDirections}"`;
        if (fight) luaScript += `, fight = true`;
        if (gather) luaScript += `, gather = true`;
        luaScript += ` }`;
        
        if (i < window.frigostPathCreator.currentPath.length - 1) {
            luaScript += `,\n`;
        } else {
            luaScript += `\n`;
        }
    }
    
    luaScript += `}\n`;
    luaScript += `for _, element in ipairs(mapActionsTable) do element.done = false end\n\n`;
    
    // Fonction getMapActions (ne pas toucher à cette fonction)
    luaScript += `-- Ne pas toucher à cette fonction\n`;
    luaScript += `function getMapActions()\n\n`;
    luaScript += `    -- Retourner la première carte non visitée\n`;
    luaScript += `    for _, mapActions in ipairs(mapActionsTable) do\n`;
    luaScript += `        if map.onMap(mapActions.map) and not mapActions.done then\n`;
    luaScript += `            mapActions.done = true\n`;
    luaScript += `            return mapActions\n`;
    luaScript += `        end\n`;
    luaScript += `    end\n\n`;
    luaScript += `    -- Toutes les cartes sont visitées ? on réinitialise\n`;
    luaScript += `    for _, mapActions in ipairs(mapActionsTable) do\n`;
    luaScript += `        mapActions.done = false\n`;
    luaScript += `    end\n\n`;
    luaScript += `    -- Script circulaire ?\n`;
    luaScript += `    if RC_CIRCULAR then\n`;
    luaScript += `        -- Retourner la première carte non visitée\n`;
    luaScript += `        for _, mapActions in ipairs(mapActionsTable) do\n`;
    luaScript += `            if map.onMap(mapActions.map) and not mapActions.done then\n`;
    luaScript += `                mapActions.done = true\n`;
    luaScript += `                return mapActions\n`;
    luaScript += `            end\n`;
    luaScript += `        end\n`;
    luaScript += `    end\n\n`;
    luaScript += `    -- Aucune carte ? Retourner la première carte par défaut\n`;
    luaScript += `    console.print("⚠️ Aucune carte trouvée, retour à la première carte")\n`;
    luaScript += `    return mapActionsTable[1]\n`;
    luaScript += `end\n\n`;
    
    // Fonction d'entrée (move) avec logique de téléportation et validation de zone
    luaScript += `-- Fonction d'entrée\n`;
    luaScript += `function move()\n`;
    luaScript += `    console.print("🗺️ Initialisation du parcours Frigost avec configurations avancées")\n`;
    luaScript += `    \n`;
    luaScript += `    -- Diagnostic de position\n`;
    luaScript += `    local currentX, currentY = map.x(), map.y()\n`;
    luaScript += `    local currentMap = tostring(currentX) .. "," .. tostring(currentY)\n`;
    luaScript += `    console.print("📍 Position actuelle: " .. currentMap .. " (X=" .. currentX .. ", Y=" .. currentY .. ")")\n`;
    luaScript += `    \n`;
    
    // Générer la liste des cartes valides pour la validation de zone
    const validMaps = window.frigostPathCreator.currentPath.map(point => `"${point.x},${point.y}"`).join(', ');
    
    luaScript += `    -- Vérifier si on est dans la zone du parcours\n`;
    luaScript += `    local validMaps = {${validMaps}}\n`;
    luaScript += `    local isInZone = false\n`;
    luaScript += `    \n`;
    luaScript += `    for _, validMap in ipairs(validMaps) do\n`;
    luaScript += `        if currentMap == validMap then\n`;
    luaScript += `            isInZone = true\n`;
    luaScript += `            console.print("✅ Position valide dans le parcours: " .. currentMap)\n`;
    luaScript += `            break\n`;
    luaScript += `        end\n`;
    luaScript += `    end\n`;
    luaScript += `    \n`;
    
    // Ajouter la logique de téléportation si coordonnées spécifiées
    if (startX && startY && startDelay) {
        const startXNum = parseInt(startX, 10);
        const startYNum = parseInt(startY, 10);
        
        if (!isNaN(startXNum) && !isNaN(startYNum)) {
            luaScript += `    -- Si hors zone, téléporter vers le départ\n`;
            luaScript += `    if not isInZone then\n`;
            luaScript += `        console.print("⚠️ Hors de la zone de parcours, téléportation nécessaire...")\n`;
            luaScript += `        teleportToStartZone()\n`;
            luaScript += `        \n`;
            luaScript += `        -- Revérifier la position après téléportation\n`;
            luaScript += `        currentX, currentY = map.x(), map.y()\n`;
            luaScript += `        currentMap = tostring(currentX) .. "," .. tostring(currentY)\n`;
            luaScript += `        console.print("📍 Nouvelle position après téléportation: " .. currentMap)\n`;
            luaScript += `        \n`;
            luaScript += `        -- Si toujours hors zone après téléportation, attendre et réessayer\n`;
            luaScript += `        if currentMap ~= STARTING_MAP then\n`;
            luaScript += `            console.print("⚠️ Téléportation échouée, attente de 5 secondes...")\n`;
            luaScript += `            global.sleep(5000)\n`;
            luaScript += `            -- Retourner la première action pour continuer le script\n`;
            luaScript += `            return { mapActionsTable[1] }\n`;
            luaScript += `        end\n`;
            luaScript += `    end\n`;
            luaScript += `    \n`;
        }
    }
    
    luaScript += `    -- Gestion post-combat\n`;
    luaScript += `    if character.wasInFight() then\n`;
    luaScript += `        console.print("⚔️ Combat terminé - Traitement post-combat")\n`;
    luaScript += `        \n`;
    luaScript += `        -- Pause post-combat (1-5 secondes optimisé)\n`;
    luaScript += `        local pauseTime = global.random(1000, 5000)\n`;
    luaScript += `        console.print("⏱️ Pause post-combat: " .. (pauseTime/1000) .. "s")\n`;
    luaScript += `        global.sleep(pauseTime)\n`;
    luaScript += `        \n`;
    luaScript += `        console.print("✅ Traitement post-combat terminé")\n`;
    luaScript += `    end\n\n`;
    luaScript += `    -- Ne pas toucher à cette partie au-dessous\n`;
    luaScript += `    if character.wasInFight() and mapActions ~= nil and map.onMap(mapActions.map) then\n`;
    luaScript += `        return { mapActions }\n`;
    luaScript += `    end\n`;
    luaScript += `    \n`;
    luaScript += `    mapActions = getMapActions()\n`;
    luaScript += `    if mapActions ~= nil then\n`;
    luaScript += `        -- Délai avant changement de carte (configurable et aléatoire)\n`;
    luaScript += `        if MAP_CHANGE_DELAY > 0 then\n`;
    luaScript += `            local actualDelay = MAP_CHANGE_DELAY\n`;
    luaScript += `            \n`;
    luaScript += `            -- Si le mode aléatoire est activé, varier le délai\n`;
    luaScript += `            if MAP_CHANGE_DELAY_RANDOM then\n`;
    luaScript += `                -- Délai aléatoire entre MAP_CHANGE_DELAY et MAP_CHANGE_DELAY*2\n`;
    luaScript += `                actualDelay = global.random(MAP_CHANGE_DELAY, MAP_CHANGE_DELAY * 2)\n`;
    luaScript += `                console.print("⏱️ Délai aléatoire avant changement de carte: " .. (actualDelay/1000) .. "s (base: " .. (MAP_CHANGE_DELAY/1000) .. "s)")\n`;
    luaScript += `            else\n`;
    luaScript += `                console.print("⏱️ Délai avant changement de carte: " .. (actualDelay/1000) .. "s")\n`;
    luaScript += `            end\n`;
    luaScript += `            \n`;
    luaScript += `            global.sleep(actualDelay)\n`;
    luaScript += `        end\n`;
    luaScript += `        return { mapActions }\n`;
    luaScript += `    else\n`;
    luaScript += `        -- Sécurité: toujours retourner un tableau\n`;
    luaScript += `        console.print("⚠️ Sécurité: retour de la première action")\n`;
    luaScript += `        return { mapActionsTable[1] }\n`;
    luaScript += `    end\n`;
    luaScript += `end\n\n`;
    
    // Pied de page
    luaScript += `-- ==================================================================================\n`;
    luaScript += `-- ==                    SCRIPT FRIGOST OFFICIEL v3.0                          ==\n`;
    luaScript += `-- ==              Utilise les paramètres natifs de Frigost                   ==\n`;
    luaScript += `-- ==================================================================================\n`;
    
    // Copier dans le presse-papiers
    navigator.clipboard.writeText(luaScript).then(() => {
        debug('Script Frigost officiel copié !');
        
        // Message détaillé avec les configurations
        let configSummary = [];
        if (forceMonstersArray.length > 0) configSummary.push(`${forceMonstersArray.length} monstres forcés`);
        if (forbiddenMonstersArray.length > 0) configSummary.push(`${forbiddenMonstersArray.length} monstres interdits`);
        if (gatherArray.length > 0) configSummary.push(`${gatherArray.length} ressources`);
        if (autoDeleteArray.length > 0) configSummary.push(`${autoDeleteArray.length} auto-delete`);
        if (planningArray.length > 0) configSummary.push(`${planningArray.length} heures planning`);
        
        const configText = configSummary.length > 0 ? ` | ${configSummary.join(', ')}` : '';
        showNotification(`✅ Script Frigost Officiel v3.0 copié ! (${window.frigostPathCreator.currentPath.length} points${configText})`, 'success');
    }).catch(() => {
        showNotification('❌ Erreur lors de la copie', 'error');
    });
}

// Effacer le chemin
function clearPath() {
    // Supprimer tous les marqueurs de la carte
    removeAllCheckmarks();
    
    window.frigostPathCreator.currentPath = [];
    updatePathList();
    debug('Chemin effacé');
    showNotification('Chemin et marqueurs effacés');
}

// Annuler la dernière action
function undoLastAction() {
    if (window.frigostPathCreator.currentPath.length > 0) {
        const lastPoint = window.frigostPathCreator.currentPath[window.frigostPathCreator.currentPath.length - 1];
        
        // Supprimer seulement le marqueur du dernier point
        const removed = removeCheckmark(lastPoint.x, lastPoint.y);
        
        if (removed) {
            // Supprimer le point du tableau seulement si le marqueur a été supprimé
            window.frigostPathCreator.currentPath.pop();
            
            // Mettre à jour seulement l'interface (pas les marqueurs)
            updatePathList();
            
            debug(`Dernière action annulée: (${lastPoint.x}, ${lastPoint.y})`);
            showNotification(`↩️ Point (${lastPoint.x}, ${lastPoint.y}) supprimé`);
        } else {
            debug(`⚠️ Impossible de supprimer le marqueur pour (${lastPoint.x}, ${lastPoint.y})`);
            showNotification(`❌ Erreur lors de la suppression du marqueur`, 'error');
        }
    } else {
        debug('⚠️ Aucun point à annuler');
        showNotification(`ℹ️ Aucun point à annuler`, 'info');
    }
}

// Définir la direction
function setDirection(dir) {
    const dirBtn = document.querySelector(`.dir-btn[data-direction="${dir}"]`);
    if (dirBtn) {
        dirBtn.click();
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `frigost-notification ${type}`;
    notification.textContent = message;
    
    // Ajouter une icône en fonction du type
    const icon = type === 'error' ? '❌' : 
                type === 'success' ? '✅' : 
                type === 'warning' ? '⚠️' : 'ℹ️';
                
    notification.innerHTML = `<span class="notification-icon">${icon}</span> ${message}`;
    
    document.body.appendChild(notification);

    // Supprimer après un délai plus long pour les erreurs
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        notification.remove();
    }, duration);
}



// Mise à jour visuelle des boutons d'action
function updateActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        const action = btn.dataset.action;
        if (window.frigostPathCreator.selectedActions.has(action)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    debug('Boutons d\'action mis à jour visuellement');
}

// Supprimer un marqueur spécifique
function removeCheckmark(x, y) {
    const key = `${x},${y}`;
    const marker = document.querySelector(`[data-check="${key}"]`);
    if (marker) {
        marker.remove();
        debug(`✅ Marqueur supprimé pour (${x}, ${y})`);
        return true;
    } else {
        debug(`⚠️ Aucun marqueur trouvé pour (${x}, ${y})`);
        return false;
    }
}

// Supprimer tous les marqueurs
function removeAllCheckmarks() {
    const markers = document.querySelectorAll('[data-check], .map-marker');
    let count = 0;
    markers.forEach(marker => {
        if (marker.getAttribute('data-check') !== 'test') { // Garder les marqueurs de test
            marker.remove();
            count++;
        }
    });
    debug(`✅ ${count} marqueur(s) supprimé(s) de la carte`);
    return count;
}

// Mettre à jour tous les marqueurs après un changement
function updateAllMarkers() {
    debug('🔄 Mise à jour de tous les marqueurs...');
    
    // Supprimer tous les marqueurs existants pour les recréer avec le nouveau système
    const allMarkers = document.querySelectorAll('.map-marker[data-check]');
    allMarkers.forEach(marker => {
        const coords = marker.getAttribute('data-coords');
        if (coords) {
            debug(`🗑️ Suppression du marqueur existant pour repositionnement: ${coords}`);
            marker.remove();
        }
    });
    
    // Recréer tous les marqueurs avec le nouveau système de positionnement
    window.frigostPathCreator.currentPath.forEach((point, index) => {
        debug(`➕ Recréation du marqueur pour (${point.x}, ${point.y})`);
        addCheckmarkToMap(point.x, point.y);
    });
    
    debug(`✅ Tous les marqueurs ont été repositionnés (${window.frigostPathCreator.currentPath.length} marqueurs)`);
}

// Mettre à jour seulement les numéros des marqueurs existants
function updateMarkerNumbers() {
    debug('🔢 Mise à jour des numéros de marqueurs...');
    
    window.frigostPathCreator.currentPath.forEach((point, index) => {
        const key = `${point.x},${point.y}`;
        const marker = document.querySelector(`[data-check="${key}"]`);
        if (marker) {
            const numberElement = marker.querySelector('.marker-number');
            if (numberElement) {
                numberElement.textContent = index + 1;
                debug(`📍 Marqueur (${point.x}, ${point.y}) renommé en ${index + 1}`);
            }
        }
    });
    
    debug(`✅ Numéros mis à jour pour ${window.frigostPathCreator.currentPath.length} marqueurs`);
}

// Supprimer un point spécifique du chemin par index
function removePathPoint(index) {
    if (index < 0 || index >= window.frigostPathCreator.currentPath.length) {
        debug(`⚠️ Index invalide: ${index}, taille du chemin: ${window.frigostPathCreator.currentPath.length}`);
        showNotification('❌ Impossible de supprimer ce point', 'error');
        return false;
    }
    
    const point = window.frigostPathCreator.currentPath[index];
    debug(`🗑️ Suppression du point ${index + 1}: (${point.x}, ${point.y})`);
    
    // Supprimer le marqueur spécifique
    const removed = removeCheckmark(point.x, point.y);
    
    if (removed) {
        // Supprimer le point du tableau
        window.frigostPathCreator.currentPath.splice(index, 1);
        
        // Mettre à jour seulement les numéros des marqueurs restants
        updateMarkerNumbers();
        
        // Mettre à jour l'affichage
        updatePathList();
        
        debug(`✅ Point supprimé, nouveau chemin: ${window.frigostPathCreator.currentPath.length} points`);
        showNotification(`🗑️ Point (${point.x}, ${point.y}) supprimé`, 'success');
        
        return true;
    } else {
        debug(`⚠️ Impossible de supprimer le marqueur pour (${point.x}, ${point.y})`);
        showNotification(`❌ Erreur lors de la suppression du marqueur`, 'error');
        return false;
    }
}



// Réinitialisation en cas de changement dynamique
const observer = new MutationObserver((mutations) => {
    // Vérifier si l'interface a été supprimée du DOM
    if (!document.querySelector('.frigost-path-creator')) {
        debug("Interface non trouvée après mutation, réinitialisation...");
        console.log('🚀 FRIGOST PATH CREATOR: Interface perdue, réinitialisation...');
        initializeExtension();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});



// Message listener for popup communication
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'ping') {
        sendResponse({pong: true, status: 'active'});
        return true;
    }
    
    if (request.action === 'getConfig') {
        sendResponse({config: window.frigostPathCreator.config});
        return true;
    }
    
    if (request.action === 'updateConfig') {
        // Update the configuration
        window.frigostPathCreator.config = {
            ...window.frigostPathCreator.config,
            ...request.config
        };
        
        // Save to localStorage
        try {
            localStorage.setItem('frigostPathCreatorConfig', JSON.stringify(window.frigostPathCreator.config));
            debug('💾 Configuration sauvegardée:', window.frigostPathCreator.config);
        } catch (error) {
            console.error('Failed to save config to localStorage:', error);
        }
        
        sendResponse({success: true});
        return true;
    }
});

// Fonction pour observer les coordonnées
function setupCoordinateObserver() {
    debug('🔍 Configuration de l\'observateur de coordonnées...');
    
    // Observer les changements dans le DOM pour détecter les nouvelles coordonnées
    const observer = new MutationObserver((mutations) => {
        // Vérifier s'il y a de nouveaux éléments avec des coordonnées
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Chercher des éléments avec des coordonnées
                        const coordElements = node.querySelectorAll ? 
                            node.querySelectorAll('div') : [];
                        
                        Array.from(coordElements).forEach(el => {
                            const text = el.textContent;
                            if (text && text.match(/-?\d+\s*,\s*-?\d+/)) {
                                debug(`📍 Nouvelles coordonnées détectées: ${text}`);
                            }
                        });
                    }
                });
            }
        });
    });
    
    // Observer le body pour détecter les changements
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    debug('✅ Observateur de coordonnées configuré');
}

// Fonction pour observer les changements de la carte
function setupMapObserver() {
    debug('🔍 Configuration de l\'observateur de carte...');
    
    // Observer pour détecter les changements de position de la carte
    const observer = new MutationObserver((mutations) => {
        let shouldUpdateMarkers = false;
        
        // Vérifier si des éléments importants ont changé
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Vérifier si des éléments de carte ont été ajoutés/supprimés
                const addedNodes = Array.from(mutation.addedNodes);
                const removedNodes = Array.from(mutation.removedNodes);
                
                const hasMapChanges = [...addedNodes, ...removedNodes].some(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        return node.classList && (
                            node.classList.contains('worldmap-map-container') ||
                            node.className.includes('map-container') ||
                            node.className.includes('map-position')
                        );
                    }
                    return false;
                });
                
                if (hasMapChanges) {
                    shouldUpdateMarkers = true;
                }
            }
        });
        
        // Mettre à jour les marqueurs seulement si nécessaire
        if (shouldUpdateMarkers && window.frigostPathCreator.currentPath.length > 0) {
            debug(`📍 Changement de carte détecté, mise à jour des marqueurs...`);
            // Utiliser un délai pour éviter les mises à jour trop fréquentes
            setTimeout(() => {
                updateAllMarkers();
            }, 500);
        }
    });
    
    // Observer le body pour détecter les changements structurels
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    debug('✅ Observateur de carte configuré');
}

// Fonction pour initialiser l'extension
function initializeExtension() {
    // Éviter l'initialisation multiple
    if (window.frigostPathCreator.initialized) {
        debug('⚠️ Extension déjà initialisée, arrêt');
        return;
    }
    
    debug('🚀 Initialisation de Frigost Path Creator...');
    
    // Créer l'interface
    createPathCreatorUI();
    
    // Configurer les observateurs
    setupCoordinateObserver();
    setupMapObserver();
    
    // Ajouter l'écouteur de clic sur la carte
    document.addEventListener('click', handleMapClick);
    
    // Ajouter les raccourcis clavier
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Restaurer les marqueurs existants si il y en a
    if (window.frigostPathCreator.currentPath.length > 0) {
        debug(`🔄 Restauration de ${window.frigostPathCreator.currentPath.length} marqueur(s) existant(s)...`);
        setTimeout(() => {
            updateAllMarkers();
        }, 1000);
    }
    
    // Marquer comme initialisé
    window.frigostPathCreator.initialized = true;
    
    debug('✅ Extension initialisée avec succès');
}

// Initialisation immédiate si le DOM est prêt
if (document.readyState === "complete" || document.readyState === "interactive") {
    debug("DOM déjà chargé, initialisation immédiate");
    initializeExtension();
} else {
    debug("DOM en cours de chargement, attente...");
    document.addEventListener('DOMContentLoaded', initializeExtension);
} 