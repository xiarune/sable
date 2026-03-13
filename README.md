# Sable

A creative writing and community platform built with React and Express.js.

---

## Quick Start with Docker

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
All commands should be executed from the project root directory (`./sable`). This directory contains the `Dockerfile`, `docker-compose.yml`, and `package.json` required to run the application.

---

## Alternative Access (Non-Docker)

If Docker is not available, a live deployment is available:

**Live Site**: https://sable-two.vercel.app

---

### Running the Project

1. Clone the repo:
   ```bash
   git clone https://github.com/xiarune/sable.git
   cd sable
   ```

2. Start the application:
   ```bash
   docker compose up --build
   ```

3. Wait for all services to start, you should see:
   ```
   sable_mongodb  | Waiting for connections
   sable_backend  | Connected to MongoDB
   sable_backend  | Server running on http://localhost:5050
   sable_frontend | nginx ready
   ```

4. Open browser:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5050/health

5. To stop the application:
   ```bash
   docker compose down
   ```

6. To stop and remove all data:
   ```bash
   docker compose down -v
   ```

### What's Running

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| Backend | http://localhost:5050 | Express.js API |
| MongoDB | localhost:27017 | Database|


### Troubleshooting Docker

**"command not found: docker" error:**

*Mac:*
```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker compose up --build
```

*Windows:*
- Open Docker Desktop
- Go to Settings → Advanced
- Enable "Add Docker to PATH" or use Docker Desktop's integrated terminal

**Port already in use:**
```bash
# Check what's using port 3000 or 5050
lsof -i :3000
lsof -i :5050
# Kill the process or change ports in docker-compose.yml
```

**Build fails:**
```bash
# Clean rebuild
docker compose down -v
docker system prune -f
docker compose up --build
```

**MongoDB connection issues:**
```bash
# Check if MongoDB container is healthy
docker compose ps
docker logs sable_mongodb
```

## Local Development (Without Docker)

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (local installation or Atlas connection string)

### Setup

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. Configure environment variables:
   ```bash
   # Frontend
   cp .env.example .env

   # Backend
   cp server/.env.example server/.env
   # Edit server/.env with your MongoDB URI and other settings
   ```

4. Run both frontend and backend:
   ```bash
   npm run dev
   ```

   Or run separately:
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev

   # Terminal 2 - Frontend
   npm start
   ```

---

## Project Structure

```
sable/
├── src/                    # React frontend source
│   ├── api/               # API client and configuration
│   ├── components/        # React components
│   ├── pages/             # Page components
│   └── ...
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── config/        # Database, S3, Socket.IO config
│   │   ├── middleware/    # Auth, error handling, security
│   │   ├── models/        # MongoDB/Mongoose models
│   │   ├── routes/        # API routes
│   │   └── server.js      # Entry point
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml      # Full-stack Docker setup
├── Dockerfile             # Frontend container
├── nginx.conf             # Nginx configuration for SPA
└── package.json           # Frontend dependencies
```

---

##Contributions

Debugging Help/Support with Claude

