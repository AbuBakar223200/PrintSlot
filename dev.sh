#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# PrintSlot dev launcher
# Installs deps (if needed) then starts API + Mobile together.
# Usage:
#   bash dev.sh          — install if needed, then start both
#   bash dev.sh --fresh  — force reinstall, then start both
# ─────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_banner() {
  echo -e "${BOLD}${BLUE}"
  echo "  ██████╗ ██████╗ ██╗███╗   ██╗████████╗███████╗██╗      ██████╗ ████████╗"
  echo "  ██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝██╔════╝██║     ██╔═══██╗╚══██╔══╝"
  echo "  ██████╔╝██████╔╝██║██╔██╗ ██║   ██║   ███████╗██║     ██║   ██║   ██║   "
  echo "  ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║   ╚════██║██║     ██║   ██║   ██║   "
  echo "  ██║     ██║  ██║██║██║ ╚████║   ██║   ███████║███████╗╚██████╔╝   ██║   "
  echo "  ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝ ╚═════╝    ╚═╝   "
  echo -e "${NC}"
  echo -e "${CYAN}  🖨️  PrintSlot — Dev Launcher${NC}"
  echo -e "  ${BLUE}API${NC} → http://localhost:3000/api"
  echo -e "  ${GREEN}Mobile${NC} → Expo DevTools"
  echo ""
}

step() { echo -e "\n${BOLD}${YELLOW}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Parse flags ──────────────────────────────────────────────
FRESH=false
for arg in "$@"; do
  [[ "$arg" == "--fresh" ]] && FRESH=true
done

print_banner

# ── Check node_modules ───────────────────────────────────────
step "Checking dependencies"
if [[ "$FRESH" == true ]] || [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo -e "  Installing packages..."
  npm install --prefix "$ROOT_DIR"
  ok "Dependencies installed"
else
  ok "node_modules found — skipping install (use --fresh to reinstall)"
fi

# ── Generate Prisma client ────────────────────────────────────
step "Generating Prisma client"
cd "$ROOT_DIR/apps/api"
npx prisma generate
ok "Prisma client ready"
cd "$ROOT_DIR"

# ── Check .env files ──────────────────────────────────────────
step "Checking .env files"
if [[ ! -f "$ROOT_DIR/apps/api/.env" ]]; then
  err "Missing apps/api/.env — copy .env.example and fill in values"
fi
if [[ ! -f "$ROOT_DIR/apps/mobile/.env" ]]; then
  err "Missing apps/mobile/.env — copy .env.example and fill in EXPO_PUBLIC_* values"
fi
ok ".env files found"

# ── Run both services ─────────────────────────────────────────
step "Starting API + Mobile"
echo -e "  ${BLUE}[API]${NC}    NestJS on :3000"
echo -e "  ${GREEN}[Mobile]${NC} Expo DevTools"
echo -e "\n  Press ${BOLD}Ctrl+C${NC} to stop both\n"

# Use 'concurrently' if available, otherwise plain background jobs
if npx --yes concurrently --version > /dev/null 2>&1; then
  npx concurrently \
    --names "API,Mobile" \
    --prefix-colors "blue,green" \
    --kill-others-on-fail \
    "cd apps/api && npm run dev" \
    "cd apps/mobile && npm run dev"
else
  # Fallback: plain bash background jobs with prefixed output
  (cd "$ROOT_DIR/apps/api" && npm run dev 2>&1 | sed "s/^/$(printf '\033[0;34m')[API]$(printf '\033[0m') /") &
  API_PID=$!

  (cd "$ROOT_DIR/apps/mobile" && npm run dev 2>&1 | sed "s/^/$(printf '\033[0;32m')[Mobile]$(printf '\033[0m') /") &
  MOBILE_PID=$!

  # Trap Ctrl+C to kill both
  trap "echo -e '\n\nShutting down...'; kill $API_PID $MOBILE_PID 2>/dev/null; exit 0" INT TERM

  wait $API_PID $MOBILE_PID
fi
