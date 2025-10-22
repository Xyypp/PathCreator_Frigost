/**
 * Frigost Path Creator V5 - Lua Script Parser
 * Permet l'import et le parsing de scripts Lua existants
 */

class LuaScriptParser {
    constructor() {
        this.debug = true;
    }

    /**
     * Parse un script Lua complet et extrait le trajet
     * @param {string} luaScript - Script Lua à parser
     * @returns {Object} - Résultat du parsing avec trajet et configuration
     */
    parseScript(luaScript) {
        const result = {
            success: false,
            path: [],
            config: {},
            errors: [],
            warnings: []
        };

        try {
            // 1. Extraire mapActionsTable
            const pathData = this.extractMapActionsTable(luaScript);
            if (pathData.length === 0) {
                result.errors.push("Aucun mapActionsTable trouvé dans le script");
                return result;
            }
            result.path = pathData;

            // 2. Extraire les paramètres de configuration
            result.config = this.extractConfiguration(luaScript);

            // 3. Validation du trajet
            const validation = this.validatePath(result.path);
            result.errors = validation.errors;
            result.warnings = validation.warnings;

            result.success = result.errors.length === 0;
            
            if (this.debug) {
                console.log('✅ Parsing réussi:', {
                    points: result.path.length,
                    config: Object.keys(result.config).length,
                    errors: result.errors.length,
                    warnings: result.warnings.length
                });
            }

        } catch (error) {
            result.errors.push(`Erreur de parsing: ${error.message}`);
            console.error('❌ Erreur de parsing:', error);
        }

        return result;
    }

    /**
     * Extrait le mapActionsTable du script Lua
     * @param {string} script - Script Lua
     * @returns {Array} - Tableau de points du trajet
     */
    extractMapActionsTable(script) {
        const path = [];
        
        // Pattern pour capturer mapActionsTable
        const tablePattern = /mapActionsTable\s*=\s*\{([\s\S]*?)\}\s*(?:for|$)/;
        const match = script.match(tablePattern);
        
        if (!match) {
            console.warn('⚠️ mapActionsTable non trouvé');
            return path;
        }

        const tableContent = match[1];
        
        // Pattern pour chaque entrée de map
        // Supporte: { map = "X,Y", path = "direction", fight = true, gather = false }
        const entryPattern = /\{\s*map\s*=\s*["']([^"']+)["']\s*,\s*path\s*=\s*["']([^"']+)["'](?:\s*,\s*fight\s*=\s*(true|false))?(?:\s*,\s*gather\s*=\s*(true|false))?\s*\}/g;
        
        let entryMatch;
        while ((entryMatch = entryPattern.exec(tableContent)) !== null) {
            const [, mapCoord, pathDir, fightStr, gatherStr] = entryMatch;
            
            // Parser les coordonnées
            const coords = this.parseCoordinates(mapCoord);
            if (!coords) {
                console.warn(`⚠️ Coordonnées invalides: ${mapCoord}`);
                continue;
            }

            // Parser les directions
            const directions = pathDir.split('|');

            // Construire l'objet point
            const point = {
                x: coords.x,
                y: coords.y,
                direction: pathDir,
                actions: []
            };

            // Ajouter les actions
            if (fightStr === 'true') point.actions.push('combat');
            if (gatherStr === 'true') point.actions.push('recolte');

            path.push(point);
        }

        console.log(`📍 ${path.length} points extraits du mapActionsTable`);
        return path;
    }

    /**
     * Parse les coordonnées d'une map
     * @param {string} mapCoord - Coordonnées au format "X,Y"
     * @returns {Object|null} - {x, y} ou null si invalide
     */
    parseCoordinates(mapCoord) {
        const coordPattern = /^(-?\d+)\s*,\s*(-?\d+)$/;
        const match = mapCoord.match(coordPattern);
        
        if (!match) return null;
        
        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);
        
        if (isNaN(x) || isNaN(y)) return null;
        
