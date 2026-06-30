import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SYSTEM_PROMPT = `Du er Los, en empatisk digital veileder for ungdom 16–25 i Norge.
Svar kort på norsk bokmål. Du booker ikke bolig — du hjelper brukeren å finne riktig hjelp.
Ved boligbehov: foreslå overlevering til saksbehandler. Ved akutt fare: henvis til 113.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { message } = (await req.json()) as { message?: string }
    const userText = (message ?? '').trim()
    if (!userText) {
      return new Response(JSON.stringify({ reply: 'Skriv en melding, så hjelper jeg deg.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userText },
          ],
          max_tokens: 300,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const reply = data.choices?.[0]?.message?.content ?? 'Takk for meldingen.'
        return new Response(JSON.stringify({ reply }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const lower = userText.toLowerCase()
    let reply =
      'Takk for at du deler. Vil du at jeg kobler deg til en saksbehandler i kommunen din?'
    if (/bolig|hus|leie|sove/.test(lower)) {
      reply = 'Det høres ut som du trenger hjelp med bolig. Jeg kan koble deg til en saksbehandler.'
    } else if (/hjelp|krise|redd|113/.test(lower)) {
      reply = 'Hvis du er i akutt fare, ring 113. Jeg kan også koble deg til saksbehandler.'
    } else if (/hei|hallo/.test(lower)) {
      reply = 'Hei! Jeg er Los. Hva kan jeg hjelpe deg med?'
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
