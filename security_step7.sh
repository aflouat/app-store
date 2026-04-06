#!/bin/bash
set -e

RESULTS=()

echo ""
echo "==========================================="
echo " SECURISATION VPS — etapes 6b + 7"
echo "==========================================="
echo ""

# ===== ÉTAPE 6b : Fix backup cron =====
echo ">>> [6b] Fix backup PostgreSQL cron..."
mkdir -p /appli/backups

if crontab -l 2>/dev/null | grep -q "pg_backup"; then
  echo "  (cron deja present, skip)"
  RESULTS+=("CRON_BACKUP=skip")
else
  # Écrire dans un fichier temp pour éviter les problèmes avec % dans crontab
  TMPFILE=$(mktemp)
  crontab -l 2>/dev/null > "$TMPFILE" || true
  echo '0 3 * * * docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_$(date +\%Y\%m\%d).sql.gz && find /appli/backups -name '"'"'*.gz'"'"' -mtime +7 -delete' >> "$TMPFILE"
  crontab "$TMPFILE"
  rm "$TMPFILE"
  echo "  Cron installé"
  RESULTS+=("CRON_BACKUP=ok")
fi

echo "  Verification : $(crontab -l 2>/dev/null | grep pg_backup || echo 'non trouve')"
echo ""

# Test backup manuel
echo ">>> Test backup manuel..."
if docker exec postgres pg_dumpall -U appstore 2>/dev/null | gzip > /appli/backups/pg_backup_test.sql.gz; then
  SIZE=$(ls -lh /appli/backups/pg_backup_test.sql.gz | awk '{print $5}')
  echo "  Backup test OK — $SIZE"
  RESULTS+=("BACKUP_TEST=ok ($SIZE)")
else
  echo "  Backup test echoue"
  RESULTS+=("BACKUP_TEST=echec")
fi
echo ""

# ===== ÉTAPE 7 : Changement port SSH =====
echo ">>> [7] Changement port SSH (22 → 2222)..."
echo ""
echo "  ⚠️  AVANT DE CONTINUER :"
echo "  Ouvre un 2e terminal et verifie que tu peux te connecter :"
echo "    ssh abdel@37.59.125.159"
echo ""
echo "  Si la connexion fonctionne, tape : OUI"
read -r CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
  echo "  Abandonne. Lance 'sudo bash /tmp/security_step7.sh' quand pret."
  RESULTS+=("PORT_SSH=annule")
else
  # Changer le port
  if grep -q "^Port 2222" /etc/ssh/sshd_config 2>/dev/null || grep -q "^Port 2222" /etc/ssh/sshd_config.d/*.conf 2>/dev/null; then
    echo "  (port 2222 deja configure, skip)"
    RESULTS+=("PORT_SSH=deja_fait")
  else
    sed -i 's/^#Port 22$/Port 2222/' /etc/ssh/sshd_config
    # Si la ligne #Port 22 n'existait pas, l'ajouter
    if ! grep -q "^Port 2222" /etc/ssh/sshd_config; then
      echo "Port 2222" >> /etc/ssh/sshd_config
    fi
    ufw allow 2222/tcp
    systemctl reload ssh
    echo "  Port changé → 2222, UFW ouvert"
    echo ""
    echo "  ⚠️  MAINTENANT :"
    echo "  Ouvre un 3e terminal et teste :"
    echo "    ssh -p 2222 abdel@37.59.125.159"
    echo ""
    echo "  Si OK, tape : OUI"
    read -r CONFIRM2
    if [ "$CONFIRM2" = "OUI" ]; then
      ufw delete allow 22/tcp
      echo "  Port 22 fermé dans UFW"
      RESULTS+=("PORT_SSH=2222 (port 22 ferme)")
    else
      echo "  ⚠️  Port 22 conservé en secours. Teste et relance si besoin."
      RESULTS+=("PORT_SSH=2222 configure mais port 22 conserve")
    fi
  fi
fi
echo ""

# ===== RECAP FINAL =====
echo ""
echo "============================================================"
echo " RECAP SECURISATION VPS — perform-learn.fr"
echo "============================================================"
echo ""
printf " %-30s %s\n" "MESURE" "STATUT"
echo " ------------------------------------------------------------"

# UFW
UFW_STATUS=$(ufw status | head -1 | awk '{print $2}')
[ "$UFW_STATUS" = "active" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "1. Firewall UFW" "$ICON — $UFW_STATUS"

# Fail2ban
F2B=$(systemctl is-active fail2ban 2>/dev/null)
[ "$F2B" = "active" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "2. Fail2ban" "$ICON — $F2B"

# SSH PasswordAuth
PASSAUTH=$(sshd -T 2>/dev/null | grep "^passwordauthentication" | awk '{print $2}')
[ "$PASSAUTH" = "no" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "3. SSH PasswordAuth desactive" "$ICON — $PASSAUTH"

# SSH Root
ROOTLOGIN=$(sshd -T 2>/dev/null | grep "^permitrootlogin" | head -1 | awk '{print $2}')
[ "$ROOTLOGIN" = "no" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "4. SSH Root desactive" "$ICON — $ROOTLOGIN"

# Swap
SWAP=$(free -h | grep Swap | awk '{print $2}')
[ "$SWAP" != "0B" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "5. Swap" "$ICON — $SWAP"

# Auto-updates
AUTOUPD=$(systemctl is-active unattended-upgrades 2>/dev/null)
[ "$AUTOUPD" = "active" ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "6. Mises a jour auto" "$ICON — $AUTOUPD"

# Backup cron
CRON=$(crontab -l 2>/dev/null | grep -c pg_backup || echo 0)
[ "$CRON" -gt 0 ] && ICON="OK" || ICON="ECHEC"
printf " %-30s %s\n" "7. Backup cron PostgreSQL" "$ICON — $([ "$CRON" -gt 0 ] && echo 'cron actif' || echo 'absent')"

# Port SSH
SSH_PORT=$(sshd -T 2>/dev/null | grep "^port " | awk '{print $2}')
printf " %-30s %s\n" "8. Port SSH" "INFO — port $SSH_PORT"

echo " ------------------------------------------------------------"
echo ""
echo " Ports UFW ouverts :"
ufw status | grep ALLOW | sed 's/^/   /'
echo ""
echo "============================================================"
