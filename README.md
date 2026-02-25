# Sable

A creative writing and community platform built with React and Express.js.

---

## Quick Start with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Project Root
All commands should be executed from the project root directory (`./sable`). This directory contains the `Dockerfile`, `docker-compose.yml`, and `package.json` required to run the application.

### Running the Project

1. Clone the repository:
   ```bash
   git clone https://github.com/xiarune/sable.git
   cd sable
   ```

2. Start the application:
   ```bash
   docker compose up --build
   ```

3. Wait for all services to start (first build takes 2-3 minutes). You'll see:
   ```
   sable_mongodb  | Waiting for connections
   sable_backend  | Connected to MongoDB
   sable_backend  | Server running on http://localhost:5050
   sable_frontend | nginx ready
   ```

4. Open your browser:
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
| MongoDB | localhost:27017 | Database (internal) |

### Troubleshooting Docker

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

---

## Alternative Access (Non-Docker)

If Docker is not available, a live deployment is available:

**Live Site**: https://sable-two.vercel.app

---

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

## Environment Variables

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5050/api` |

### Backend (server/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `CLIENT_ORIGIN` | Frontend URL for CORS | Yes |
| `PORT` | Server port | No (5050) |
| `AWS_*` | S3 credentials for uploads | For uploads |
| `GOOGLE_*` | OAuth credentials | For Google login |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/works` | List works |
| GET | `/api/communities` | List communities |

See `server/src/routes/` for full API documentation.

---

## License

MIT
