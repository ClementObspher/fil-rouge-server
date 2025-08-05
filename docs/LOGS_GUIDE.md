# Guide des Logs Structurés avec Correlation IDs

## 📍 **Où Trouver les Logs**

### 1. **Console de l'Application (Temps Réel)**
Quand vous lancez l'application :
```bash
bun run dev
```

Vous verrez des logs structurés comme :
```json
INFO: {"timestamp":"2025-08-05T08:15:23.456Z","level":"info","service":"fil-rouge-server","requestId":"req_1725517723456_abc123def","message":"GET / - 200 (45ms)","type":"http_request","method":"GET","path":"/","statusCode":200,"responseTime":45,"ip":"127.0.0.1","userAgent":"curl/8.4.0"}
```

### 2. **Fichiers de Logs (Persistants)**
Les logs sont automatiquement sauvegardés dans le dossier `logs/` :

```
logs/
├── info-2025-08-05.log      # Logs d'information
├── warn-2025-08-05.log      # Logs d'avertissement  
├── error-2025-08-05.log     # Logs d'erreur
└── debug-2025-08-05.log     # Logs de debug (dev seulement)
```

### 3. **APIs de Consultation des Logs**

#### Endpoints Disponibles
```bash
# Logs récents par niveau
GET /monitoring/logs/info?lines=100
GET /monitoring/logs/warn?lines=50
GET /monitoring/logs/error?lines=25
GET /monitoring/logs/debug?lines=10

# Recherche par Request ID
GET /monitoring/logs/request/req_1725517723456_abc123def

# Résumé des logs
GET /monitoring/logs/summary?hours=24

# Tous les logs mélangés
GET /monitoring/logs/all?lines=50
```

## 🔍 **Utilisation des Correlation IDs**

### Format des Request IDs
```
req_[timestamp]_[random]
Exemple: req_1725517723456_abc123def
```

### Traçabilité Complète
Chaque requête HTTP reçoit un ID unique qui permet de suivre :
- La requête initiale
- Les opérations business associées
- Les éventuelles erreurs
- Les events de sécurité

### Exemple de Traçage
```bash
# 1. Requête initiale
curl -H "x-request-id: mon-test-123" http://localhost:3001/api/auth/login

# 2. Recherche des logs liés
curl http://localhost:3001/monitoring/logs/request/mon-test-123
```

## 📊 **Structure des Logs**

### Log de Requête HTTP
```json
{
  "timestamp": "2025-08-05T08:15:23.456Z",
  "level": "info",
  "service": "fil-rouge-server", 
  "requestId": "req_1725517723456_abc123def",
  "message": "POST /api/auth/login - 200 (156ms)",
  "type": "http_request",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "responseTime": 156,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Log de Sécurité
```json
{
  "timestamp": "2025-08-05T08:15:23.456Z",
  "level": "warn",
  "service": "fil-rouge-server",
  "requestId": "req_1725517723456_abc123def", 
  "message": "Security Event: auth_failure",
  "type": "security_event",
  "event": "auth_failure",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "path": "/api/auth/login",
  "severity": "medium"
}
```

### Log Business
```json
{
  "timestamp": "2025-08-05T08:15:23.456Z",
  "level": "info", 
  "service": "fil-rouge-server",
  "requestId": "req_1725517723456_abc123def",
  "message": "Business Event: user_login",
  "type": "business_event",
  "action": "user_login",
  "userId": "user_123",
  "path": "/api/auth/login",
  "method": "POST"
}
```

## 🛠️ **Commandes Utiles**

### Consulter les Logs en Temps Réel
```bash
# Voir tous les logs en temps réel
bun run dev

# Suivre un fichier de log spécifique
tail -f logs/info-$(date +%Y-%m-%d).log

# Filtrer par request ID
tail -f logs/info-$(date +%Y-%m-%d).log | grep "req_1725517723456"
```

### Analyser les Logs via API
```bash
# Dernières erreurs
curl -s http://localhost:3001/monitoring/logs/error | jq '.logs[0]'

# Résumé des 6 dernières heures  
curl -s http://localhost:3001/monitoring/logs/summary?hours=6 | jq '.summary'

# Recherche par request ID
curl -s http://localhost:3001/monitoring/logs/request/req_1725517723456_abc123def | jq '.logs'
```

### Parser les Logs JSON
```bash
# Extraire tous les request IDs des dernières 24h
cat logs/info-$(date +%Y-%m-%d).log | jq -r '.requestId' | sort | uniq

