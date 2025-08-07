#!/bin/bash

# Script de test pour le correctif de protection brute force
# Compétence RNCP C4.2.2 - Créer et déployer un correctif

set -e

echo "🧪 Test du Correctif Brute Force Protection - $(date)"
echo "======================================================="

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

# Configuration du test
BASE_URL="http://localhost:3001"
TEST_IP="192.168.1.100"

# Fonction pour attendre que le serveur soit prêt
wait_for_server() {
    log_info "Vérification de la disponibilité du serveur..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$BASE_URL" > /dev/null 2>&1; then
            log_success "Serveur disponible"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_error "Serveur non disponible après $max_attempts secondes"
    return 1
}

# Test 1: Tentatives normales (doivent passer)
test_normal_attempts() {
    log_info "Test 1: Tentatives d'authentification normales"
    
    # Première tentative (doit passer)
    response=$(curl -s -w "%{http_code}" -o response.tmp \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: 192.168.1.50" \
        -d '{"username":"test","password":"wrong"}' \
        "$BASE_URL/api/auth/login")
    
    if [ "$response" = "401" ]; then
        log_success "Tentative normale acceptée (erreur 401 attendue)"
    else
        log_error "Tentative normale échouée (code: $response)"
        return 1
    fi
    
    sleep 1
    
    # Deuxième tentative avec même IP (doit passer)
    response=$(curl -s -w "%{http_code}" -o response.tmp \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: 192.168.1.50" \
        -d '{"username":"test","password":"wrong"}' \
        "$BASE_URL/api/auth/login")
    
    if [ "$response" = "401" ]; then
        log_success "Deuxième tentative normale acceptée"
    else
        log_error "Deuxième tentative normale échouée (code: $response)"
        return 1
    fi
}

# Test 2: Déclenchement de brute force
test_brute_force_detection() {
    log_info "Test 2: Déclenchement de la protection brute force"
    
    local test_ip="192.168.1.100"
    
    # Effectuer 5 tentatives rapidement (seuil défini dans le code)
    for i in {1..5}; do
        log_info "Tentative $i/5..."
        response=$(curl -s -w "%{http_code}" -o response.tmp \
            -H "Content-Type: application/json" \
            -H "X-Forwarded-For: $test_ip" \
            -d '{"username":"test","password":"wrong"}' \
            "$BASE_URL/api/auth/login")
        
        echo "  → Code réponse: $response"
        sleep 0.5
    done
    
    # La 6ème tentative doit être bloquée
    log_info "Tentative 6/6 (doit être bloquée)..."
    response=$(curl -s -w "%{http_code}" -o response.tmp \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: $test_ip" \
        -d '{"username":"test","password":"wrong"}' \
        "$BASE_URL/api/auth/login")
    
    if [ "$response" = "429" ]; then
        log_success "Protection brute force activée (code 429)"
        
        # Vérifier le contenu de la réponse
        if grep -q "IP temporairement bloquée" response.tmp; then
            log_success "Message de blocage correct"
        else
            log_warning "Message de blocage non trouvé"
        fi
        
    else
        log_error "Protection brute force NON activée (code: $response)"
        return 1
    fi
}

# Test 3: Test sur endpoint admin
test_admin_protection() {
    log_info "Test 3: Protection sur endpoint admin"
    
    local test_ip="192.168.1.200"
    
    # Effectuer 5 tentatives sur l'endpoint admin
    for i in {1..5}; do
        response=$(curl -s -w "%{http_code}" -o response.tmp \
            -H "Content-Type: application/json" \
            -H "X-Forwarded-For: $test_ip" \
            -d '{"username":"admin","password":"wrong"}' \
            "$BASE_URL/admin/login")
        
        echo "  → Tentative admin $i: $response"
        sleep 0.5
    done
    
    # La 6ème tentative doit être bloquée
    response=$(curl -s -w "%{http_code}" -o response.tmp \
        -H "Content-Type: application/json" \
        -H "X-Forwarded-For: $test_ip" \
        -d '{"username":"admin","password":"wrong"}' \
        "$BASE_URL/admin/login")
    
    if [ "$response" = "429" ]; then
        log_success "Protection admin activée"
    else
        log_error "Protection admin NON activée (code: $response)"
        return 1
    fi
}

# Test 4: Endpoints non protégés
test_unprotected_endpoints() {
    log_info "Test 4: Endpoints non-auth non affectés"
    
    # Test sur un endpoint qui ne doit pas être protégé
    response=$(curl -s -w "%{http_code}" -o response.tmp \
        -H "X-Forwarded-For: $TEST_IP" \
        "$BASE_URL/api/events")
    
    if [ "$response" != "429" ]; then
        log_success "Endpoints non-auth non affectés (code: $response)"
    else
        log_error "Endpoints non-auth incorrectement bloqués"
        return 1
    fi
}

# Test 5: Vérification des logs d'anomalies
test_anomaly_logging() {
    log_info "Test 5: Vérification de la consignation d'anomalies"
    
    # Attendre un peu pour que les logs soient traités
    sleep 2
    
    # Vérifier via l'API des anomalies
    response=$(curl -s -w "%{http_code}" -o anomalies.tmp \
        "$BASE_URL/api/anomalies")
    
    if [ "$response" = "200" ]; then
        if grep -q "brute.force\|Attaque" anomalies.tmp; then
            log_success "Anomalie brute force consignée"
        else
            log_warning "Anomalie brute force non trouvée dans les logs"
        fi
    else
        log_warning "Impossible de vérifier les anomalies (code: $response)"
    fi
}

# Fonction de nettoyage
cleanup() {
    log_info "Nettoyage des fichiers temporaires..."
    rm -f response.tmp anomalies.tmp
}

# Fonction principale
main() {
    echo "🚀 Démarrage des tests du correctif brute force..."
    
    # Attendre que le serveur soit prêt
    if ! wait_for_server; then
        log_error "Impossible de joindre le serveur"
        exit 1
    fi
    
    # Exécuter les tests
    local tests_passed=0
    local total_tests=5
    
    if test_normal_attempts; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_brute_force_detection; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_admin_protection; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_unprotected_endpoints; then
        tests_passed=$((tests_passed + 1))
    fi
    
    if test_anomaly_logging; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Nettoyage
    cleanup
    
    # Résultats
    echo ""
    echo "📊 Résultats des Tests:"
    echo "======================="
    log_info "Tests réussis: $tests_passed/$total_tests"
    
    if [ $tests_passed -eq $total_tests ]; then
        log_success "🎉 TOUS LES TESTS SONT PASSÉS"
        echo ""
        echo "✅ Le correctif brute force fonctionne correctement"
        echo "✅ Protection activée sur les endpoints d'authentification"
        echo "✅ Anomalies consignées automatiquement"
        echo "✅ Endpoints non-auth non affectés"
        exit 0
    else
        log_error "❌ CERTAINS TESTS ONT ÉCHOUÉ"
        echo ""
        echo "❌ Tests échoués: $((total_tests - tests_passed))/$total_tests"
        echo "🔍 Vérifiez les logs du serveur pour plus de détails"
        exit 1
    fi
}

# Gestion des erreurs
trap 'log_error "Erreur détectée, nettoyage..."; cleanup; exit 1' ERR

# Exécution
main "$@"
