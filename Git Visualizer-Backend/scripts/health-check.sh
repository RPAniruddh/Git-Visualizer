#!/usr/bin/env bash
# Curl-tests /actuator/health on each backend replica and the Nginx entrypoint.
set -u

REPLICA_PORTS=(${REPLICA_PORTS:-8081 8082})
LB_URL="${LB_URL:-http://localhost:8080}"
fail=0

for port in "${REPLICA_PORTS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/actuator/health")
    body=$(curl -s "http://localhost:${port}/actuator/health")
    if [ "$status" = "200" ] && echo "$body" | grep -q '"status":"UP"'; then
        echo "PASS  backend replica on :${port} is UP"
    else
        echo "FAIL  backend replica on :${port} returned HTTP ${status}: ${body}"
        fail=1
    fi
done

status=$(curl -s -o /dev/null -w "%{http_code}" "${LB_URL}/actuator/health")
if [ "$status" = "200" ]; then
    echo "PASS  nginx entrypoint ${LB_URL} is healthy"
else
    echo "FAIL  nginx entrypoint ${LB_URL} returned HTTP ${status}"
    fail=1
fi

exit $fail
