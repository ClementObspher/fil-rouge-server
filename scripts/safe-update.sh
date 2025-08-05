#!/bin/bash

# Script de mise à jour sécurisée des dépendances
# Validation compétence RNCP C4.1.1

set -e

echo "🔄 Mise à Jour Sécurisée des Dépendances - $(date)"
echo "=================================================="

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de log
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Variables
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
UPDATE_LOG="update-log-$(date +%Y%m%d-%H%M%S).md"

# Fonction de backup
create_backup() {
    log_info "Création du backup..."
    mkdir -p "$BACKUP_DIR"
    cp package.json "$BACKUP_DIR/"
    cp bun.lock "$BACKUP_DIR/" 2>/dev/null || true
    log_success "Backup créé dans: $BACKUP_DIR"
}

# Fonction de restauration
restore_backup() {
    log_error "Restauration du backup..."
    cp "$BACKUP_DIR/package.json" .
    cp "$BACKUP_DIR/bun.lock" . 2>/dev/null || true
    log_warning "Backup restauré depuis: $BACKUP_DIR"
}

# Fonction de test de l'application
test_application() {
    log_info "Test de l'application..."
    
    # Test de compilation
    if ! bun run build 2>/dev/null; then
        log_warning "Pas de script build, test de compilation TypeScript..."
        if ! bunx tsc --noEmit; then
            log_error "Erreur de compilation TypeScript"
            return 1
        fi
    fi
    
    # Test de démarrage (timeout 10 secondes)
    log_info "Test de démarrage du serveur..."
    timeout 10s bun run dev > server-test.log 2>&1 &
    SERVER_PID=$!
    
    sleep 3
    
    # Test de réponse HTTP
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        log_success "Serveur répond correctement"
        kill $SERVER_PID 2>/dev/null || true
        return 0
    else
        log_error "Serveur ne répond pas"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    fi
}

# Fonction de mise à jour sélective
update_dependencies() {
    local update_type="$1"
    local packages="$2"
    
    log_info "Mise à jour $update_type: $packages"
    
    case $update_type in
        "patch")
            # Mises à jour de patch (sûres)
            for package in $packages; do
                log_info "Mise à jour patch: $package"
                if bun update "$package"; then
                    echo "✅ $package mis à jour" >> "$UPDATE_LOG"
                else
                    echo "❌ Échec mise à jour $package" >> "$UPDATE_LOG"
                    return 1
                fi
            done
            ;;
        "minor")
            # Mises à jour mineures (avec test)
            for package in $packages; do
                log_info "Mise à jour minor: $package"
                if bun update "$package"; then
                    if test_application; then
                        echo "✅ $package mis à jour et testé" >> "$UPDATE_LOG"
                    else
                        log_error "Test échoué après mise à jour de $package"
                        echo "❌ Test échoué pour $package" >> "$UPDATE_LOG"
                        return 1
                    fi
                else
                    echo "❌ Échec mise à jour $package" >> "$UPDATE_LOG"
                    return 1
                fi
            done
            ;;
        "major")
            # Mises à jour majeures (avec analyse préalable)
            log_warning "Mises à jour majeures détectées - Analyse manuelle requise"
            echo "⚠️ Mises à jour majeures nécessitent une analyse manuelle:" >> "$UPDATE_LOG"
            for package in $packages; do
                echo "  - $package" >> "$UPDATE_LOG"
            done
            return 0
            ;;
    esac
}

