import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import { edgeLog } from "../_shared/edgeLog.ts"
import { notificationWebhookPayloadSchema } from "../_shared/webhookSchemas.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const parsed = notificationWebhookPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      edgeLog("warn", "send-push validation", { issues: parsed.error.flatten() })
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload", issues: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    const payload = parsed.data

    if (payload.table !== "notifications" || payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ ok: true, skipped: "not a notification insert" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const record = payload.record
    const ownerId = record.owner_id
    const title = record.title || "Boligbank"
    const message = record.message || ""

    const vapidPrivate = Deno.env.get("VAPID_KEY") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID-KEY")
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "BGJpQlyCiUmWuqwKMIf8Tc4eX9vUAT6_HxebrntxaXr638Rf72rYxo9IFrN_e6uY2JTiQlyTWN6t7f_WMgcUnX0"

    if (!vapidPrivate) {
      console.error("VAPID_KEY (eller VAPID_PRIVATE_KEY) mangler i Supabase Secrets")
      return new Response(
        JSON.stringify({ error: "VAPID key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("owner_id", ownerId)

    if (subError || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no subscriptions for user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    webpush.setVapidDetails(
      "mailto:post@boligbank.no",
      vapidPublic,
      vapidPrivate
    )

    const pushPayload = JSON.stringify({
      title,
      body: message,
      url: record.listing_id ? `/listings/${record.listing_id}` : "/nav/notifications",
    })

    let sent = 0
    const errors: string[] = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
          { TTL: 86400 }
        )
        sent++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(msg)
        if (msg.includes("410") || msg.includes("404") || msg.includes("Expired")) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("owner_id", ownerId)
            .eq("endpoint", sub.endpoint)
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, total: subscriptions.length, errors: errors.slice(0, 3) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    edgeLog("error", "send-push", { message: msg })
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
