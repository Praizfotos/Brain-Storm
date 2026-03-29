# Developer Setup Guide

This guide will help you set up Brain-Storm for local development.

## Prerequisites

Ensure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | v18+ | JavaScript runtime for Frontend/Backend |
| **npm** | v9+ | Package manager |
| **Rust** | v1.75+ | Smart contract development |
| **Stellar CLI** | v21.5.0+ | Contract deployment and interaction |
| **PostgreSQL** | v12+ | Primary database |
| **Redis** | v6+ | Caching and session management |
| **Docker** | Optional | Easiest way to run DB/Redis |

## Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/brain-storm.git
   cd brain-storm
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```
   Key variables to set:
   - `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/brain-storm`
   - `REDIS_URL`: `redis://localhost:6379`
   - `JWT_SECRET`: A random secure string
   - `STELLAR_NETWORK`: `testnet`
   - `STELLAR_SECRET_KEY`: Your testnet account secret

## Database & Redis Setup

### Using Docker (Recommended)
You can start PostgreSQL and Redis using the provided docker-compose:
```bash
docker compose up -d postgres redis
```

### Manual Setup
- Create a PostgreSQL database named `brain-storm`.
- Ensure Redis is running on port `6379`.

## Smart Contract Setup

1. **Add Wasm target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. **Build contracts**:
   ```bash
   ./scripts/build.sh
   ```

3. **Deploy to Testnet**:
   First, fund your testnet account using Friendbot on [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=testnet).
   Then deploy:
   ```bash
   ./scripts/deploy.sh testnet analytics
   ./scripts/deploy.sh testnet token
   ./scripts/deploy.sh testnet certificate
   ```

## Running the Application

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Backend**:
   ```bash
   npm run dev:backend
   ```
   The API will be available at `http://localhost:3000`.

3. **Start Frontend**:
   ```bash
   npm run dev:frontend
   ```
   The app will be available at `http://localhost:3001`.

## Makefile Targets

We provide a `Makefile` for common tasks:
- `make setup`: Install dependencies and build contracts.
- `make dev`: Start backend and frontend in development mode.
- `make test`: Run tests across all workspaces.
- `make build`: Build the entire project for production.

---

## Troubleshooting

### Common Errors

**1. `Database connection refused`**
- Check if PostgreSQL is running (`docker ps` if using Docker).
- Verify `DATABASE_URL` in `.env`.

**2. `Redis connection refused`**
- Check if Redis is running.
- Verify `REDIS_URL` in `.env`.

**3. `Stellar account not found`**
- Ensure you have funded your `STELLAR_SECRET_KEY` account on testnet.

**4. `Missing wasm32 target`**
- Run `rustup target add wasm32-unknown-unknown`.

**5. `Port already in use (3000/3001)`**
- Another process is using the port. Find and kill it or change the port in `.env`.
