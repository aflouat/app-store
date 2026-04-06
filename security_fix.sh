#!/bin/bash
set -e

echo ""
echo "==========================================="
echo " REPRISE SECURISATION — etapes 3 a 6"
echo "==========================================="
echo ""

# ===== ÉTAPE 3 : SSH Hardening (fix Ubuntu 24.04 : ssh.service) =====
echo ">>> [3/6] Hardening SSH..."
cat > /etc/ssh/sshd_config.d/00-hardening.conf << 'EOF'
PasswordAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
X11Forwarding no
EOF

systemctl reload ssh
echo "SSH hardening appliqué"
echo "  PasswordAuthentication : $(sshd -T 2>/dev/null | grep passwordauthentication)"
echo "  PermitRootLogin        : $(sshd -T 2>/dev/null | grep permitrootlogin | head -1)"
echo ""

# ===== ÉTAPE 4 : Mises à jour automatiques =====
echo ">>> [4/6] Mises à jour automatiques..."
apt install unattended-upgrades -y -q

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades 2>/dev/null || true
echo "Unattended-upgrades : $(systemctl is-active unattended-upgrades)"
echo ""

# ===== ÉTAPE 5 : Swap 2 Go =====
echo ">>> [5/6] Ajout swap 2 Go..."
if [ -f /swapfile ]; then
  echo "  (swap deja existant, skip)"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p > /dev/null
fi
echo "Swap : $(free -h | grep Swap)"
echo ""

# ===== ÉTAPE 6 : Backup PostgreSQL cron =====
echo ">>> [6/6] Backup PostgreSQL quotidien..."
mkdir -p /appli/backups
if crontab -l 2>/dev/null | grep -q "pg_backup"; then
  echo "  (cron backup deja present, skip)"
else
  (crontab -l 2>/dev/null; echo "0 3 * * * docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_\$(date +\%Y\%m\%d).sql.gz && find /appli/backups -name '*.gz' -mtime +7 -delete") | crontab -
fi
echo "Cron : $(crontab -l 2>/dev/null | grep pg_backup || echo 'non trouve')"
echo ""

# ===== TEST BACKUP MANUEL =====
echo ">>> Test backup manuel..."
if docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_test.sql.gz; then
  ls -lh /appli/backups/
else
  echo "  Backup test echoue (conteneur postgres non disponible ?)"
fi
echo ""

echo "==========================================="
echo " CHECKLIST FINALE"
echo "==========================================="
echo ""
echo "1. UFW :"
ufw status | head -10
echo ""
echo "2. Fail2ban     : $(systemctl is-active fail2ban)"
echo "3. SSH PassAuth : $(sshd -T 2>/dev/null | grep passwordauthentication)"
echo "4. SSH Root     : $(sshd -T 2>/dev/null | grep permitrootlogin | head -1)"
echo "5. Swap         : $(free -h | grep Swap)"
echo "6. Auto-updates : $(systemctl is-active unattended-upgrades)"
echo "7. Backup cron  :"
crontab -l 2>/dev/null | grep pg_backup || echo "  Pas de cron backup"
echo ""
echo "==========================================="
echo " SECURISATION TERMINEE (etapes 1-6 sur 7)"
echo ""
echo " ETAPE 7 — Changement port SSH :"
echo "   OUVRIR UN 2e TERMINAL et tester :"
echo "     ssh abdel@37.59.125.159"
echo "   Si OK, executer :"
echo "     sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config"
echo "     sudo ufw allow 2222/tcp"
echo "     sudo systemctl reload ssh"
echo "   Puis tester dans un 3e terminal :"
echo "     ssh -p 2222 abdel@37.59.125.159"
echo "   Si OK : sudo ufw delete allow 22/tcp"
echo "==========================================="
