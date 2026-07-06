#!/usr/bin/env bash
# Fires requests at a public endpoint faster than the refill rate and asserts
# HTTP 429 + Retry-After header appears once the threshold is crossed.
# Uses curl URL globbing so all requests go through one keep-alive connection —
# fast enough to outpace the bucket refill (a fork-per-request loop is not).
set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"
# A bit above the default bucket capacity (RATELIMIT_CAPACITY, default 120)
MAX_REQUESTS="${MAX_REQUESTS:-160}"

header_dump=$(mktemp)
trap 'rm -f "$header_dump"' EXIT

# -D appends every response's headers to one dump, so the 429s' Retry-After
# is captured inside the burst itself (a separate follow-up probe would race
# the bucket refill and can see a 200 again).
codes=$(curl -s -D "$header_dump" -o /dev/null -w "%{http_code}\n" \
    "${BASE_URL}/api/v1/commands?burst=[1-${MAX_REQUESTS}]")
total=$(echo "$codes" | wc -l | tr -d ' ')
limited=$(echo "$codes" | grep -c "^429$")

if [ "$limited" -eq 0 ]; then
    echo "FAIL  no 429 observed after ${total} rapid requests"
    exit 1
fi

first=$(echo "$codes" | grep -n "^429$" | head -n 1 | cut -d: -f1)
echo "INFO  ${limited}/${total} requests got HTTP 429 (first at request #${first})"

retry_after=$(grep -i '^retry-after:' "$header_dump" | head -n 1 | tr -d '\r' | awk '{print $2}')
if [ -n "$retry_after" ]; then
    echo "PASS  429 responses carried Retry-After: ${retry_after}s"
    exit 0
fi

echo "FAIL  429 responses had no Retry-After header"
exit 1
