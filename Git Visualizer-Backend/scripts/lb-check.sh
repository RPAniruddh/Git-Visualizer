#!/usr/bin/env bash
# Curls the Nginx entrypoint N times and confirms requests are distributed
# across backend replicas by counting distinct X-Instance-Id response headers.
set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"
REQUESTS="${REQUESTS:-20}"

declare -A seen
for i in $(seq 1 "$REQUESTS"); do
    instance=$(curl -s -D - -o /dev/null "${BASE_URL}/api/v1/workflows" \
        | grep -i '^x-instance-id:' | tr -d '\r' | awk '{print $2}')
    if [ -n "$instance" ]; then
        seen["$instance"]=$(( ${seen["$instance"]:-0} + 1 ))
    fi
done

echo "Distribution over ${REQUESTS} requests:"
for instance in "${!seen[@]}"; do
    echo "  ${instance}: ${seen[$instance]} requests"
done

if [ "${#seen[@]}" -ge 2 ]; then
    echo "PASS  requests were distributed across ${#seen[@]} replicas"
    exit 0
else
    echo "FAIL  all requests hit a single replica (or X-Instance-Id missing)"
    exit 1
fi
