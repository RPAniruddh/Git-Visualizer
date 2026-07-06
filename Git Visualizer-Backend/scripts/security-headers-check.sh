#!/usr/bin/env bash
# curl -I against the deployed app and assert CSP, X-Frame-Options,
# X-Content-Type-Options are present.
set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"

headers=$(curl -s -I "${BASE_URL}/api/v1/commands")
fail=0

for header in "Content-Security-Policy" "X-Frame-Options" "X-Content-Type-Options"; do
    if echo "$headers" | grep -qi "^${header}:"; then
        value=$(echo "$headers" | grep -i "^${header}:" | tr -d '\r')
        echo "PASS  ${value}"
    else
        echo "FAIL  missing header: ${header}"
        fail=1
    fi
done

exit $fail
