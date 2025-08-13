# Gestion des Versions - fil-rouge-server

Ce document explique comment utiliser le système de gestion des versions automatisé de ce projet.

## 🚀 Vue d'ensemble

Le projet utilise un système de gestion des versions basé sur [Semantic Versioning](https://semver.org/lang/fr/) (SemVer) avec :
- **Workflow GitHub Actions** pour l'automatisation
- **Script local** pour la gestion manuelle
- **Changelog automatique** basé sur les commits

## 📋 Types de versions

### Major (X.0.0)
- Changements incompatibles avec les versions précédentes
- Nouvelles fonctionnalités majeures
- Refactoring important

### Minor (0.X.0)
- Nouvelles fonctionnalités compatibles
- Améliorations non-breaking
- Nouvelles APIs

### Patch (0.0.X)
- Corrections de bugs
- Améliorations mineures
- Corrections de sécurité

## 🛠️ Utilisation

### Méthode 1 : Workflow GitHub Actions (Recommandé)

1. **Déclenchement automatique** : Le workflow se déclenche automatiquement sur les pushes vers `main` si des changements significatifs sont détectés.

2. **Déclenchement manuel** :
   - Allez dans l'onglet "Actions" de votre repository GitHub
   - Sélectionnez "Gestion des Versions et Changelog"
   - Cliquez sur "Run workflow"
   - Choisissez le type de version (major, minor, patch)
   - Ajoutez des notes de release optionnelles

### Méthode 2 : Script local

```bash
# Version patch (1.0.0 -> 1.0.1)
bun run version:patch

# Version mineure (1.0.0 -> 1.1.0)
bun run version:minor

# Version majeure (1.0.0 -> 2.0.0)
bun run version:major
```

Ou directement :
```bash
./scripts/version.sh patch
./scripts/version.sh minor
./scripts/version.sh major
```

## 📝 Convention des commits

Le système détecte automatiquement les changements basés sur les préfixes des commits :

- `feat:` → Version mineure
- `fix:` → Version patch
- `breaking:` → Version majeure
- `security:` → Version patch
- `refactor:` → Version mineure
- `perf:` → Version patch

### Exemples de commits

```bash
git commit -m "feat: ajouter système de notifications"
git commit -m "fix: corriger bug d'authentification"
git commit -m "breaking: refactoriser l'API des événements"
git commit -m "security: corriger vulnérabilité XSS"
```

## 📄 Changelog

Le fichier `CHANGELOG.md` est automatiquement mis à jour avec :

- **Date de release** basée sur le dernier commit
- **Liste des changements** extraite des commits
- **Filtrage automatique** des commits non-significatifs

### Structure du changelog

```markdown
## [1.1.0] - 2024-01-15

### Added
- Nouvelle fonctionnalité A
- Nouvelle fonctionnalité B

### Fixed
- Correction du bug X
- Amélioration de la performance Y

## [1.0.0] - 2024-01-01

### Added
- Version initiale
```

## 🔧 Configuration

### Fichiers gérés

- `package.json` - Version du projet
- `app.json` - Configuration de l'application
- `CHANGELOG.md` - Historique des changements

### Workflow GitHub Actions

Le workflow `.github/workflows/version-management.yml` :

1. **Vérifie** si une mise à jour de version est nécessaire
2. **Met à jour** les versions dans les fichiers
3. **Génère** le changelog automatiquement
4. **Crée** un tag Git
5. **Pousse** les changements
6. **Crée** une release GitHub (si déclenchement manuel)

## 🚨 Bonnes pratiques

### Avant une release

1. **Vérifiez** que tous les tests passent
2. **Assurez-vous** que la documentation est à jour
3. **Testez** en local si nécessaire

### Pendant une release

1. **Choisissez** le bon type de version
2. **Vérifiez** le changelog généré
3. **Ajoutez** des notes de release si nécessaire

### Après une release

1. **Vérifiez** que la release GitHub a été créée
2. **Testez** le déploiement si applicable
3. **Communiquez** les changements à l'équipe

## 🔍 Dépannage

### Problèmes courants

**Le workflow ne se déclenche pas automatiquement**
- Vérifiez que les commits contiennent les préfixes appropriés
- Assurez-vous que les changements sont sur la branche `main`

**Erreur de permissions**
- Vérifiez que le token GitHub a les bonnes permissions
- Assurez-vous que le workflow peut écrire dans le repository

**Version non mise à jour**
- Vérifiez que les fichiers `package.json` et `app.json` existent
- Assurez-vous que le format des versions est correct

### Logs et debugging

- Consultez les logs du workflow dans l'onglet "Actions" de GitHub
- Utilisez le script local avec `--debug` pour plus d'informations
- Vérifiez les permissions du repository

## 📚 Ressources

- [Semantic Versioning](https://semver.org/lang/fr/)
- [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
- [Conventional Commits](https://www.conventionalcommits.org/fr/)
- [GitHub Actions](https://docs.github.com/fr/actions)
