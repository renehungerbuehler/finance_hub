#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───
BOLD='\033[1m'
RESET='\033[0m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
RED='\033[31m'
DIM='\033[2m'
CHECK='✓'
CROSS='✗'

info()  { echo -e "  ${BLUE}ℹ${RESET} $*"; }
ok()    { echo -e "  ${GREEN}${CHECK}${RESET} $*"; }
warn()  { echo -e "  ${YELLOW}!${RESET} $*"; }
fail()  { echo -e "  ${RED}${CROSS}${RESET} $*"; exit 1; }

echo ""
echo -e "  ${BOLD}Finance Hub — Setup${RESET}"
echo -e "  ${DIM}Installs prerequisites and starts the app${RESET}"
echo ""

# ─── macOS only (Homebrew) ───
if [[ "$(uname)" != "Darwin" ]]; then
  fail "This script currently supports macOS only. On Linux, install Docker and jq manually, then run: make restart && make import-data"
fi

# ─── Homebrew ───
if command -v brew &>/dev/null; then
  ok "Homebrew already installed"
else
  info "Installing Homebrew…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  ok "Homebrew installed"
fi

# ─── Git ───
if command -v git &>/dev/null; then
  ok "Git already installed"
else
  info "Installing Git…"
  brew install git
  ok "Git installed"
fi

# ─── jq ───
if command -v jq &>/dev/null; then
  ok "jq already installed"
else
  info "Installing jq…"
  brew install jq
  ok "jq installed"
fi

# ─── make ───
if command -v make &>/dev/null; then
  ok "make already installed"
else
  info "Installing make…"
  brew install make
  # gnu make from brew is prefixed as gmake; symlink as make if still missing
  if ! command -v make &>/dev/null; then
    export PATH="$(brew --prefix make)/libexec/gnubin:$PATH"
  fi
  ok "make installed"
fi

# ─── Docker Desktop ───
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  ok "Docker is running"
else
  if ! command -v docker &>/dev/null; then
    info "Installing Docker Desktop…"
    brew install --cask docker
    ok "Docker Desktop installed"
  fi
  info "Starting Docker Desktop…"
  open -a Docker
  echo -ne "  ${DIM}Waiting for Docker to start"
  for i in $(seq 1 60); do
    if docker info &>/dev/null 2>&1; then
      break
    fi
    echo -n "."
    sleep 2
  done
  echo -e "${RESET}"
  if docker info &>/dev/null 2>&1; then
    ok "Docker is running"
  else
    fail "Docker did not start in time. Please open Docker Desktop manually and re-run this script."
  fi
fi

# ─── Build & Start ───
echo ""
info "Building and starting containers…"
echo ""
make restart

# ─── Wait for API ───
echo ""
echo -ne "  ${DIM}Waiting for API to be ready"
API_URL="http://localhost:3003"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/accounts" 2>/dev/null | grep -q "200"; then
    break
  fi
  echo -n "."
  sleep 2
done
echo -e "${RESET}"

if curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/accounts" 2>/dev/null | grep -q "200"; then
  ok "API is ready"
else
  warn "API may not be ready yet — importing anyway (containers might still be starting)"
fi

# ─── Import sample data ───
echo ""
info "Loading sample data…"
echo ""
make import-data

# ─── Done ───
echo ""
echo -e "  ${GREEN}${BOLD}${CHECK} Setup complete!${RESET}"
echo ""
echo -e "  Open ${BLUE}${BOLD}http://localhost:3000${RESET} in your browser."
echo ""
