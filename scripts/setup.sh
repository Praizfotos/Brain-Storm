#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Brain-Storm local setup..."

# 1. Check Node.js and npm
echo "🔍 Checking Node.js version..."
node -v
echo "🔍 Checking npm version..."
npm -v

# 2. Check Rust and Stellar CLI
echo "🔍 Checking Rust version..."
rustc --version
echo "🔍 Checking Stellar CLI..."
stellar --version || echo "⚠️  Stellar CLI not found. Please install it manually."

# 3. Add Wasm target
echo "🏗️  Adding Wasm target..."
rustup target add wasm32-unknown-unknown

# 4. Copy environment template
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your local credentials."
else
  echo "✅ .env already exists."
fi

# 5. Install Node.js dependencies
echo "📦 Installing Node.js dependencies (Backend & Frontend)..."
npm install

# 6. Build smart contracts
echo "🛠️  Building smart contracts..."
./scripts/build.sh || echo "⚠️  Contract build failed. Review output above."

# 7. Start docker services (optional)
echo "🐳 Starting PostgreSQL and Redis in Docker..."
docker compose up -d postgres redis || echo "⚠️  Docker Compose failed. Ensure Docker is running."

echo "✅ Local setup complete! You can now run 'npm run dev:backend' and 'npm run dev:frontend'."
