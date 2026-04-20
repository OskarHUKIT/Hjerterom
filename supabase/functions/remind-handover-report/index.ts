import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildCorsHeaders, handleCorsOptions } from "../_shared/cors.ts"
import { edgeLog } from "../_shared/edgeLog.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  const preflight = handleCorsOptions(req)
  if (preflight) return preflight

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim()
  if (cronSecret) {
    const bearer = req.headers.get("authorization")
    const headerOk = bearer === `Bearer ${cronSecret}`
    const alt = req.headers.get("x-cron-secret") === cronSecret
    if (!headerOk && !alt) {
      edgeLog("warn", "remind-handover-report unauthorized", {})
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }
  }

  try {
    if (!SUPABASE_URL?.trim() || !SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Tomorrow in Europe/Oslo (Norwegian timezone)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10) // YYYY-MM-DD

    // Find Formidla periods that start tomorrow
    const { data: availabilities, error: availError } = await supabase
      .from("listing_availability")
      .select("id, listing_id, start_date")
      .eq("status", "Formidla")
      .eq("start_date", tomorrowStr)

    if (availError) {
      console.error("Error fetching availability:", availError)
      return new Response(
        JSON.stringify({ error: availError.message }),
        { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    if (!availabilities?.length) {
      return new Response(
        JSON.stringify({ message: "No formidlet periods starting tomorrow", notified: 0 }),
        { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      )
    }

    let notified = 0

    for (const a of availabilities) {
      // Check if any handover report exists for this listing
      const { data: reports } = await supabase
        .from("handover_reports")
        .select("id")
        .eq("listing_id", a.listing_id)
        .limit(1)

      if (reports && reports.length > 0) continue // Report exists, skip

      // Get listing owner
      const { data: listing } = await supabase
        .from("listings")
        .select("id, owner_id, address")
        .eq("id", a.listing_id)
        .single()

      if (!listing?.owner_id) continue

      // Avoid duplicate reminder for same listing today
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("listing_id", a.listing_id)
        .eq("type", "HANDOVER_REMINDER")
        .eq("owner_id", listing.owner_id)
        .gte("created_at", todayStart.toISOString())
        .limit(1)

      if (existing && existing.length > 0) continue

      const address = listing.address || "din bolig"

      const { error: insertError } = await supabase.from("notifications").insert({
        owner_id: listing.owner_id,
        listing_id: a.listing_id,
        type: "HANDOVER_REMINDER",
        title: "Haster: Overtakelsesrapport mangler",
        message: `BOLIGEN BLIR FORMIDLET I MORGEN. Du må levere overtakelsesrapport for ${address} før overtakelsen starter.`,
        status: "unread",
      })

      if (insertError) {
        console.error("Error inserting notification:", insertError)
      } else {
        notified++
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${availabilities.length} formidlet period(s), sent ${notified} reminder(s)`,
        notified,
      }),
      { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    edgeLog("error", "remind-handover-report", {
      message: err instanceof Error ? err.message : String(err),
    })
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    )
  }
})
