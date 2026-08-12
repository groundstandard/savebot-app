import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Transcribe a short voice recording (dictation) the app uploaded to the
// private user-media bucket. Creates a signed URL and hands it to the n8n
// Whisper webhook, then returns the text. The app drops the text into the
// manual-add field for the user to review before saving.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const N8N_TRANSCRIBE_WEBHOOK_URL = Deno.env.get('N8N_TRANSCRIBE_WEBHOOK_URL') ?? '';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { path } = await req.json().catch(() => ({ path: '' }));

    if (!N8N_TRANSCRIBE_WEBHOOK_URL) return json({ text: '', reason: 'transcribe_unconfigured' });
    if (!path) return json({ text: '', reason: 'no_path' });

    // Identify the caller and enforce that they can only transcribe their own upload.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ text: '', reason: 'unauthorized' }, 401);
    if (!String(path).startsWith(`${user.id}/`)) return json({ text: '', reason: 'forbidden' }, 403);

    // Short-lived signed URL for the private recording, then Whisper via n8n.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: signed } = await admin.storage.from('user-media').createSignedUrl(path, 600);
    if (!signed?.signedUrl) return json({ text: '', reason: 'sign_failed' });

    const res = await fetch(N8N_TRANSCRIBE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: signed.signedUrl }),
    });
    if (!res.ok) return json({ text: '', reason: 'transcribe_failed' });
    const j = await res.json();

    // Clean up the recording — we only needed the text.
    admin.storage.from('user-media').remove([path]).catch(() => {});

    return json({ text: (j.text ?? '').toString().trim() });
  } catch (e) {
    return json({ text: '', reason: 'exception', error: String(e) });
  }
});
