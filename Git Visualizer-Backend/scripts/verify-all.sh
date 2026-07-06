#!/usr/bin/env bash
# Single command that chains build + test + dependency scan + seed verification,
# then spins up docker-compose and runs the full-stack checks.
# Prints a final pass/fail summary table. Exits non-zero if anything failed.
#
# Usage:   ./scripts/verify-all.sh
# Env:     SKIP_DEP_CHECK=1   skip the OWASP scan (slow without an NVD_API_KEY)
#          KEEP_STACK=1       leave docker-compose running afterwards
set -u

cd "$(dirname "$0")/.."

SCRIPT_DIR="scripts"
declare -A results

run_step() {
    local name="$1"; shift
    echo ""
    echo "=============================================================="
    echo ">>> ${name}"
    echo "=============================================================="
    if "$@"; then
        results["$name"]="PASS"
    else
        results["$name"]="FAIL"
    fi
}

# The POSIX wrapper works everywhere this script runs (Git Bash on Windows, Linux, macOS)
MVNW="./mvnw"

# --- Backend build + tests (jacoco coverage gate runs in `verify`) ---
run_step "Unit + integration tests" $MVNW -B clean verify

# --- Static analysis ---
run_step "Static analysis (SpotBugs)" $MVNW -B spotbugs:check

# --- Dependency vulnerability scan ---
if [ "${SKIP_DEP_CHECK:-0}" = "1" ]; then
    results["Dependency audit (OWASP)"]="SKIPPED"
    echo "Skipping OWASP dependency-check (SKIP_DEP_CHECK=1)"
else
    run_step "Dependency audit (OWASP)" $MVNW -B org.owasp:dependency-check-maven:check
fi

# --- Full stack ---
run_step "docker-compose up" docker compose up -d --build --wait

# Give nginx a moment after backends report healthy
sleep 3

run_step "Health checks (replicas + LB)" bash "$SCRIPT_DIR/health-check.sh"
run_step "Seed verification (live API)" bash "$SCRIPT_DIR/seed-verify.sh"
run_step "Load-balancer distribution" bash "$SCRIPT_DIR/lb-check.sh"
run_step "Security headers" bash "$SCRIPT_DIR/security-headers-check.sh"
run_step "Rate limit (429 + Retry-After)" bash "$SCRIPT_DIR/rate-limit-check.sh"

if [ "${KEEP_STACK:-0}" != "1" ]; then
    echo ""
    echo ">>> Tearing down docker-compose stack (set KEEP_STACK=1 to keep it)"
    docker compose down
fi

# --- Summary table ---
echo ""
echo "==================== VERIFY-ALL SUMMARY ===================="
printf "%-35s | %s\n" "Check" "Result"
printf -- "------------------------------------+---------\n"
overall=0
for name in "Unit + integration tests" "Static analysis (SpotBugs)" "Dependency audit (OWASP)" \
            "docker-compose up" "Health checks (replicas + LB)" "Seed verification (live API)" \
            "Load-balancer distribution" "Security headers" "Rate limit (429 + Retry-After)"; do
    result="${results[$name]:-NOT RUN}"
    printf "%-35s | %s\n" "$name" "$result"
    [ "$result" = "FAIL" ] && overall=1
    [ "$result" = "NOT RUN" ] && overall=1
done
echo "============================================================"

if [ "$overall" -eq 0 ]; then
    echo "ALL CHECKS PASSED"
else
    echo "SOME CHECKS FAILED"
fi
exit $overall
