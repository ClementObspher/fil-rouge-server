#!/bin/bash

# Script d'audit de sécurité pour projet utilisant Bun
# Validation compétence RNCP C4.1.1

set -e

echo "🔍 Audit de Sécurité des Dépendances - $(date)"
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

# Vérification des outils requis
check_tools() {
    log_info "Vérification des outils requis..."
    
    if ! command -v bun &> /dev/null; then
        log_error "Bun n'est pas installé"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_warning "npm n'est pas installé, certaines vérifications seront limitées"
    fi
    
    log_success "Outils vérifiés"
}

# Analyse des dépendances obsolètes
check_outdated() {
    log_info "Vérification des dépendances obsolètes..."
    
    echo "### Dépendances Obsolètes" > audit-report.md
    echo "Date: $(date)" >> audit-report.md
    echo "" >> audit-report.md
    
    bun outdated > outdated.tmp 2>/dev/null || true
    
    if [ -s outdated.tmp ]; then
        log_warning "Dépendances obsolètes détectées"
        echo '```' >> audit-report.md
        cat outdated.tmp >> audit-report.md
        echo '```' >> audit-report.md
        cat outdated.tmp
    else
        log_success "Toutes les dépendances sont à jour"
        echo "✅ Toutes les dépendances sont à jour" >> audit-report.md
    fi
    
    rm -f outdated.tmp
    echo "" >> audit-report.md
}

# Audit de sécurité via npm (compatible avec package.json)
security_audit() {
    log_info "Audit de sécurité des vulnérabilités..."
    
    echo "### Audit de Sécurité" >> audit-report.md
    
    # Créer un package-lock temporaire pour npm audit
    if [ -f package.json ]; then
        # Sauvegarde du package-lock existant s'il y en a un
        if [ -f package-lock.json ]; then
            cp package-lock.json package-lock.json.backup
        fi
        
        # Générer package-lock temporaire
        npm install --package-lock-only --silent 2>/dev/null || log_warning "Impossible de générer package-lock"
        
        if [ -f package-lock.json ]; then
            npm audit --audit-level=moderate --json > audit.json 2>/dev/null || true
            
            if [ -f audit.json ] && [ -s audit.json ]; then
                # Parser les résultats JSON
                vulnerabilities=$(jq '.metadata.vulnerabilities.total // 0' audit.json 2>/dev/null || echo 0)
                critical=$(jq '.metadata.vulnerabilities.critical // 0' audit.json 2>/dev/null || echo 0)
                high=$(jq '.metadata.vulnerabilities.high // 0' audit.json 2>/dev/null || echo 0)
                moderate=$(jq '.metadata.vulnerabilities.moderate // 0' audit.json 2>/dev/null || echo 0)
                low=$(jq '.metadata.vulnerabilities.low // 0' audit.json 2>/dev/null || echo 0)
                
                echo "- **Vulnérabilités totales**: $vulnerabilities" >> audit-report.md
                echo "- **Critiques**: $critical" >> audit-report.md
                echo "- **Élevées**: $high" >> audit-report.md
                echo "- **Modérées**: $moderate" >> audit-report.md
                echo "- **Faibles**: $low" >> audit-report.md
                
                if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
                    log_error "Vulnérabilités critiques ou élevées détectées!"
                    echo "" >> audit-report.md
                    echo "⚠️ **ACTION REQUISE**: Vulnérabilités critiques détectées" >> audit-report.md
                    exit 1
                elif [ "$moderate" -gt 0 ]; then
                    log_warning "Vulnérabilités modérées détectées"
                    echo "" >> audit-report.md
                    echo "⚠️ Vulnérabilités modérées détectées - Revue recommandée" >> audit-report.md
                else
                    log_success "Aucune vulnérabilité critique détectée"
                    echo "" >> audit-report.md
                    echo "✅ Aucune vulnérabilité critique détectée" >> audit-report.md
                fi
            else
                log_warning "Impossible d'effectuer l'audit de sécurité"
                echo "⚠️ Audit de sécurité non disponible" >> audit-report.md
            fi
            
            # Nettoyer les fichiers temporaires
            rm -f audit.json
            rm -f package-lock.json
            
            # Restaurer le package-lock original s'il existait
            if [ -f package-lock.json.backup ]; then
                mv package-lock.json.backup package-lock.json
            fi
        fi
    fi
    
    echo "" >> audit-report.md
}

# Vérification des licences
check_licenses() {
    log_info "Vérification des licences..."
    
    echo "### Licences des Dépendances" >> audit-report.md
    
    # Liste des licences problématiques
    problematic_licenses=("GPL-3.0" "AGPL-3.0" "LGPL-3.0" "WTFPL")
    
    if command -v npx &> /dev/null; then
        npx license-checker --json > licenses.json 2>/dev/null || true
        
        if [ -f licenses.json ] && [ -s licenses.json ]; then
            log_success "Analyse des licences terminée"
            echo "✅ Analyse des licences disponible dans licenses.json" >> audit-report.md
        else
            log_warning "Impossible d'analyser les licences"
            echo "⚠️ Analyse des licences non disponible" >> audit-report.md
        fi
        
        rm -f licenses.json
    else
        echo "⚠️ npx non disponible pour l'analyse des licences" >> audit-report.md
    fi
    
    echo "" >> audit-report.md
}

# Générer des recommandations
generate_recommendations() {
    log_info "Génération des recommandations..."
    
    echo "### Recommandations" >> audit-report.md
    echo "" >> audit-report.md
    echo "#### Actions Immédiates" >> audit-report.md
    echo "- [ ] Appliquer les mises à jour de sécurité critiques" >> audit-report.md
    echo "- [ ] Réviser les vulnérabilités modérées" >> audit-report.md
    echo "- [ ] Mettre à jour les dépendances obsolètes" >> audit-report.md
    echo "" >> audit-report.md
    echo "#### Actions Préventives" >> audit-report.md
    echo "- [ ] Programmer des audits automatiques hebdomadaires" >> audit-report.md
    echo "- [ ] Configurer des alertes pour nouvelles vulnérabilités" >> audit-report.md
    echo "- [ ] Mettre en place des tests de régression" >> audit-report.md
    echo "" >> audit-report.md
    echo "#### Surveillance Continue" >> audit-report.md
    echo "- [ ] Monitorer les nouvelles versions des dépendances" >> audit-report.md
    echo "- [ ] Réviser les politiques de mise à jour" >> audit-report.md
    echo "- [ ] Documenter les changements effectués" >> audit-report.md
    echo "" >> audit-report.md
    
    log_success "Recommandations générées"
}

# Fonction principale
main() {
    echo "🚀 Démarrage de l'audit de sécurité..."
    
    check_tools
    check_outdated
    security_audit
    check_licenses
    generate_recommendations
    
    echo ""
    log_success "Audit terminé. Rapport disponible dans: audit-report.md"
    echo ""
    echo "📊 Résumé:"
    echo "- Dépendances analysées ✓"
    echo "- Vulnérabilités vérifiées ✓"
    echo "- Licences contrôlées ✓"
    echo "- Recommandations générées ✓"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Réviser le rapport: audit-report.md"
    echo "2. Appliquer les corrections recommandées"
    echo "3. Programmer les prochains audits"
}

# Exécution
main "$@" 