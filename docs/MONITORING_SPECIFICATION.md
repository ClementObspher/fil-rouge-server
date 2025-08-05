# Système de Supervision et d'Alerte - Fil Rouge Server

## Compétence RNCP C4.1.2
> Concevoir un système de supervision et d'alerte en déterminant le périmètre de supervision et en identifiant les indicateurs de suivi pertinents, en mettant en place des sondes, en configurant la modalité des signalements afin de garantir une disponibilité permanente du logiciel.

## 🎯 Périmètre de Supervision

### Architecture de l'Application
```
┌─────────────────────────────────────────────────────────────┐
│                    Fil Rouge Server                        │
├─────────────────────────────────────────────────────────────┤
│  API REST (Hono + TypeScript)                              │
│  ├─ Routes: /api/auth, /users, /events, /messages         │
│  ├─ Middleware: Auth, CORS, Logger                        │
│  ├─ Documentation: Swagger UI                             │
│  └─ Port: 3001                                            │
├─────────────────────────────────────────────────────────────┤
│  Base de Données                                           │
│  ├─ PostgreSQL 14                                         │
│  ├─ Port: 5432                                            │
│  └─ Schéma: Prisma ORM                                    │
├─────────────────────────────────────────────────────────────┤
│  Stockage d'Objets                                         │
│  ├─ MinIO                                                 │
│  ├─ Ports: 9000 (API), 9090 (Console)                    │
│  └─ Bucket: images                                        │
└─────────────────────────────────────────────────────────────┘
```

### Composants à Superviser

#### 1. **Application Principale (API)**
- Disponibilité du service HTTP
- Temps de réponse des endpoints
- Taux d'erreur par route
- Utilisation des ressources (CPU, RAM)
- Sessions utilisateur actives

#### 2. **Base de Données PostgreSQL**
- Connectivité et disponibilité
- Performance des requêtes
- Connections actives/maximales
- Utilisation de l'espace disque
- Réplication et backup

#### 3. **Stockage MinIO**
- Disponibilité des APIs
- Espace de stockage utilisé/disponible
- Performances upload/download
- Intégrité des fichiers

#### 4. **Infrastructure Système**
- Ressources serveur (CPU, RAM, Disque)
- Connectivité réseau
- Processus système critiques
- Sécurité et accès

## 📊 Indicateurs de Suivi Pertinents (KPIs)

### Métriques de Disponibilité
| Indicateur | Seuil Critique | Seuil Warning | Objectif |
|------------|----------------|---------------|-----------|
| **Uptime API** | < 99% | < 99.9% | 99.99% |
| **Temps de réponse moyen** | > 2000ms | > 1000ms | < 200ms |
| **Taux d'erreur HTTP** | > 5% | > 1% | < 0.1% |
| **Disponibilité DB** | < 99.5% | < 99.9% | 99.99% |
| **Connectivité MinIO** | < 99% | < 99.5% | 99.9% |

### Métriques de Performance
| Indicateur | Seuil Critique | Seuil Warning | Objectif |
|------------|----------------|---------------|-----------|
| **CPU Usage** | > 90% | > 80% | < 70% |
| **RAM Usage** | > 95% | > 85% | < 75% |
| **Disk Usage** | > 95% | > 85% | < 80% |
| **DB Connections** | > 90% max | > 80% max | < 70% max |
| **Query Response Time** | > 5000ms | > 1000ms | < 100ms |

### Métriques de Sécurité
| Indicateur | Seuil Critique | Seuil Warning | Surveillance |
|------------|----------------|---------------|--------------|
| **Échecs d'authentification** | > 100/min | > 50/min | Continue |
| **Tentatives de brute force** | > 10 par IP | > 5 par IP | Continue |
| **Accès non autorisés** | > 0 | > 0 | Immédiate |
| **Vulnérabilités sécurité** | Critical/High | Medium | Quotidienne |

### Métriques Business
| Indicateur | Seuil Critique | Seuil Warning | Objectif |
|------------|----------------|---------------|-----------|
| **Utilisateurs actifs** | < 10% normal | < 50% normal | Croissance |
| **Taux de conversion** | < 70% normal | < 85% normal | Optimisation |
| **Durée de session** | < 50% normal | < 75% normal | Engagement |

## 🔍 Sondes de Surveillance

### 1. **Health Checks (Sondes de Santé)**

#### Health Check Principal
```typescript
GET /health
Response: {
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "cache": "healthy"
  },
  "metrics": {
    "uptime": 3600,
    "responseTime": 150,
    "memoryUsage": 256
  }
}
```

#### Health Check Détaillé
```typescript
GET /health/detailed
Response: {
  "database": {
    "status": "healthy",
    "connections": 5,
    "maxConnections": 100,
    "responseTime": 45
  },
  "storage": {
    "status": "healthy",
    "diskUsage": "65%",
    "availableSpace": "2.1GB"
  }
}
```

### 2. **Sondes de Performance**

#### Métriques d'Application
- **Endpoint** : `/metrics`
- **Format** : Prometheus metrics
- **Fréquence** : 30 secondes

