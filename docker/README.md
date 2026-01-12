# Self-Hosted Sales Performance Tracker

Complete Docker deployment for running the Sales Performance Tracker on your internal network.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Internal Network                             │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Frontend   │────▶│    Kong     │────▶│   Auth      │       │
│  │  (nginx)    │     │  Gateway    │     │  (GoTrue)   │       │
│  │  :3000      │     │  :8000      │     │             │       │
│  └─────────────┘     └──────┬──────┘     └─────────────┘       │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   REST      │  │  Realtime   │  │  Storage    │             │
│  │ (PostgREST) │  │  (Phoenix)  │  │   API       │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                       │
│              ┌─────────────────────┐                            │
│              │    PostgreSQL       │                            │
│              │    (Supabase)       │                            │
│              │      :5432          │                            │
│              └─────────────────────┘                            │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐                            │
│  │   Studio    │     │  Functions  │                            │
│  │ (Admin UI)  │     │   (Deno)    │                            │
│  │   :3001     │     │             │                            │
│  └─────────────┘     └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB disk space

## Quick Start

### 1. Configure Environment

```bash
# Navigate to docker directory
cd docker

# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Update the following in `.env`:

```bash
# Set your server's IP address or hostname
SERVER_HOST=192.168.1.100

# Update the URLs
SUPABASE_PUBLIC_URL=http://192.168.1.100:8000
SITE_URL=http://192.168.1.100:3000

# Generate secure passwords (run these commands)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)
```

### 2. Create Required Directories

```bash
mkdir -p volumes/db
```

### 3. Start Services

```bash
# Start all services
docker compose up -d

# Check service status
docker compose ps

# View logs (wait for all services to be healthy)
docker compose logs -f
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://YOUR_SERVER_IP:3000 | Main application |
| Studio | http://YOUR_SERVER_IP:3001 | Database admin UI |
| API | http://YOUR_SERVER_IP:8000 | Supabase API endpoint |

## Initial Setup

### Create First User

1. Open the application at `http://YOUR_SERVER_IP:3000`
2. Click "Sign Up" and create the first user
3. The user will be automatically confirmed (no email required)

### Assign Admin Role

Access Studio at `http://YOUR_SERVER_IP:3001` and run this SQL:

```sql
-- Assign admin role to first user
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-admin@email.com';
```

## Service Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Frontend | Main web application |
| 3001 | Studio | Supabase Studio admin UI |
| 5432 | PostgreSQL | Database (direct access) |
| 8000 | Kong | API Gateway (HTTP) |
| 8443 | Kong | API Gateway (HTTPS) |

## Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service-name]

# Restart a specific service
docker compose restart frontend

# Rebuild frontend after code changes
docker compose up -d --build frontend

# Access database shell
docker compose exec db psql -U postgres

# Backup database
docker compose exec db pg_dump -U postgres postgres > backup.sql

# Restore database
docker compose exec -T db psql -U postgres postgres < backup.sql
```

## Data Persistence

Data is stored in Docker volumes:
- `postgres-data`: Database files
- `storage-data`: Uploaded files

## Generate Production API Keys

For production, generate your own JWT keys using your `JWT_SECRET`:

1. Go to [jwt.io](https://jwt.io)
2. Set algorithm to **HS256**
3. Enter your `JWT_SECRET` in the "Verify Signature" section
4. Create tokens with these payloads:

**Anon Key (public):**
```json
{
  "role": "anon",
  "iss": "supabase",
  "iat": 1700000000,
  "exp": 2000000000
}
```

**Service Role Key (private - never expose):**
```json
{
  "role": "service_role",
  "iss": "supabase",
  "iat": 1700000000,
  "exp": 2000000000
}
```

## Troubleshooting

### Check Service Health

```bash
# View all service logs
docker compose logs -f

# Check specific service
docker compose logs -f db
docker compose logs -f auth
docker compose logs -f rest
```

### Database Connection Issues

```bash
# Test database connectivity
docker compose exec db psql -U postgres -c "SELECT version();"

# Check if roles exist
docker compose exec db psql -U postgres -c "\du"

# Check auth schema
docker compose exec db psql -U postgres -c "\dt auth.*"
```

### Reset Everything

```bash
# Stop and remove all containers and volumes
docker compose down -v --remove-orphans

# Restart fresh
docker compose up -d
```

## Production Checklist

### Security
- [ ] Change all default passwords in `.env`
- [ ] Generate new JWT keys with your `JWT_SECRET`
- [ ] Configure firewall to only allow required ports
- [ ] Set up HTTPS with reverse proxy (nginx/traefik)
- [ ] Set `DISABLE_SIGNUP=true` for invite-only mode

### Backup
- [ ] Set up automated database backups
- [ ] Configure backup retention policy
- [ ] Test restore procedures regularly

### Monitoring
- [ ] Set up container health monitoring
- [ ] Configure log aggregation
- [ ] Set up alerting for service failures

## Updating

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d --build

# Check logs for any issues
docker compose logs -f
```
