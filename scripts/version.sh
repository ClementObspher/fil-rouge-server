#!/bin/bash

# Script de gestion des versions pour fil-rouge-server
# Usage: ./scripts/version.sh [major|minor|patch]

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}Script de gestion des versions${NC}"
    echo ""
    echo "Usage: $0 [major|minor|patch]"
    echo ""
    echo "Options:"
    echo "  major    - Incrémente la version majeure (1.0.0 -> 2.0.0)"
    echo "  minor    - Incrémente la version mineure (1.0.0 -> 1.1.0)"
    echo "  patch    - Incrémente la version patch (1.0.0 -> 1.0.1)"
    echo ""
    echo "Exemples:"
    echo "  $0 patch    # Version patch"
    echo "  $0 minor    # Version mineure"
    echo "  $0 major    # Version majeure"
    echo ""
}

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

# Récupérer la version actuelle
CURRENT_VERSION=$(bun run -c "console.log(require('./package.json').version)" 2>/dev/null || node -p "require('./package.json').version")

# Déterminer le type de version
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Aucun type de version spécifié${NC}"
    show_help
    exit 1
fi

VERSION_TYPE=$1

# Valider le type de version
case $VERSION_TYPE in
    "major"|"minor"|"patch")
        ;;
    *)
        echo -e "${RED}❌ Type de version invalide: $VERSION_TYPE${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${BLUE}🚀 Gestion des versions - fil-rouge-server${NC}"
echo -e "${BLUE}Version actuelle: ${GREEN}$CURRENT_VERSION${NC}"

# Calculer la nouvelle version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
    "major")
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
    "minor")
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        ;;
    "patch")
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        ;;
esac

echo -e "${BLUE}Nouvelle version: ${GREEN}$NEW_VERSION${NC}"

# Demander confirmation
read -p "Voulez-vous continuer? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Opération annulée${NC}"
    exit 1
fi

# Mettre à jour package.json
echo -e "${BLUE}📝 Mise à jour de package.json...${NC}"
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
rm package.json.bak

# Mettre à jour app.json
if [ -f "app.json" ]; then
    echo -e "${BLUE}📝 Mise à jour de app.json...${NC}"
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" app.json
    rm app.json.bak
fi

# Vérifier les changements
echo -e "${BLUE}🔍 Vérification des changements...${NC}"
if git diff --quiet package.json app.json; then
    echo -e "${YELLOW}⚠️  Aucun changement détecté${NC}"
else
    echo -e "${GREEN}✅ Versions mises à jour avec succès${NC}"
    
    # Afficher les différences
    echo -e "${BLUE}📋 Différences:${NC}"
    git diff package.json app.json
    
    # Proposer de commiter
    echo ""
    read -p "Voulez-vous commiter ces changements? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add package.json app.json
        git commit -m "chore: bump version to $NEW_VERSION"
        echo -e "${GREEN}✅ Changements commités${NC}"
        
        # Proposer de créer un tag
        read -p "Voulez-vous créer un tag v$NEW_VERSION? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
            echo -e "${GREEN}✅ Tag v$NEW_VERSION créé${NC}"
            
            # Proposer de pousser
            read -p "Voulez-vous pousser les changements et le tag? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push
                git push origin "v$NEW_VERSION"
                echo -e "${GREEN}✅ Changements et tag poussés${NC}"
            fi
        fi
    fi
fi

echo -e "${GREEN}🎉 Gestion des versions terminée!${NC}"
