.PHONY: help setup install dev build preview clean docker-build docker-rebuild docker-up docker-down logs restart reset-db import-data

# Default import file (override with: make import-data FILE=path/to/file.json)
FILE ?= ./example-data-import.json

# API base URL (override with: make import-data API=http://other-host:3003)
API  ?= http://localhost:3003

# Colors
BOLD    := \033[1m
RESET   := \033[0m
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
BLUE    := \033[34m
DIM     := \033[2m

help: ## Show this help
	@echo ""
	@echo "  $(BOLD)Finance Hub$(RESET)"
	@echo "  $(DIM)Self-hosted Swiss finance dashboard$(RESET)"
	@echo ""
	@echo "  $(CYAN)$(BOLD)Quick Start$(RESET)"
	@echo "  $(GREEN)make setup$(RESET)            One-command setup $(DIM)(installs Docker, builds, loads sample data)$(RESET)"
	@echo ""
	@echo "  $(CYAN)$(BOLD)Local Development$(RESET)"
	@echo "  $(GREEN)make install$(RESET)          Install npm dependencies"
	@echo "  $(GREEN)make dev$(RESET)              Start Vite dev server on $(BLUE)localhost:3000$(RESET)"
	@echo "  $(GREEN)make build$(RESET)            Build frontend for production"
	@echo "  $(GREEN)make preview$(RESET)          Preview the production build locally"
	@echo "  $(GREEN)make clean$(RESET)            Remove $(DIM)node_modules/$(RESET) and $(DIM)dist/$(RESET)"
	@echo ""
	@echo "  $(CYAN)$(BOLD)Docker$(RESET)"
	@echo "  $(GREEN)make docker-up$(RESET)        Start all services in background $(DIM)(web + api + db)$(RESET)"
	@echo "  $(GREEN)make docker-down$(RESET)       Stop and remove containers"
	@echo "  $(GREEN)make docker-build$(RESET)      Build Docker images"
	@echo "  $(GREEN)make docker-rebuild$(RESET)    Force-rebuild images without cache"
	@echo "  $(GREEN)make restart$(RESET)           Rebuild images and restart all services"
	@echo "  $(GREEN)make logs$(RESET)             Tail logs from all containers"
	@echo ""
	@echo "  $(CYAN)$(BOLD)Database$(RESET)"
	@echo "  $(GREEN)make import-data$(RESET)      Import data from $(BLUE)./example-data-import.json$(RESET) $(DIM)(default)$(RESET)"
	@echo "  $(DIM)                       Override: make import-data FILE=path/to/file.json$(RESET)"
	@echo "  $(DIM)                       Override: make import-data API=http://host:3003$(RESET)"
	@echo "  $(GREEN)make reset-db$(RESET)         $(YELLOW)⚠ Drop all data and restart with empty DB$(RESET)"
	@echo ""

# One-command setup for new users (installs prerequisites, builds, loads sample data)
setup:
	@bash ./setup.sh

# Install dependencies
install:
	npm install

# Start development server on localhost:3000
dev:
	npm run dev

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run preview

# Remove build artifacts and dependencies
clean:
	rm -rf node_modules dist

# Build Docker images
docker-build:
	docker compose build

# Force rebuild without cache (use when code changes aren't picked up)
docker-rebuild:
	docker compose build --no-cache

# Start all services detached
docker-up:
	docker compose up -d

# Stop and remove containers
docker-down:
	docker compose down

# Tail logs from all containers
logs:
	docker compose logs -f

# Rebuild images and restart
restart: docker-rebuild docker-up

# Import all keys from a JSON file into the running API (default: ./example-data-import.json)
# Usage: make import-data
#        make import-data FILE=~/my-backup.json
#        make import-data FILE=~/my-backup.json API=http://macmini:3003
import-data:
	@if [ ! -f "$(FILE)" ]; then \
	  echo "$(YELLOW)✗ File not found: $(FILE)$(RESET)"; exit 1; \
	fi
	@echo "$(CYAN)$(BOLD)Importing data from$(RESET) $(BLUE)$(FILE)$(RESET) → $(BLUE)$(API)$(RESET)"
	@echo ""
	@for key in $$(jq -r 'keys[]' "$(FILE)"); do \
	  payload=$$(jq -c ".\"$$key\"" "$(FILE)"); \
	  status=$$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$(API)/api/$$key" \
	    -H "Content-Type: application/json" \
	    --data-raw "$$payload"); \
	  if [ "$$status" = "200" ]; then \
	    echo "  $(GREEN)✓$(RESET) $$key"; \
	  else \
	    echo "  $(YELLOW)✗$(RESET) $$key $(DIM)(HTTP $$status)$(RESET)"; \
	  fi; \
	done
	@echo ""
	@echo "$(GREEN)$(BOLD)Done.$(RESET) Refresh the app to see your data."

# Drop all data and restart with a clean empty database
reset-db:
	@echo "$(YELLOW)$(BOLD)⚠ This will delete ALL data. Press Ctrl+C to abort, Enter to continue.$(RESET)"
	@read _
	docker compose down -v
	docker compose up -d
	@echo "$(GREEN)✓ Database reset complete — fresh empty instance running$(RESET)"
