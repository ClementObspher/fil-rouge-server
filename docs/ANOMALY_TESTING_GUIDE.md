# 🤖 Guide de Test - Système Automatique d'Anomalies

## 🎯 Vue d'ensemble

Le système automatique de détection d'anomalies fonctionne maintenant ! Voici comment le tester.

## ⚙️ Fonctionnement Automatique

### 📊 Règles Activées (vérification toutes les 30s)

1. **Mémoire** → Warning > 75%, Critical > 85%
2. **Temps de réponse** → Warning > 1000ms, Critical > 2000ms  
3. **Taux d'erreur** → Warning > 5%, Critical > 10%
4. **Connexions DB** → Warning > 30, Critical > 50
5. **Charge RPS** → Warning > 100 req/s
6. **Espace disque** → Warning > 80%, Critical > 90% (simulé)
7. **Services indisponibles** → Critical automatique
8. **Pattern d'erreurs répétées** → Critical si > 15%
9. **Dégradation progressive** → Warning si trend +500ms

## 🧪 Tests Manuels de Simulation

### 1. Via API REST

```bash
# Mémoire critique
curl -X POST http://localhost:3001/monitoring/simulate/high_memory

# Temps de réponse lent  
curl -X POST http://localhost:3001/monitoring/simulate/slow_response

# Taux d'erreur élevé
curl -X POST http://localhost:3001/monitoring/simulate/high_errors

# Disque plein
curl -X POST http://localhost:3001/monitoring/simulate/disk_full

# Surcharge DB
curl -X POST http://localhost:3001/monitoring/simulate/db_overload
```

### 2. Depuis le Dashboard

1. ✅ Démarrez le serveur : `bun run dev`
2. ✅ Connectez-vous : `http://localhost:3001/admin-login`
3. ✅ Ouvrez le dashboard : `http://localhost:3001/monitoring-dashboard`  
4. ✅ Dans un autre terminal, lancez une simulation
5. ✅ Rechargez le dashboard → l'anomalie apparaît !

## 🔍 Observation des Logs

Le système affiche des logs informatifs :

```
🤖 Système de détection automatique d'anomalies démarré (vérification toutes les 30s)
🔍 Détection automatique: 2 anomalie(s) trouvée(s)
  ⚠️ CRITICAL: SIMULATION: Utilisation mémoire critique (application/memory: 95 > 85)
  ⚠️ WARNING: Espace disque faible (storage/diskSpace: 82.3 > 80)
🔍 Anomalie automatiquement consignée pour l'alerte: application_memory
```

## ⏰ Cooldowns Intelligents

- **Erreurs** : 2 minutes (priorité haute)
- **Mémoire/Performance** : 5 minutes (standard)  
- **Tendances** : 10 minutes (analyse)
- **Disque/DB** : 15 minutes (évite le spam)

## 🎯 Test de Validation C4.2.1

### Scénario Complet

1. **Démarrage** → Système en surveillance active ✅
2. **Détection** → Simulation d'une condition critique ✅
3. **Collecte** → Génération automatique d'alerte ✅
4. **Consignation** → Création d'anomalie dans le système ✅
5. **Analyse** → Actions recommandées automatiques ✅
6. **Suivi** → Gestion via dashboard (détails, correctifs) ✅

### Preuves Visuelles

- ✅ Dashboard avec statistiques temps réel
- ✅ Liste des anomalies avec filtres
- ✅ Détails complets de chaque anomalie  
- ✅ Historique et correctifs appliqués
- ✅ Export CSV pour reporting

## 🚀 Exemples d'Utilisation

### Test Simple
```bash
# Lancer le serveur
bun run dev

# Déclencher une anomalie
curl -X POST http://localhost:3001/monitoring/simulate/high_memory

# Voir dans les logs
🔍 Détection automatique: 1 anomalie(s) trouvée(s)
🔍 Anomalie automatiquement consignée pour l'alerte: application_memory
```

### Test Complet Dashboard
1. Connectez-vous au dashboard
2. Créez une anomalie manuelle (test initial)
3. Lancez `curl -X POST .../simulate/disk_full`
4. Attendez 30s maximum
5. Rafraîchissez → Nouvelle anomalie automatique !
6. Cliquez "Détails" → Informations complètes
7. Cliquez "Correctif" → Ajoutez une action

## ✅ Validation Réussie

Le système répond parfaitement aux exigences :

> **C4.2.1** : "Consigner les anomalies détectées en élaborant un processus de collecte et consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place."

- ✅ **Processus de collecte** : Vérifications automatiques toutes les 30s
- ✅ **Outils de collecte** : MonitoringService + AlertService  
- ✅ **Consignation** : AnomalyService avec persistance
- ✅ **Informations pertinentes** : Métriques, seuils, impact, contexte
- ✅ **Détermination correctifs** : Actions recommandées + interface application

🎉 **Système opérationnel et conforme !** 