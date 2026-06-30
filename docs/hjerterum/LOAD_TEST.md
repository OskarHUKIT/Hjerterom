# Load test notes — formidling + finn search

Manual / k6-style targets before launch. Run against **staging** with test data only.

## Scenarios

| ID | Flow | Target | Tool |
|----|------|--------|------|
| L1 | Kommune Boligbank tab load (800 rows) | p95 &lt; 3s, no OOM | Browser + React Profiler |
| L2 | Virtualized table scroll 2000 rows | 60 fps desktop | Chrome Performance |
| L3 | `/finn` search with city + dates | p95 &lt; 2s | curl / Playwright |
| L4 | Stripe checkout create | &lt; 20 req/min/IP (429) | curl loop |

## Example: finn search (curl)

```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
  "https://app.hjerterum.no/finn?city=Tromsø"
```

## Example: checkout rate limit

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "$i %{http_code}\n" \
    -X POST "https://app.hjerterum.no/api/stripe/checkout" \
    -H "Content-Type: application/json" \
    -d '{"bookingId":"00000000-0000-0000-0000-000000000001"}'
done
# Expect 429 after ~20 requests from same IP
```

## Regression gate

After load tests, run kommune **30 min smoke**: formidling mark/extend/remove, meldinger, varsler unchanged.
