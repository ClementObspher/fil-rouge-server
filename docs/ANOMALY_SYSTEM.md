# Système de Consignation des Anomalies - C4.2.1

## Objectif de la Compétence

**C4.2.1 Consigner les anomalies détectées** en élaborant un processus de collecte et consignation, en utilisant des outils de collecte et en y intégrant toutes les informations pertinentes, afin de déterminer le correctif à mettre en place.

## Architecture du Système

### 1. Service de Consignation (`AnomalyService`)

Le service principal qui gère la collecte, le stockage et l'analyse des anomalies :

**Fonctionnalités clés :**
- **Consignation automatique** depuis les alertes du système de monitoring
- **Consignation manuelle** par les opérateurs
- **Classification des anomalies** par sévérité et impact
- **Recommandations de correctifs** basées sur des patterns reconnus
- **Suivi du cycle de vie** des anomalies (détection → investigation → résolution → fermeture)
- **Liaison des anomalies** similaires pour identification de patterns
- **Gestion des correctifs** appliqués avec suivi des résultats

### 2. Modèle de Données Complet

Chaque anomalie consignée contient **toutes les informations pertinentes** :

```typescript
interface Anomaly {
  // Identification
  id: string
  title: string
  description: string
  
  // Classification
  severity: "critical" | "warning" | "info"
  status: "detected" | "investigating" | "resolved" | "closed"
  
  // Contexte de détection
  detectedAt: string
  detectionMethod: "automatic" | "manual"
  source: string
  service: string
  component?: string
  metric: string
  threshold: number
  currentValue: number
  
  // Contexte d'environnement
  environment: string
  version?: string
  userImpact: "none" | "low" | "medium" | "high" | "critical"
  
  // Analyse et résolution
  rootCause?: string
  impact?: string
  recommendedActions: string[]
  appliedCorrectifs: CorrectifAction[]
  
  // Métadonnées et traçabilité
  tags: string[]
  metadata: Record<string, any>
  reporter: string
  assignedTo?: string
  
  // Suivi temporel
  investigationStartedAt?: string
  resolvedAt?: string
  closedAt?: string
  
  // Relations
  relatedAnomalies: string[]
  alertIds: string[]
}
```

### 3. Processus de Collecte Automatisé

**Intégration avec le système d'alertes existant :**

```typescript
// Dans AlertService.ts - ligne 214
try {
  await AnomalyService.logAnomalyFromAlert(alert, {
    alertChannels: channels,
    notificationSent: true,
    alertProcessedAt: new Date().toISOString()
  })
} catch (error) {
  console.error("Erreur lors de la consignation de l'anomalie:", error)
}
```

**Déclenchement automatique :**
- Chaque alerte critique/warning génère automatiquement une anomalie
- Enrichissement automatique avec le contexte système
- Application des patterns de recommandations

### 4. Patterns de Correctifs Prédéfinis

Le système utilise une base de connaissances de patterns d'anomalies avec correctifs associés :

**Exemples de patterns :**
- **Utilisation mémoire élevée** → Analyse des processus, redémarrage services, ajustement limites
- **Temps de réponse élevé** → Analyse requêtes lentes, vérification DB, contrôle réseau
- **Service indisponible** → Redémarrage immédiat, vérification logs, basculement mode dégradé
- **Taux d'erreur élevé** → Analyse logs récents, rollback déploiement, vérification config
- **Problèmes DB** → Vérification serveur DB, analyse connexions, optimisation requêtes

### 5. Interface Utilisateur Intégrée

**Dashboard de monitoring enrichi :**
- Section dédiée aux anomalies consignées
- Statistiques en temps réel (total, critiques ouvertes, temps résolution moyen)
- Filtrage par statut, sévérité, service
- Création manuelle d'anomalies via formulaire
- Mise à jour des statuts en un clic
- Export CSV pour analyse externe

### 6. API REST Complète

**Endpoints disponibles :**
- `GET /api/anomalies` - Liste avec filtres
- `GET /api/anomalies/stats` - Statistiques
- `GET /api/anomalies/:id` - Détail d'une anomalie
- `POST /api/anomalies` - Création manuelle
- `PATCH /api/anomalies/:id/status` - Mise à jour statut
- `POST /api/anomalies/:id/correctifs` - Ajout de correctifs
- `GET /api/anomalies/export/csv` - Export CSV

## Processus de Consignation

