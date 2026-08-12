import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const N8N_EMBED_WEBHOOK_URL = Deno.env.get('N8N_EMBED_WEBHOOK_URL') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Embed the query via the n8n embeddings webhook. Null if unconfigured/failed. */
async function embedQuery(text: string): Promise<number[] | null> {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { query, match_count } = await req.json().catch(() => ({ query: '' }));

    if (!N8N_EMBED_WEBHOOK_URL) return json({ items: [], reason: 'embeddings_unconfigured' });
    if (!query || !query.trim()) return json({ items: [], reason: 'no_query' });

    // Identify the caller from their JWT so results stay scoped to them.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ items: [], reason: 'unauthorized' }, 401);

    const vector = await embedQuery(query);
    if (!vector) return json({ items: [], reason: 'embed_failed' });

    // Nearest-neighbour match via the service role (RLS bypassed; scoped by user id).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin.rpc('match_saved_items', {
      query_embedding: vector,
      match_user_id: user.id,
      match_count: typeof match_count === 'number' ? match_count : 30,
    });
    if (error) return json({ items: [], reason: 'rpc_error', error: error.message });

    // Drop the heavy embedding vector before sending to the app.
    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const { embedding: _embedding, ...rest } = row;
      return rest;
    });
    return json({ items });
  } catch (e) {
    return json({ items: [], reason: 'exception', error: String(e) });
  }
});
