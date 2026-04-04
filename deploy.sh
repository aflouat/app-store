#!/bin/bash
# =============================================================
# deploy.sh — Déploiement initial sur VPS OVH
# Usage : chmod +x deploy.sh && ./deploy.sh
# =============================================================

set -e

echo "========================================="
echo " App Store POC — Déploiement initial"
echo " Domaine : perform-learn.fr"
echo "========================================="

# 1. Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non installé. Installation..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installé. Déconnectez-vous et reconnectez-vous, puis relancez ce script."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose plugin non trouvé."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

echo "✅ Docker $(docker --version | cut -d' ' -f3)"

# 2. Vérifier le fichier .env
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  Fichier .env manquant !"
    echo "   Copie du template : cp .env.example .env"
    cp .env.example .env
    echo ""
    echo "👉 IMPORTANT : Éditez .env avec vos mots de passe avant de continuer"
    echo "   nano .env"
    echo ""
    echo "   Puis relancez : ./deploy.sh"
    exit 1
fi

# Vérifier que les mots de passe ont été changés
source .env
if [[ "$PG_PASSWORD" == *"CHANGE_ME"* ]] || [[ "$MINIO_ROOT_PASSWORD" == *"CHANGE_ME"* ]]; then
    echo "❌ Modifiez les mots de passe dans .env (remplacez les CHANGE_ME)"
    exit 1
fi

# 3. Ouvrir les ports firewall
echo ""
echo "📡 Configuration firewall..."
sudo ufw allow 80/tcp   2>/dev/null || true
sudo ufw allow 443/tcp  2>/dev/null || true
sudo ufw allow 443/udp  2>/dev/null || true  # HTTP/3
echo "✅ Ports 80, 443 ouverts"

# 4. Créer les dossiers de données
mkdir -p minio/data

# 5. Lancer l'infrastructure
echo ""
echo "🚀 Lancement des services..."
docker compose up -d

# 6. Attendre que PostgreSQL soit prêt
echo ""
echo "⏳ Attente PostgreSQL..."
sleep 10
until docker exec postgres pg_isready -U appstore 2>/dev/null; do
    sleep 2
done
echo "✅ PostgreSQL prêt"

# 7. Résumé
echo ""
echo "========================================="
echo " ✅ Infrastructure déployée !"
echo "========================================="
echo ""
echo " 🌐 Services disponibles :"
echo "    API         → https://api.perform-learn.fr"
echo "    MinIO       → https://minio.perform-learn.fr"
echo "    S3 endpoint → https://s3.perform-learn.fr"
echo "    Analytics   → https://analytics.perform-learn.fr"
echo "    Monitoring  → https://monitor.perform-learn.fr"
echo ""
echo " 📊 Vérification :"
echo "    docker compose ps"
echo "    docker compose logs -f"
echo ""
echo " 🔑 Umami : login par défaut admin / umami"
echo "    → Changez le mot de passe immédiatement !"
echo ""