# Compter les requêtes par endpoint
cat logs/info-$(date +%Y-%m-%d).log | jq -r '.path' | sort | uniq -c

# Analyser les temps de réponse moyens
cat logs/info-$(date +%Y-%m-%d).log | jq -r '.responseTime' | awk '{sum+=$1; count++} END {print "Moyenne: " sum/count "ms"}'
```

## 🔧 **Configuration Avancée**

### Variables d'Environnement
```bash
# Activer les logs debug
DEBUG=true

# Configurer la mémoire système pour les métriques
SYSTEM_MEMORY_BYTES=8589934592  # 8GB
```

### Intégration avec des Outils Externes

#### ELK Stack (Elasticsearch + Logstash + Kibana)
```bash
# Envoyer les logs vers Logstash
cat logs/info-$(date +%Y-%m-%d).log | curl -X POST "localhost:5000" -H "Content-Type: application/json" --data-binary @-
```

#### Monitoring avec Prometheus
```bash
# Les métriques sont déjà exposées au format Prometheus
curl http://localhost:3001/monitoring/metrics
```

## 📈 **Cas d'Usage Pratiques**

### 1. **Debug d'une Requête Spécifique**
```bash
# 1. Identifier le request ID dans les headers HTTP
curl -I http://localhost:3001/api/users
# Réponse: x-request-id: req_1725517723456_abc123def

# 2. Tracer tous les logs liés
curl http://localhost:3001/monitoring/logs/request/req_1725517723456_abc123def
```

### 2. **Analyse de Performance** 
```bash
# Requêtes lentes des dernières 2 heures
curl -s http://localhost:3001/monitoring/logs/summary?hours=2 | jq '.summary.avgResponseTime'

# Top 10 des endpoints les plus lents
grep '"responseTime":' logs/info-$(date +%Y-%m-%d).log | jq -r '"\(.path): \(.responseTime)ms"' | sort -k2 -nr | head -10
```

### 3. **Monitoring de Sécurité**
```bash
# Tentatives d'authentification échouées
curl -s http://localhost:3001/monitoring/logs/warn | jq '.logs[] | select(.type=="security_event")'

# IPs suspectes
grep 'auth_failure' logs/warn-$(date +%Y-%m-%d).log | jq -r '.ip' | sort | uniq -c | sort -nr
```

### 4. **Analyse Business**
```bash
# Actions utilisateurs des dernières 24h
grep 'business_event' logs/info-$(date +%Y-%m-%d).log | jq -r '.action' | sort | uniq -c

# Utilisateurs les plus actifs
grep 'userId' logs/info-$(date +%Y-%m-%d).log | jq -r '.userId' | sort | uniq -c | sort -nr | head -10
```

## 🎯 **Exemples Concrets**

### Scénario : Débogage d'une Erreur 500
```bash
# 1. Chercher les erreurs récentes
curl -s http://localhost:3001/monitoring/logs/error?lines=20

# 2. Identifier le request ID de l'erreur
# Exemple: req_1725517723456_error500

# 3. Tracer toute la séquence
curl -s http://localhost:3001/monitoring/logs/request/req_1725517723456_error500 | jq '.logs[] | {timestamp, level, message}'

# 4. Vérifier les métriques associées
curl -s http://localhost:3001/monitoring/health
```

### Scénario : Surveillance Proactive
```bash
# 1. Dashboard en temps réel
curl -s http://localhost:3001/monitoring/logs/summary?hours=1

# 2. Alertes automatiques (dans scripts)
error_count=$(curl -s http://localhost:3001/monitoring/logs/summary?hours=1 | jq '.summary.errors')
if [ "$error_count" -gt 10 ]; then
  echo "🚨 Trop d'erreurs détectées: $error_count"
fi
```

## 🏆 **Validation RNCP**

Cette implémentation valide la mention **"Logs structurés : JSON avec correlation IDs"** car :

✅ **Format JSON** : Tous les logs sont au format JSON parsable  
✅ **Correlation IDs** : Chaque requête a un ID unique traçable  
✅ **Structure cohérente** : Champs standardisés (timestamp, level, service, requestId)  
✅ **Persistance** : Sauvegarde automatique dans des fichiers  
✅ **APIs d'accès** : Endpoints REST pour consulter les logs  
✅ **Recherche avancée** : Par ID, niveau, période  

---

**Les logs structurés avec correlation IDs sont maintenant pleinement opérationnels et consultables via multiples canaux !** 