# Fonction d'analyse des dépendances
analyze_dependencies() {
    log_info "Analyse des dépendances obsolètes..."
    
    # Créer le fichier de log
    echo "# Rapport de Mise à Jour - $(date)" > "$UPDATE_LOG"
    echo "" >> "$UPDATE_LOG"
    
    # Obtenir les dépendances obsolètes
    bun outdated > outdated.tmp 2>/dev/null || true
    
    if [ ! -s outdated.tmp ]; then
        log_success "Toutes les dépendances sont à jour"
        echo "✅ Toutes les dépendances sont à jour" >> "$UPDATE_LOG"
        return 0
    fi
    
    # Analyser par type de mise à jour
    local patch_packages=""
    local minor_packages=""
    local major_packages=""
    
    while IFS= read -r line; do
        if [[ $line =~ ^[[:space:]]*([^[:space:]]+)[[:space:]]+([^[:space:]]+)[[:space:]]+([^[:space:]]+)[[:space:]]+([^[:space:]]+) ]]; then
            package="${BASH_REMATCH[1]}"
            current="${BASH_REMATCH[2]}"
            update="${BASH_REMATCH[3]}"
            latest="${BASH_REMATCH[4]}"
            
            # Déterminer le type de mise à jour
            if [[ "$current" == "$update" ]]; then
                # Mise à jour majeure
                major_packages="$major_packages $package"
            elif [[ "$update" == "$latest" ]]; then
                # Mise à jour mineure
                minor_packages="$minor_packages $package"
            else
                # Mise à jour de patch
                patch_packages="$patch_packages $package"
            fi
        fi
    done < outdated.tmp
    
    echo "### Dépendances à Mettre à Jour" >> "$UPDATE_LOG"
    echo '```' >> "$UPDATE_LOG"
    cat outdated.tmp >> "$UPDATE_LOG"
    echo '```' >> "$UPDATE_LOG"
    echo "" >> "$UPDATE_LOG"
    
    # Appliquer les mises à jour
    if [ -n "$patch_packages" ]; then
        update_dependencies "patch" "$patch_packages" || return 1
    fi
    
    if [ -n "$minor_packages" ]; then
        update_dependencies "minor" "$minor_packages" || return 1
    fi
    
    if [ -n "$major_packages" ]; then
        update_dependencies "major" "$major_packages"
    fi
    
    rm -f outdated.tmp
}

# Fonction de nettoyage
cleanup() {
    log_info "Nettoyage..."
    rm -f server-test.log
    rm -f outdated.tmp
}

# Fonction principale
main() {
    echo "🚀 Démarrage de la mise à jour sécurisée..."
    
    # Vérifications préalables
    if [ ! -f package.json ]; then
        log_error "package.json non trouvé"
        exit 1
    fi
    
    # Créer le backup
    create_backup
    
    # Test initial
    log_info "Test initial de l'application..."
    if ! test_application; then
        log_error "L'application ne fonctionne pas correctement avant mise à jour"
        restore_backup
        exit 1
    fi
    
    # Analyser et mettre à jour
    if analyze_dependencies; then
        log_success "Mise à jour terminée avec succès"
        echo "" >> "$UPDATE_LOG"
        echo "## ✅ Mise à jour terminée avec succès" >> "$UPDATE_LOG"
    else
        log_error "Échec de la mise à jour"
        echo "" >> "$UPDATE_LOG"
        echo "## ❌ Échec de la mise à jour" >> "$UPDATE_LOG"
        restore_backup
        cleanup
        exit 1
    fi
    
    # Test final
    log_info "Test final de l'application..."
    if test_application; then
        log_success "Application fonctionne correctement après mise à jour"
        echo "✅ Test final réussi" >> "$UPDATE_LOG"
    else
        log_error "Application ne fonctionne plus après mise à jour"
        echo "❌ Test final échoué" >> "$UPDATE_LOG"
        restore_backup
        cleanup
        exit 1
    fi
    
    # Nettoyage
    cleanup
    
    echo ""
    log_success "Mise à jour sécurisée terminée"
    echo "📊 Résumé:"
    echo "- Backup créé: $BACKUP_DIR"
    echo "- Log de mise à jour: $UPDATE_LOG"
    echo "- Tests passés ✓"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Réviser le log: $UPDATE_LOG"
    echo "2. Tester manuellement l'application"
    echo "3. Commiter les changements si tout est OK"
}

# Gestion des erreurs
trap 'log_error "Erreur détectée, restauration du backup..."; restore_backup; cleanup; exit 1' ERR

# Exécution
main "$@" 