#!/bin/bash
# deploy-from-wsl.sh
# Run this from WSL where vercel is already authenticated
# Usage: bash /mnt/c/Users/KUNIGO/Downloads/مرکز\ فرماندهی\ کیو/deploy-from-wsl.sh

set -e

PROJECT_DIR="/mnt/c/Users/KUNIGO/Downloads/مرکز فرماندهی کیو"

echo "=== Q Command Center - WSL Deploy Script ==="
echo ""

cd "$PROJECT_DIR"

# Check vercel auth
if ! vercel whoami 2>/dev/null; then
  echo "ERROR: Vercel not authenticated. Run: vercel login"
  exit 1
fi

echo "✓ Vercel authenticated"
echo ""

# Build locally first (vercel build creates .vercel/output/)
echo "Step 1: Building locally via vercel build..."
vercel build --prod
echo "✓ vercel build complete"
echo ""

# Deploy pre-built output (bypasses remote build = avoids Unexpected error)
echo "Step 2: Deploying pre-built output..."
vercel deploy --prebuilt --prod
echo ""
echo "✓ Deployment complete!"
