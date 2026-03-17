#!/usr/bin/env bash
# =============================================================================
# Local Test Runner — mirrors what CI does before deploy
# =============================================================================
# Usage:
#   ./scripts/test-local.sh          # run all checks
#   ./scripts/test-local.sh backend  # backend only
#   ./scripts/test-local.sh frontend # frontend only
#   ./scripts/test-local.sh lint     # lint only (fastest)
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0
SECTION="${1:-all}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILED=1; }
header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# ===========================================================================
# Backend Lint
# ===========================================================================
run_backend_lint() {
    header "Backend Lint & Format"

    if ! command -v ruff &>/dev/null; then
        echo "  Installing ruff..."
        pip install ruff -q
    fi

    if ruff check "$ROOT/backend/app/" --quiet 2>/dev/null; then
        pass "ruff lint"
    else
        fail "ruff lint"
    fi

    if ruff format --check "$ROOT/backend/app/" --quiet 2>/dev/null; then
        pass "ruff format"
    else
        fail "ruff format"
    fi
}

# ===========================================================================
# Backend Tests (pytest with SQLite — no external services needed)
# ===========================================================================
run_backend_tests() {
    header "Backend Tests (pytest)"

    cd "$ROOT/backend"

    # Ensure dependencies are installed
    if ! python -c "import fastapi" 2>/dev/null; then
        echo "  Installing backend dependencies..."
        pip install -r requirements.txt -q
    fi

    if python -m pytest tests/ -v --tb=short 2>&1 | tee "$ROOT/backend/test_output.txt"; then
        pass "pytest ($(grep -c 'PASSED' "$ROOT/backend/test_output.txt" 2>/dev/null || echo '?') passed)"
    else
        fail "pytest — see backend/test_output.txt"
    fi

    cd "$ROOT"
}

# ===========================================================================
# Frontend Lint & Typecheck
# ===========================================================================
run_frontend_checks() {
    header "Frontend Typecheck & Build"

    cd "$ROOT/frontend"

    # Ensure node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "  Running npm install..."
        npm ci --silent
    fi

    if npx tsc --noEmit 2>/dev/null; then
        pass "TypeScript typecheck"
    else
        fail "TypeScript typecheck"
    fi

    if npm run build --silent 2>/dev/null; then
        pass "Vite production build"
    else
        fail "Vite production build"
    fi

    cd "$ROOT"
}

# ===========================================================================
# Frontend Tests (Vitest)
# ===========================================================================
run_frontend_tests() {
    header "Frontend Tests (Vitest)"

    cd "$ROOT/frontend"

    if [ ! -d "node_modules" ]; then
        echo "  Running npm install..."
        npm ci --silent
    fi

    if npm run test 2>&1; then
        pass "vitest"
    else
        fail "vitest"
    fi

    cd "$ROOT"
}

# ===========================================================================
# Run selected sections
# ===========================================================================
echo -e "${YELLOW}╔══════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   Mushroom Farm IoT — Local Test Suite   ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════╝${NC}"

case "$SECTION" in
    all)
        run_backend_lint
        run_backend_tests
        run_frontend_checks
        run_frontend_tests
        ;;
    backend)
        run_backend_lint
        run_backend_tests
        ;;
    frontend)
        run_frontend_checks
        run_frontend_tests
        ;;
    lint)
        run_backend_lint
        ;;
    *)
        echo "Usage: $0 [all|backend|frontend|lint]"
        exit 1
        ;;
esac

# ===========================================================================
# Summary
# ===========================================================================
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}  All checks passed! Safe to push.${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}══════════════════════════════════════════${NC}"
    echo -e "${RED}  Some checks failed. Fix before pushing.${NC}"
    echo -e "${RED}══════════════════════════════════════════${NC}"
    exit 1
fi
