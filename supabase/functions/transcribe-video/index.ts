import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// transcribe-video — Sprint 1 STUB
//
// Deliverable for Sprint 1 is a deployed stub only. The real implementation
// (Sprint 4) extracts the audio track from a saved video and sends it to the
// OpenAI Whisper API for transcription, plus Claude Vision for on-screen text
// on keyframes. That work is blocked on Bobby's OpenAI API key.
//
// Until then this returns a deterministic placeholder so the ingestion
// pipeline can be wired end-to-end and callers can integrate against the
// final response shape without waiting on the AI provider.
// ---------------------------------------------------------------------------

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface TranscribeRequest {
  saved_item_id?: string;
  video_url?: string;
}

interface TranscribeResponse {
  ok: boolean;
  stub: true;
  saved_item_id: string | null;
  transcript: string;
  language: string | null;
  segments: { start: number; end: number; text: string }[];
  provider: 'whisper';
  note: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: TranscribeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { saved_item_id = null, video_url = null } = body;

  // If given a real item, tag it so the library can show a "transcribing" state
  // in dev. Real transcription will overwrite this in Sprint 4.
  if (saved_item_id) {
    await supabase
      .from('saved_items')
      .update({ processing_status: 'processing' })
      .eq('id', saved_item_id);
  }

  const response: TranscribeResponse = {
    ok: true,
    stub: true,
    saved_item_id,
    transcript: '[stub] Video transcription is not enabled yet. Real Whisper transcription ships in Sprint 4.',
    language: null,
    segments: [],
    provider: 'whisper',
    note: video_url
      ? `Received video_url: ${video_url}`
      : 'No video_url provided; returning placeholder transcript.',
  };

  return json(response, 200);
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
