# Fil Rouge Server

## 📋 Procédures de Déploiement

```sh
# README.md - Installation et démarrage
bun install           # Installation dépendances
docker-compose up -d  # Services PostgreSQL + MinIO
bun run dev          # Démarrage avec hot reload
```

## 🔧 Configuration

Variables d'environnement
```sh
PORT=3001
DATABASE_URL="postgresql://kifekoi:kifekoipass@localhost:5432/kifekoi_db"
DATABASE_URL_TEST="postgresql://kifekoi:kifekoipass@localhost:5432/kifekoi_test"
JWT_SECRET="votre_cle_secrete_tres_longue_et_complexe_a_changer_en_production"
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"
DATABASE_NAME="kifekoi_db"
```

## 📚 Guide d'Administration
```markdown
# Dashboard : http://localhost:3001/monitoring-dashboard
# API Docs : http://localhost:3001/swagger
```