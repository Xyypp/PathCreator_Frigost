# Changelog

## Version 2.0 - Mise à jour majeure

### Nouvelles fonctionnalités
- Renommage en "Frigost Path Creator" pour meilleure cohérence avec l'écosystème Frigost
- Interface utilisateur complètement redessinée avec un thème sombre moderne
- Affichage des informations de la carte de départ avec bouton de copie pour la commande `/travel`
- Prévisualisation visuelle du chemin avec marqueurs numérotés sur la carte
- Formats d'exportation multiples (script complet, table de route, JSON)
- Persistance des données entre les sessions grâce à chrome.storage.local
- Outil de diagnostic intégré pour résoudre les problèmes

### Améliorations techniques
- Support de multiples patterns d'URL pour DofusDB (différentes versions linguistiques)
- Meilleure détection des coordonnées sur la carte
- Gestion améliorée des erreurs et des cas limites
- Chargement plus fiable du script de contenu
- Script d'arrière-plan pour une meilleure communication entre composants
- Support du menu contextuel pour un accès rapide aux outils de diagnostic

### Corrections de bugs
- Correction du problème de correspondance d'URL pour DofusDB
- Amélioration de la stabilité lors de l'enregistrement des chemins
- Correction des problèmes d'affichage des marqueurs de chemin
- Meilleure gestion des erreurs de communication entre scripts

## Version 1.0 - Version initiale

- Enregistrement de chemins sur DofusDB
- Interface utilisateur basique
- Exportation en format Lua pour Frigost Bot 