#!/usr/bin/env bash
# Confirms every id in git-commands-content.json is retrievable via
# GET /api/v1/commands/{id} or GET /api/v1/workflows/{id} after seeding.
set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"
SEED_FILE="${SEED_FILE:-src/main/resources/git-commands-content.json}"

if [ ! -f "$SEED_FILE" ]; then
    echo "FAIL  seed file not found: $SEED_FILE"
    exit 1
fi

ids=$(grep -o '"id": *"[^"]*"' "$SEED_FILE" | sed 's/.*: *"\(.*\)"/\1/')
total=0
ok=0
fail=0

for id in $ids; do
    total=$((total + 1))
    cmd_status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/commands/${id}")
    if [ "$cmd_status" = "200" ]; then
        ok=$((ok + 1))
        echo "PASS  /api/v1/commands/${id}"
        continue
    fi
    wf_status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/workflows/${id}")
    if [ "$wf_status" = "200" ]; then
        ok=$((ok + 1))
        echo "PASS  /api/v1/workflows/${id}"
    else
        fail=$((fail + 1))
        echo "FAIL  ${id} not retrievable (commands: ${cmd_status}, workflows: ${wf_status})"
    fi
done

echo "Seed verification: ${ok}/${total} ids retrievable"
[ "$fail" -eq 0 ] && exit 0 || exit 1