### 1. Détection Automatique
1. **Alerte générée** par le système de monitoring
2. **Consignation automatique** de l'anomalie avec contexte complet
3. **Classification** par sévérité et impact utilisateur
4. **Recommandations** automatiques basées sur les patterns
5. **Notification** aux équipes concernées

### 2. Consignation Manuelle
1. **Observation** d'une anomalie par un opérateur
2. **Création** via l'interface web avec formulaire structuré
3. **Enrichissement** automatique avec informations système
4. **Assignment** et suivi du cycle de vie

### 3. Gestion des Correctifs
1. **Identification** des actions correctives
2. **Planification** et priorisation des correctifs
3. **Application** avec suivi et documentation
4. **Validation** des résultats
5. **Plan de rollback** si nécessaire

## Outils de Collecte Utilisés

### Automatiques
- **MonitoringService** - Métriques système en temps réel
- **AlertService** - Détection de seuils et génération d'alertes
- **SystemMetrics** - Collecte CPU, mémoire, réseau, DB
- **HealthChecks** - Vérification état des services

### Manuels
- **Interface web** - Formulaire de consignation structuré
- **API REST** - Intégration avec outils externes
- **Export CSV** - Analyse et reporting
- **Dashboard temps réel** - Visualisation et actions

## Informations Pertinentes Collectées

### Contexte Technique
- Service et composant affecté
- Métriques et seuils dépassés
- Version du système
- Environnement (dev/prod)
- Configuration active

### Contexte Temporel
- Moment de détection
- Durée d'investigation
- Temps de résolution
- Historique des statuts

### Contexte Métier
- Impact utilisateur évalué
- Services métier affectés
- Criticité pour l'activité
- Coût potentiel

### Contexte Opérationnel
- Équipes notifiées
- Responsable assigné
- Actions entreprises
- Résultats des correctifs

## Détermination des Correctifs

### 1. Analyse Automatique
- **Pattern matching** avec base de connaissances
- **Recommandations contextuelles** selon le type d'anomalie
- **Priorisation automatique** selon l'impact

### 2. Enrichissement Manuel
- **Analyse de cause racine** par les experts
- **Correctifs personnalisés** selon le contexte
- **Plan de validation** des solutions

### 3. Suivi d'Efficacité
- **Métriques de résolution** (temps, taux de réussite)
- **Feedback sur les correctifs** appliqués
- **Amélioration continue** des recommandations

## Métriques et Reporting

### Indicateurs Clés
- **Nombre total** d'anomalies consignées
- **Anomalies critiques ouvertes** nécessitant attention immédiate
- **Temps moyen de résolution** par type d'anomalie
- **Taux de résolution** par période
- **Efficacité des correctifs** appliqués

### Reporting
- **Export CSV** pour analyse externe
- **Dashboard temps réel** avec statistiques
- **Historique détaillé** de chaque anomalie
- **Tendances** et patterns identifiés

## Bénéfices du Système

### Pour la Compétence C4.2.1
✅ **Processus de collecte structuré** - Automatique et manuel  
✅ **Outils de collecte intégrés** - Monitoring, alertes, interface web  
✅ **Informations pertinentes complètes** - Contexte technique, temporel, métier  
✅ **Détermination des correctifs** - Recommandations automatiques et expertise  

### Pour l'Organisation
- **Traçabilité complète** des incidents et résolutions
- **Amélioration continue** par apprentissage des patterns
- **Réduction du MTTR** grâce aux recommandations automatiques
- **Conformité** aux exigences de consignation des anomalies
- **Base de connaissances** capitalisée pour l'équipe

## Utilisation Pratique

### Accès au Dashboard
1. Démarrer le serveur : `bun run dev`
2. Accéder à : `http://localhost:3001/monitoring-dashboard.html`
3. Section "🔍 Anomalies Consignées" en bas de page

### Test du Système
1. **Anomalie automatique** : Déclencher une alerte (ex: surcharge mémoire)
2. **Anomalie manuelle** : Cliquer "➕ Nouvelle Anomalie"
3. **Gestion** : Utiliser les boutons d'action pour changer les statuts
4. **Export** : Télécharger le CSV des anomalies pour analyse

Ce système répond complètement aux exigences de la compétence C4.2.1 en fournissant un processus structuré, des outils adaptés, une collecte d'informations exhaustive et des mécanismes de détermination des correctifs. 