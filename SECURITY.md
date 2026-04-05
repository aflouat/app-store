# SECURITY.md — Plan de sécurisation VPS OVH perform-learn.fr

## Serveur

- **IP** : 37.59.125.159
- **OS** : Ubuntu 24.04 LTS
- **Specs** : 4 vCores / 8 Go RAM / 75 Go stockage
- **User** : abdel (sudoer, clé SSH)

---

## Audit initial — 04/04/2026

### Mesures déjà en place ✅

| # | Mesure | Status |
|---|---|---|
| 1 | User non-root (`abdel`) avec sudo | ✅ |
| 2 | Login root SSH désactivé (`PermitRootLogin no`) | ✅ |
| 3 | Caddy avec HTTPS automatique (Let's Encrypt) | ✅ |
| 4 | PostgreSQL non exposé publiquement (127.0.0.1:5432) | ✅ |
| 5 | Docker réseau interne isolé (app-network bridge) | ✅ |

### Mesures manquantes — à appliquer

| # | Mesure | Criticité | Effort | Status |
|---|---|---|---|---|
| 1 | Firewall UFW | 🔴 Critique | 5 min | ⬜ |
| 2 | Fail2ban (anti brute-force) | 🔴 Critique | 5 min | ⬜ |
| 3 | Désactiver auth SSH par mot de passe | 🔴 Critique | 5 min | ⬜ |
| 4 | Mises à jour automatiques (unattended-upgrades) | 🟠 Important | 5 min | ⬜ |
| 5 | Changer le port SSH (22 → custom) | 🟠 Important | 10 min | ⬜ |
| 6 | Ajouter swap (2 Go) | 🟡 Moyen | 5 min | ⬜ |
| 7 | Backup automatique PostgreSQL | 🟠 Important | 15 min | ⬜ |

---

## Procédures de remédiation

> **⚠️ IMPORTANT** : Garder toujours une session SSH ouverte en parallèle pendant ces opérations. En cas de lockout SSH, utiliser la console VNC OVH Manager.

### 1. Firewall UFW

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH (temporaire, sera changé en étape 5)
sudo ufw allow 80/tcp       # HTTP (Caddy)
sudo ufw allow 443/tcp      # HTTPS (Caddy)
sudo ufw allow 443/udp      # HTTP/3 (Caddy)
sudo ufw enable
sudo ufw status
```

**Vérification** : `sudo ufw status` → doit afficher les règles ci-dessus avec `Status: active`.

---

### 2. Fail2ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Configuration optionnelle (jail SSH renforcé) :

```bash
sudo tee /etc/fail2ban/jail.local << 'EOF'
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

sudo systemctl restart fail2ban
```

**Vérification** : `sudo systemctl is-active fail2ban` → `active`

---

### 3. Désactiver l'authentification SSH par mot de passe

> **⚠️ PRÉREQUIS** : Vérifier que la connexion par clé SSH fonctionne AVANT cette étape. Garder la session actuelle ouverte.

```bash
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf << 'EOF'
PasswordAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
X11Forwarding no
EOF

sudo systemctl reload sshd
```

**Vérification** : Ouvrir un NOUVEAU terminal et tester `ssh abdel@37.59.125.159`. Si ça fonctionne, l'étape est validée. Si échec → corriger via la session encore ouverte ou via VNC OVH.

---

### 4. Mises à jour automatiques

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Répondre "Oui" quand demandé
```

Vérifier la config :

```bash
cat /etc/apt/apt.conf.d/20auto-upgrades
# Doit contenir :
# APT::Periodic::Update-Package-Lists "1";
# APT::Periodic::Unattended-Upgrade "1";
```

**Vérification** : `sudo systemctl is-active unattended-upgrades` → `active`

---

### 5. Changer le port SSH

> **⚠️ PRÉREQUIS** : UFW doit être actif (étape 1). Garder la session actuelle ouverte.

```bash
# Choisir un port custom (exemple : 2222)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Ouvrir le nouveau port dans UFW
sudo ufw allow 2222/tcp

# Recharger SSH
sudo systemctl reload sshd
```

**Vérification** : Dans un NOUVEAU terminal, tester `ssh -p 2222 abdel@37.59.125.159`. Si ça fonctionne :

```bash
# Retirer l'ancien port
sudo ufw delete allow 22/tcp
```

Si le port SSH est changé, mettre à jour Fail2ban :

```bash
sudo sed -i 's/port = ssh/port = 2222/' /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
```

> **Note** : Après changement, la connexion SSH devient `ssh -p 2222 abdel@37.59.125.159`

---

### 6. Ajouter du swap (2 Go)

Le VPS a 8 Go RAM. Sans swap, un pic de charge peut déclencher un OOM-kill sur les conteneurs Docker.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendre permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Réduire l'agressivité du swap (utiliser uniquement sous pression)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Vérification** : `free -h` → la ligne Swap doit afficher 2.0G.

---

### 7. Backup automatique PostgreSQL

Backup quotidien à 3h du matin, rétention 7 jours.

```bash
# Créer le dossier de backup
sudo mkdir -p /appli/backups

# Ajouter le cron
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_\$(date +\%Y\%m\%d).sql.gz && find /appli/backups -name '*.gz' -mtime +7 -delete") | crontab -
```

**Vérification** : `crontab -l` → doit afficher la ligne de backup.

Test manuel :

```bash
docker exec postgres pg_dumpall -U appstore | gzip > /appli/backups/pg_backup_test.sql.gz
ls -lh /appli/backups/
```

Restauration (si nécessaire) :

```bash
gunzip -c /appli/backups/pg_backup_YYYYMMDD.sql.gz | docker exec -i postgres psql -U appstore
```

---

## Checklist de vérification post-hardening

Exécuter ce script après avoir appliqué toutes les mesures :

```bash
echo "==========================================="
echo " CHECKLIST SÉCURITÉ — perform-learn.fr"
echo "==========================================="
echo ""
echo "1. UFW actif :"
sudo ufw status | head -5
echo ""
echo "2. Fail2ban actif :"
sudo systemctl is-active fail2ban
echo ""
echo "3. Auth par mot de passe SSH :"
sudo sshd -T 2>/dev/null | grep passwordauthentication
echo ""
echo "4. Root login SSH :"
sudo sshd -T 2>/dev/null | grep permitrootlogin
echo ""
echo "5. Swap :"
free -h | grep Swap
echo ""
echo "6. Mises à jour auto :"
sudo systemctl is-active unattended-upgrades
echo ""
echo "7. Ports en écoute :"
sudo ss -tlnp | grep -E 'LISTEN'
echo ""
echo "8. Backup cron :"
crontab -l 2>/dev/null | grep pg_backup || echo "⚠️  Pas de cron backup"
echo ""
echo "9. Tentatives SSH échouées (dernières 24h) :"
sudo journalctl -u sshd --since "24 hours ago" 2>/dev/null | grep -c "Failed" || echo "0"
echo ""
echo "==========================================="
```

Résultats attendus :

| Check | Valeur attendue |
|---|---|
| UFW | `Status: active` |
| Fail2ban | `active` |
| PasswordAuthentication | `no` |
| PermitRootLogin | `no` |
| Swap | `2.0Gi` |
| Unattended-upgrades | `active` |
| Backup cron | Ligne `pg_backup` présente |

---

## Notes complémentaires

### Risques acceptés pour le POC

- **API `/waitlist/stats` sans authentification** : acceptable en phase POC, à protéger avant le lancement.
- **Docker socket exposé à Netdata** : lecture seule, nécessaire pour le monitoring. Risque maîtrisé.
- **MinIO console publique** (`minio.perform-learn.fr`) : protégée par login/password. Envisager un basic auth Caddy supplémentaire si sensible.

### Actions futures (pré-lancement 30/04/2026)

- [ ] Rate limiting sur l'API (limiter les inscriptions abusives)
- [ ] Authentification API pour les endpoints sensibles (JWT ou API key)
- [ ] Monitoring des logs Fail2ban (alertes email)
- [ ] Backup externalisé (copie vers OVH Object Storage ou S3)
- [ ] Audit des images Docker (scan vulnérabilités avec `docker scout`)
- [ ] HSTS et headers de sécurité supplémentaires dans Caddy

---

## Historique

| Date | Action | Par |
|---|---|---|
| 04/04/2026 | Audit initial + plan de remédiation | Abdel |