#### Métriques Système
- **CPU** : Utilisation par core
- **Mémoire** : Usage RAM/SWAP
- **Disque** : I/O et espace libre
- **Réseau** : Trafic entrant/sortant

### 3. **Sondes de Sécurité**

#### Monitoring d'Authentification
- Tentatives de connexion échouées
- Détection de patterns suspects
- Monitoring des sessions actives

#### Audit de Sécurité
- Analyse des logs d'accès
- Détection d'intrusion
- Monitoring des privilèges

## 🚨 Modalités de Signalement

### 1. **Niveaux d'Alerte**

#### 🔴 **CRITIQUE** - Action Immédiate
- **Délai** : < 2 minutes
- **Canaux** : SMS + Email + Webhook
- **Escalade** : Automatique après 15 min
- **Exemples** :
  - Service API complètement indisponible
  - Base de données inaccessible
  - Tentative d'intrusion détectée

#### 🟠 **WARNING** - Action Rapide
- **Délai** : < 10 minutes
- **Canaux** : Email + Webhook
- **Escalade** : Manuelle
- **Exemples** :
  - Temps de réponse élevés
  - Utilisation ressources élevée
  - Erreurs fréquentes

#### 🟡 **INFO** - Surveillance
- **Délai** : < 1 heure
- **Canaux** : Dashboard + Log
- **Escalade** : Aucune
- **Exemples** :
  - Déploiement réussi
  - Maintenance programmée
  - Métriques normales

### 2. **Canaux de Communication**

#### Email
- **Destinataires** : Équipe DevOps, Lead Developer
- **Template** : HTML avec métriques et graphiques
- **Fréquence** : Immédiate pour critique, groupée pour warnings

#### Webhooks
- **Slack/Teams** : Notifications temps réel
- **PagerDuty** : Escalade automatique
- **Monitoring Dashboard** : Mise à jour en continu

#### SMS
- **Uniquement** : Alertes critiques
- **Destinataires** : Astreinte technique
- **Format** : Message court avec lien dashboard

### 3. **Templates d'Alerte**

#### Template Critique
```
🔴 ALERTE CRITIQUE - Fil Rouge Server

Service: API Principal
Status: INDISPONIBLE
Timestamp: 2025-01-01 15:30:00
Durée: 5 minutes

Impact: Service complètement inaccessible
Action requise: IMMÉDIATE

Dashboard: https://monitoring.filrouge.com
Runbook: https://docs.filrouge.com/incident-response
```

#### Template Warning
```
🟠 WARNING - Performance Dégradée

Service: Base de Données
Métrique: Temps de réponse
Valeur: 2.5s (seuil: 1s)
Trend: En hausse

Action: Vérifier les requêtes lentes
Dashboard: https://monitoring.filrouge.com/db
```

## 🛡️ Garantie de Disponibilité

### 1. **Architecture de Redondance**

#### Load Balancer
- **Nginx** : Distribution de charge
- **Health Checks** : Exclusion automatique des nœuds défaillants
- **Failover** : Basculement automatique < 30s

#### Base de Données
- **Réplication Master-Slave** : Lecture haute disponibilité
- **Backup automatique** : Toutes les 4h
- **Point-in-time Recovery** : Granularité 1 minute

#### Stockage
- **MinIO Clustering** : Réplication multi-nœuds
- **Backup S3** : Synchronisation quotidienne
- **Vérification d'intégrité** : Checksum automatique

### 2. **Procédures de Récupération**

#### RTO (Recovery Time Objective)
- **API Application** : < 5 minutes
- **Base de Données** : < 15 minutes
- **Stockage de fichiers** : < 30 minutes

#### RPO (Recovery Point Objective)
- **Données transactionnelles** : < 1 minute
- **Fichiers utilisateur** : < 1 heure
- **Configuration système** : < 24 heures

### 3. **Tests de Résilience**

#### Chaos Engineering
- **Arrêt aléatoire de services** : Hebdomadaire
- **Simulation de charge** : Mensuelle
- **Test de récupération** : Trimestrielle

#### Validation Continue
- **Health checks** : Toutes les 30 secondes
- **End-to-end tests** : Toutes les 5 minutes
- **Performance monitoring** : Continu

## 📈 Dashboard et Reporting

### 1. **Dashboard Temps Réel**
- **Vue d'ensemble** : Status général de tous les services
- **Métriques clés** : Graphiques temps réel
- **Alertes actives** : Liste prioritaire
- **Historique** : Tendances sur 24h/7j/30j

### 2. **Rapports Automatiques**
- **Quotidien** : Résumé des métriques et incidents
- **Hebdomadaire** : Analyse de tendances et recommandations
- **Mensuel** : SLA et objectifs de performance

### 3. **Analyse Prédictive**
- **Prédiction de charge** : ML sur historique
- **Détection d'anomalies** : Alertes préventives
- **Capacity Planning** : Recommandations d'infrastructure

---

*Ce document définit l'architecture complète du système de supervision pour garantir une disponibilité permanente et une performance optimale du logiciel fil-rouge-server.*

**Date de création** : $(date +%Y-%m-%d)  
**Responsable** : Équipe DevOps  
**Révision** : Trimestrielle 