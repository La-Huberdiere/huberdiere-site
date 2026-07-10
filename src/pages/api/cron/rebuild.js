// Cron QUOTIDIEN de publication programmée. Le blog est statique et filtré par date
// au build (cf. src/lib/content.ts, isLive) : un article à date future est masqué
// jusqu'au build du jour J. Ce cron redéploie le site chaque jour → les articles dont
// la date est arrivée deviennent visibles automatiquement.
// Déclenche le Deploy Hook Vercel (URL secrète en env DEPLOY_HOOK_URL, aucun token).
// Protégé par CRON_SECRET (Vercel Cron l'envoie en Authorization: Bearer ; ?key=… pour test).
export const prerender = false

export async function GET({ request, url }) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  const ok = secret && (auth === `Bearer ${secret}` || url.searchParams.get("key") === secret)
  if (!ok) return new Response("unauthorized", { status: 401 })

  const hook = process.env.DEPLOY_HOOK_URL
  if (!hook) {
    return new Response(JSON.stringify({ ok: false, error: "DEPLOY_HOOK_URL absente" }), {
      status: 500, headers: { "content-type": "application/json" },
    })
  }
  try {
    const res = await fetch(hook, { method: "POST" })
    const body = await res.json().catch(() => ({}))
    return new Response(JSON.stringify({ ok: res.ok, job: body?.job ?? null }), {
      status: res.ok ? 200 : 502, headers: { "content-type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { "content-type": "application/json" },
    })
  }
}
