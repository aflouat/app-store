#!/bin/bash
set -e

echo ""
echo "==========================================="
echo " SÉCURISATION VPS — perform-learn.fr"
echo "==========================================="
echo ""

# ===== ÉTAPE 1 : UFW Firewall =====
echo ">>> [1/6] Configuration UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
echo 'y' | ufw enable
echo "UFW activé"
ufw status
echo ""

# ===== ÉTAPE 2 : Fail2ban =====
echo ">>> [2/6] Installation Fail2ban..."
apt install fail2ban -y -q

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "Fail2ban actif : $(systemctl is-active fail2ban)"
echo ""

# ===== ÉTAPE 3 : SSH Hardening =====
echo ">>> [3/6] Hardening SSH..."
cat > /etc/ssh/sshd_config.d/00-hardening.conf << 'EOF'
PasswordAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
X11Forwarding no
EOF

systemctl reload sshd
echo "SSH hardening appliqué"
echo "  PasswordAuthentication : $(sshd -T 2>/dev/null | grep passwordauthentication)"
echo "  PermitRootLogin        : $(sshd -T 2>/dev/null | grep permitrootlogin | head -1)"
echo ""

# ===== ÉTAPE 4 : Mises à jour automatiques =====
echo ">>> [4/6] Mises à jour automatiques..."
apt install unattended-upgrades -y -q
echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | debconf-set-selections
dpkg-reconfigure --priority=low unattended-upgrades

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
  echo "  (swap déjà existant, skip)"
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
  echo "  (cron backup déjà présent, skip)"
else
  (crontab -l 2>/dev/null; echo "0 3 * * * docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_\$(date +\%Y\%m\%d).sql.gz && find /appli/backups -name '*.gz' -mtime +7 -delete") | crontab -
fi
echo "Cron : $(crontab -l 2>/dev/null | grep pg_backup || echo 'non trouvé')"
echo ""

# ===== TEST BACKUP MANUEL =====
echo ">>> Test backup manuel..."
docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_test.sql.gz
ls -lh /appli/backups/
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
echo " ETAPE 7 — Changement port SSH (MANUEL) :"
echo "   Ouvrir un 2e terminal et tester la connexion actuelle"
echo "   puis executer : sudo bash /tmp/change_ssh_port.sh"
echo "==========================================="