        return { x, y };
    }

    /**
     * Extrait la configuration du script
     * @param {string} script - Script Lua
     * @returns {Object} - Configuration extraite
     */
    extractConfiguration(script) {
        const config = {};

        // Patterns pour chaque paramètre
        const patterns = {
            maxMonsters: /MAX_MONSTERS\s*=\s*(\d+)/,
            minMonsters: /MIN_MONSTERS\s*=\s*(\d+)/,
            forceMonsters: /FORCE_MONSTERS\s*=\s*\{([^}]+)\}/,
            forbiddenMonsters: /FORBIDDEN_MONSTERS\s*=\s*\{([^}]+)\}/,
            gatherResources: /GATHER\s*=\s*\{([^}]+)\}/,
            autoDeleteResources: /AUTO_DELETE\s*=\s*\{([^}]+)\}/,
            planningHours: /PLANNING\s*=\s*\{([^}]+)\}/,
            startingMap: /STARTING_MAP\s*=\s*["']([^"']+)["']/,
            startDelay: /global\.sleep\((\d+)\).*?téléportation/i,
            mapChangeDelay: /MAP_CHANGE_DELAY\s*=\s*(\d+)/,
            mapDelayRandom: /MAP_CHANGE_DELAY_RANDOM\s*=\s*(true|false)/
        };

        // Extraire chaque paramètre
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = script.match(pattern);
            if (match) {
                if (key === 'mapDelayRandom') {
                    config[key] = match[1] === 'true';
                } else if (key === 'startingMap') {
                    const coords = this.parseCoordinates(match[1]);
                    if (coords) {
                        config.startX = coords.x.toString();
                        config.startY = coords.y.toString();
                    }
                } else if (['forceMonsters', 'forbiddenMonsters', 'gatherResources', 'autoDeleteResources', 'planningHours'].includes(key)) {
                    // Nettoyer les espaces et quotes
                    config[key] = match[1].replace(/["']/g, '').trim();
                } else {
                    config[key] = match[1];
                }
            }
        }

        // Parser AMOUNT_MONSTERS (format spécial)
        const amountPattern = /AMOUNT_MONSTERS\s*=\s*\{([\s\S]*?)\}/;
        const amountMatch = script.match(amountPattern);
        if (amountMatch) {
            const content = amountMatch[1];
            const entries = [];
            const entryPattern = /\{(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\}/g;
            let entryMatch;
            while ((entryMatch = entryPattern.exec(content)) !== null) {
                entries.push(`${entryMatch[1]}, ${entryMatch[2]}, ${entryMatch[3]}`);
            }
            if (entries.length > 0) {
                config.amountMonsters = entries.join('\n');
            }
        }

        console.log(`⚙️ Configuration extraite: ${Object.keys(config).length} paramètres`);
        return config;
    }

    /**
     * Valide un trajet
     * @param {Array} path - Trajet à valider
     * @returns {Object} - Résultat de la validation
     */
    validatePath(path) {
        const errors = [];
        const warnings = [];

        if (path.length === 0) {
            errors.push("Le trajet est vide");
            return { errors, warnings };
        }

        // Vérifier chaque point
        path.forEach((point, index) => {
            // Validation des coordonnées
            if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
                errors.push(`Point ${index + 1}: Coordonnées invalides (${point.x}, ${point.y})`);
            }

            // Vérification de la plage
            if (Math.abs(point.x) > 100 || Math.abs(point.y) > 100) {
                warnings.push(`Point ${index + 1}: Coordonnées hors plage normale (${point.x}, ${point.y})`);
            }

            // Validation des directions
            if (!point.direction || point.direction.trim() === '') {
                errors.push(`Point ${index + 1}: Aucune direction spécifiée`);
            }

            // Validation des actions
            if (!point.actions || point.actions.length === 0) {
                warnings.push(`Point ${index + 1}: Aucune action spécifiée (mouvement simple)`);
            }
        });

        // Vérifier les doublons de coordonnées
        const coordMap = new Map();
        path.forEach((point, index) => {
            const key = `${point.x},${point.y}`;
            if (coordMap.has(key)) {
                warnings.push(`Points ${coordMap.get(key) + 1} et ${index + 1}: Même coordonnée (${key})`);
            } else {
                coordMap.set(key, index);
            }
        });

        return { errors, warnings };
    }

    /**
     * Parse un script JSON exporté
     * @param {string} jsonString - JSON à parser
     * @returns {Object} - Résultat du parsing
     */
    parseJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.route || !Array.isArray(data.route)) {
                return {
                    success: false,
                    errors: ["Format JSON invalide: 'route' manquant ou incorrect"]
                };
            }

            // Convertir le format JSON en format interne
            const path = data.route.map(entry => ({
                x: entry.x,
                y: entry.y,
                direction: entry.path || entry.direction,
                actions: [
                    ...(entry.fight ? ['combat'] : []),
                    ...(entry.gather ? ['recolte'] : [])
                ]
            }));

            return {
                success: true,
                path: path,
                config: data.config || {},
                errors: [],
                warnings: []
            };
        } catch (error) {
            return {
                success: false,
                errors: [`Erreur de parsing JSON: ${error.message}`]
            };
        }
    }

    /**
     * Détecte automatiquement le format du texte importé
     * @param {string} text - Texte à analyser
     * @returns {string} - Format détecté: 'lua', 'json', ou 'unknown'
     */
    detectFormat(text) {
        if (!text || text.trim() === '') return 'unknown';

        // Détecter JSON
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
            try {
                JSON.parse(text);
                return 'json';
            } catch (e) {
                // Pas du JSON valide
            }
        }

        // Détecter Lua
        if (text.includes('mapActionsTable') || text.includes('function') || text.includes('local')) {
            return 'lua';
        }

        return 'unknown';
    }

    /**
     * Point d'entrée principal pour l'import
     * @param {string} text - Texte à importer
     * @returns {Object} - Résultat de l'import
     */
    import(text) {
        const format = this.detectFormat(text);
        console.log(`📄 Format détecté: ${format}`);

        if (format === 'json') {
            return this.parseJSON(text);
        } else if (format === 'lua') {
            return this.parseScript(text);
        } else {
            return {
                success: false,
                errors: ["Format non reconnu. Formats supportés: Lua script ou JSON exporté"],
                warnings: []
            };
        }
    }
}

// Export pour utilisation dans content.js
if (typeof window !== 'undefined') {
    window.LuaScriptParser = LuaScriptParser;
}

// Test unitaire simple
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LuaScriptParser;
}

// === EXEMPLE D'UTILISATION ===
/*
const parser = new LuaScriptParser();

const sampleScript = `
MAX_MONSTERS = 8
MIN_MONSTERS = 2
GATHER = { 254, 255, -67 }

mapActionsTable = {
    { map = "-16,-22", path = "right", fight = true },
    { map = "-15,-22", path = "bottom", fight = true, gather = true },
    { map = "-15,-21", path = "left", fight = true }
}
`;

const result = parser.import(sampleScript);
console.log('Résultat:', result);
// => { success: true, path: [...], config: {...}, errors: [], warnings: [] }
*/