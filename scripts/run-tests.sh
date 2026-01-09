#!/bin/bash
set -e

echo "=== Running EstateFlow Tests ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend tests
echo -e "\n${CYAN}[1/3] Running Backend Tests...${NC}"
cd backend
if [ -d "EstateFlow.Api.Tests" ]; then
    dotnet test --verbosity normal
else
    echo "No backend tests found, skipping..."
fi
cd ..

# Frontend unit tests
echo -e "\n${CYAN}[2/3] Running Frontend Unit Tests...${NC}"
cd frontend
npm run test:run
cd ..

# E2E tests (optional, requires running app)
if [ "$RUN_E2E" = "true" ]; then
    echo -e "\n${CYAN}[3/3] Running E2E Tests...${NC}"
    cd frontend
    npm run test:e2e
    cd ..
else
    echo -e "\n${YELLOW}[3/3] Skipping E2E Tests (set RUN_E2E=true to run)${NC}"
fi

echo -e "\n${GREEN}=== All Tests Completed ===${NC}"
