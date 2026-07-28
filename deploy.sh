#!/usr/bin/env bash
# OpenICM production deploy — one-command setup on a fresh Ubuntu 22/24 VPS
set -euo pipefail

DOMAIN="${1:-openicm.example.com}"
ADMIN_PASS="${APP_PASSWORD:-admin}"
AUTH_SECRET="$(openssl rand -hex 32)"

echo "==> Deploying OpenICM to $DOMAIN"

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
fi

# 2. Install Docker Compose plugin if missing
docker compose version &>/dev/null || {
  sudo apt-get update && sudo apt-get install -y docker-compose-plugin
}

# 3. Create project directory
mkdir -p /opt/openicm && cd /opt/openicm

# 4. Download docker-compose.yml
curl -sL "https://raw.githubusercontent.com/kyssta-exe/OpenICM/main/docker-compose.yml" -o docker-compose.yml

# 5. Set up environment
cat > .env <<EOF
APP_PASSWORD=${ADMIN_PASS}
AUTH_SECRET=${AUTH_SECRET}
DOMAIN=${DOMAIN}
EOF

# 6. Create nginx config for reverse proxy
mkdir -p nginx
cat > nginx/default.conf <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

# 7. Deploy with Docker Compose
docker compose up -d --build

# 8. Install and run Caddy for automatic HTTPS (if not using nginx+certbot)
if ! command -v caddy &>/dev/null && [ "$DOMAIN" != "openicm.example.com" ]; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update && sudo apt-get install -y caddy

  sudo tee /etc/caddy/Caddyfile > /dev/null <<CADDY
${DOMAIN} {
    reverse_proxy localhost:3000
}
CADDY
  sudo systemctl enable caddy && sudo systemctl restart caddy
fi

echo ""
echo "==> Deploy complete!"
echo "    URL:      https://${DOMAIN}"
echo "    Password: ${ADMIN_PASS}"
echo ""
echo "    Save your AUTH_SECRET: ${AUTH_SECRET}"
