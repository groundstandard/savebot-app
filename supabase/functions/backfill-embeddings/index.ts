import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// One-off maintenance: embed existing saves that predate the embedding pipeline.
// Admin-gated (x-admin-key) and deployed with --no-verify-jwt so it can be driven
// from a script. Idempotent: only touches rows where embedding IS NULL.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const N8N_EMBED_WEBHOOK_URL = Deno.env.get('N8N_EMBED_WEBHOOK_URL') ?? '';
const BACKFILL_ADMIN_KEY = Deno.env.get('BACKFILL_ADMIN_KEY') ?? '';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function embedText(text: string): Promise<number[] | null> {
  if (!N8N_EMBED_WEBHOOK_URL || !text.trim()) return null;
  try {
    const res = await fetch(N8N_EMBED_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const emb = j.embedding ?? j.data?.[0]?.embedding;
    return Array.isArray(emb) && emb.length === 1536 ? emb : null;
  } catch {
    return null;
  }
}

/** Rebuild the same text we embed on save, from what's already stored on the row. */
function textFor(row: Record<string, any>): string {
  const opd = row.original_post_data ?? {};
  const extra = [opd?.youtube?.description, opd?.ocr, opd?.transcript].filter(Boolean).join('\n');
  return [
    row.ai_summary,
    Array.isArray(row.ai_tags) ? row.ai_tags.join(' ') : '',
    row.raw_caption,
    extra,
  ].filter(Boolean).join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');
  if (!BACKFILL_ADMIN_KEY || req.headers.get('x-admin-key') !== BACKFILL_ADMIN_KEY) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!N8N_EMBED_WEBHOOK_URL) return json({ error: 'embeddings_unconfigured' }, 400);

  const { limit } = await req.json().catch(() => ({ limit: 50 }));
  const batch = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: rows, error } = await admin
    .from('saved_items')
    .select('id, ai_summary, raw_caption, ai_tags, original_post_data')
    .is('embedding', null)
    .eq('is_archived', false)
    .or('ai_summary.not.is.null,raw_caption.not.is.null')
    .order('created_at', { ascending: false })
    .limit(batch);
  if (error) return json({ error: error.message }, 500);

  let embedded = 0, skipped = 0, failed = 0;
  for (const row of rows ?? []) {
    const text = textFor(row);
    if (!text.trim()) { skipped++; continue; }
    const vec = await embedText(text);
    if (!vec) { failed++; continue; }
    const { error: upErr } = await admin.from('saved_items').update({ embedding: vec }).eq('id', row.id);
    if (upErr) failed++; else embedded++;
  }

  const { count: remaining } = await admin
    .from('saved_items')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
    .eq('is_archived', false)
    .or('ai_summary.not.is.null,raw_caption.not.is.null');

  return json({ scanned: rows?.length ?? 0, embedded, skipped, failed, remaining: remaining ?? null });
});
