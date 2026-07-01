# Supabase types (generated)

Generate typed client bindings from local Supabase:

```bash
supabase gen types typescript --local > frontend/lib/supabase/database.types.ts
```

Then wire in `frontend/app/lib/supabase.ts`:

```typescript
import type { Database } from '@/lib/supabase/database.types'
createBrowserClient<Database>(url, key)
```

CI should run this after migrations change. Until generated types exist, use `app/lib/listingUiTypes.ts` picks for UI boundaries.
