# CareerFlow VPS Production Deployment & Operations Playbook

This playbook provides a comprehensive, battle-tested, zero-to-hero operational manual for deploying CareerFlow to an unmanaged Linux VPS (Ubuntu 22.04 / 24.04 LTS) using Host Nginx, Automated SSL (Let's Encrypt), Docker Compose, and Continuous Deployment (GitHub Actions).

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Client Web Browser        |
                      +-----------------------------+
                                     |
                         HTTPS (443) / HTTP (80)
                                     v
                      +-----------------------------+
                      |      Host UFW Firewall      |
                      |   (Allows 22, 80, 443 only) |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |      Host Nginx Proxy       |
                      |   (SSL, Certbot, Headers)   |
                      +-----------------------------+
                       /                           \
         Proxy: app.yourdomain.com       Proxy: api.yourdomain.com
                     /                               \
                    v                                 v
      +---------------------------+     +---------------------------+
      | Frontend Container (SPA)  |     | Backend API Container     |
      | 127.0.0.1:3000 -> :80     |     | 127.0.0.1:5000 -> :5000   |
      +---------------------------+     +---------------------------+
                                                      |
                                                      | Internal Bridge Network
                                                      v
                                        +---------------------------+
                                        | MongoDB 7.0 Container     |
                                        | Private Internal :27017   |
                                        | (Zero Host Port Exposure) |
                                        +---------------------------+
```

---

## Phase 1: Initial VPS Provisioning & User Hardening

### 1.1 Connect as Root & Update System
```bash
# Connect to your fresh VPS
ssh root@YOUR_VPS_IP

# Update apt repositories and upgrade installed packages
sudo apt update && sudo apt upgrade -y
```

### 1.2 Create Dedicated Non-Root Deployment User
```bash
# Create user 'deployer'
sudo adduser --gecos "" deployer

# Grant sudo privileges
sudo usermod -aG sudo deployer

# Set up SSH directory for deployer
sudo mkdir -p /home/deployer/.ssh
sudo cp /root/.ssh/authorized_keys /home/deployer/.ssh/authorized_keys
sudo chown -R deployer:deployer /home/deployer/.ssh
sudo chmod 700 /home/deployer/.ssh
sudo chmod 600 /home/deployer/.ssh/authorized_keys
```

### 1.3 Harden SSH Configuration
Edit `/etc/ssh/sshd_config`:
```bash
sudo nano /etc/ssh/sshd_config
```
Verify and set:
```text
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
```
Restart SSH daemon:
```bash
sudo systemctl restart ssh
```
*Test logging in from another terminal window before closing root session:*
```bash
ssh deployer@YOUR_VPS_IP
```

---

## Phase 2: Host Firewall (UFW) & Intrusion Prevention (Fail2ban)

### 2.1 Configure UFW Firewall
```bash
# Reset default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'Nginx HTTP'
sudo ufw allow 443/tcp comment 'Nginx HTTPS'

# Enable firewall
sudo ufw --force enable
sudo ufw status verbose
```

### 2.2 Install & Enable Fail2ban
```bash
sudo apt install -y fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable --now fail2ban
```

---

## Phase 3: Install Docker Engine & Docker Compose Plugin

Install official Docker packages from Docker's official apt repository:

```bash
# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deployer user to docker group
sudo usermod -aG docker deployer

# Enable Docker daemon on boot
sudo systemctl enable --now docker
```

*Log out and log back in as `deployer` to apply group permissions:*
```bash
exit
ssh deployer@YOUR_VPS_IP
docker --version
docker compose version
```

---

## Phase 4: DNS Configuration

At your DNS provider (e.g., Cloudflare, Namecheap, Route 53), create two `A` records pointing to your VPS public IPv4 address:

| Type | Name / Subdomain | Target IP | Proxy Status |
|---|---|---|---|
| `A` | `app.yourdomain.com` | `YOUR_VPS_IP` | DNS Only (Initial SSL validation) |
| `A` | `api.yourdomain.com` | `YOUR_VPS_IP` | DNS Only (Initial SSL validation) |

Verify DNS propagation before proceeding:
```bash
dig +short app.yourdomain.com
dig +short api.yourdomain.com
```

---

## Phase 5: Host Nginx & Certbot SSL Issuance

### 5.1 Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 Generate Diffie-Hellman Parameters (2048-bit)
```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

### 5.3 Prepare ACME Webroot Directory
```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

### 5.4 Temporary Bootstrap Configuration (Solving the Chicken-and-Egg SSL Issue)
Before certificates exist, Nginx cannot start if `ssl_certificate` directives point to missing files. Use a minimal HTTP-only bootstrap config first:

```bash
sudo tee /etc/nginx/sites-available/careerflow.conf > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.yourdomain.com api.yourdomain.com;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 200 "CareerFlow SSL Bootstrap in progress...\n";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/careerflow.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5.5 Issue SSL Certificates with Certbot
```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d app.yourdomain.com \
  -d api.yourdomain.com \
  --agree-tos \
  --email admin@yourdomain.com \
  --non-interactive
```

### 5.6 Apply Full Production Nginx Reverse Proxy Configuration
Replace `/etc/nginx/sites-available/careerflow.conf` with the full production template located at `deploy/nginx/careerflow.conf` in the CareerFlow repository:

```bash
# Remember to substitute 'app.yourdomain.com' and 'api.yourdomain.com' with your actual domains
sudo cp /home/deployer/careerflow/deploy/nginx/careerflow.conf /etc/nginx/sites-available/careerflow.conf
sudo sed -i 's/app.yourdomain.com/app.YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/careerflow.conf
sudo sed -i 's/api.yourdomain.com/api.YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/careerflow.conf

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 5.7 Automated SSL Renewal Verification
Certbot automatically installs `certbot.timer`. Test the renewal simulation:
```bash
sudo certbot renew --dry-run
```

---

## Phase 6: Code Deployment & Secrets Configuration

### 6.1 Clone Repository
```bash
cd /home/deployer
git clone https://github.com/your-org/careerflow.git /home/deployer/careerflow
cd /home/deployer/careerflow
```

### 6.2 Configure Production Secrets
```bash
# Copy example file
cp .env.production.example .env.production

# Generate secure 64-character hex tokens
node -e "console.log('ACCESS_TOKEN_SECRET=' + crypto.randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + crypto.randomBytes(32).toString('hex'))"

# Edit .env.production
nano .env.production

# Lock down file permissions (read/write only by deployer)
chmod 600 .env.production
```

### 6.3 Launch Production Containers
```bash
# Build and start services in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify container status and health
docker compose -f docker-compose.prod.yml ps
```

### 6.4 Verify Health Endpoints
```bash
# Backend local loopback
curl -i http://127.0.0.1:5000/api/health/ready

# Frontend local loopback
curl -i http://127.0.0.1:3000/healthz

# Public HTTPS endpoints
curl -i https://api.yourdomain.com/api/health/ready
curl -i https://app.yourdomain.com/healthz
```

---

## Phase 7: GitHub Actions Continuous Deployment (CD) Setup

### 7.1 Generate Dedicated Deploy Key Pair (On VPS or Local Machine)
```bash
ssh-keygen -t ed25519 -C "github-actions-cd@careerflow" -f ~/.ssh/careerflow_deploy_key
```

### 7.2 Authorize Key on VPS
Append `careerflow_deploy_key.pub` to `/home/deployer/.ssh/authorized_keys`:
```bash
cat ~/.ssh/careerflow_deploy_key.pub >> /home/deployer/.ssh/authorized_keys
chmod 600 /home/deployer/.ssh/authorized_keys
```

### 7.3 Configure GitHub Repository Secrets
Navigate to **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions** and add:

| Secret Name | Value |
|---|---|
| `VPS_HOST` | VPS Public IPv4 Address |
| `VPS_USER` | `deployer` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Full contents of private key `careerflow_deploy_key` (including `-----BEGIN OPENSSH PRIVATE KEY-----`) |

Whenever code is merged to `main` and passes the CI pipeline, `.github/workflows/deploy.yml` will automatically deploy the changes with health check verification and automatic rollback.

---

## Phase 8: Day-2 Operations & Maintenance

### 8.1 MongoDB Automated Backup Script
Create `/home/deployer/backup-mongo.sh`:
```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/deployer/backups/mongo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "Starting MongoDB dump..."
docker exec careerflow-mongo mongodump --db careerflow --out /tmp/dump
docker cp careerflow-mongo:/tmp/dump/careerflow "$BACKUP_PATH"
docker exec careerflow-mongo rm -rf /tmp/dump

# Compress backup
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

# Retain only last 7 days of backups
find "$BACKUP_DIR" -type f -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_PATH.tar.gz"
```
Make executable: `chmod +x /home/deployer/backup-mongo.sh`

Add daily cronjob (`crontab -e`):
```text
0 3 * * * /home/deployer/backup-mongo.sh >> /home/deployer/backups/backup.log 2>&1
```

### 8.2 Database Restore Procedure
```bash
# Extract backup archive
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# Copy into MongoDB container and restore
docker cp backup_YYYYMMDD_HHMMSS careerflow-mongo:/tmp/restore
docker exec careerflow-mongo mongorestore --db careerflow --drop /tmp/restore
docker exec careerflow-mongo rm -rf /tmp/restore
```

### 8.3 Monitoring & Container Logs
```bash
# Tail logs for all containers
docker compose -f docker-compose.prod.yml logs -f

# Tail backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# Check container resource usage
docker stats --no-stream
```

### 8.4 Zero-Downtime Manual Redeployment
```bash
cd /home/deployer/careerflow
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans
docker image prune -f
```
