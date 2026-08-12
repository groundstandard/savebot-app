import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { shareTitle } from './api/shareItem';
import type { SavedItem, StructuredData } from '../types';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function li(items: string[]): string {
  return items.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('');
}

/** Type-specific body sections, rendered as printable HTML. */
function sectionsFor(item: SavedItem): string {
  const d = item.structured_data as StructuredData | null;
  if (!d) return '';

  if (d.type === 'recipe') {
    const meta = [d.total_time_minutes ? `${d.total_time_minutes} min` : '', d.servings ? `${d.servings} servings` : '', d.difficulty ?? '', d.cuisine ?? '']
      .filter(Boolean).map(esc).join(' · ');
    const ing = d.ingredients.map((i) =>
      `<li>${esc([i.quantity, i.unit, i.item].filter(Boolean).join(' '))}${i.notes ? ` <span class="note">(${esc(i.notes)})</span>` : ''}</li>`).join('');
    const steps = d.instructions.map((s) => `<li>${esc(s.text)}</li>`).join('');
    return `${meta ? `<p class="meta">${meta}</p>` : ''}${d.dietary_tags.length ? `<p class="tags">${d.dietary_tags.map(esc).join(' · ')}</p>` : ''}${ing ? `<h2>Ingredients</h2><ul>${ing}</ul>` : ''}${steps ? `<h2>Instructions</h2><ol>${steps}</ol>` : ''}${d.tips?.length ? `<h2>Tips</h2><ul>${li(d.tips)}</ul>` : ''}`;
  }

  if (d.type === 'workout') {
    const meta = [d.duration_minutes ? `${d.duration_minutes} min` : '', d.difficulty ?? '', d.workout_type ?? '']
      .filter(Boolean).map(esc).join(' · ');
    const ex = d.exercises.map((e) => {
      const sub = [e.sets ? `${e.sets} sets` : '', e.reps ? `${e.reps} reps` : '', e.rest_seconds ? `${e.rest_seconds}s rest` : ''].filter(Boolean).join(' · ');
      return `<li><strong>${esc(e.name)}</strong>${sub ? ` — ${esc(sub)}` : ''}${e.notes ? `<br/><span class="note">${esc(e.notes)}</span>` : ''}</li>`;
    }).join('');
    return `${meta ? `<p class="meta">${meta}</p>` : ''}${d.target_muscles.length ? `<p class="tags">${d.target_muscles.map(esc).join(' · ')}</p>` : ''}${d.equipment_needed.length ? `<h2>Equipment</h2><p>${esc(d.equipment_needed.join(', '))}</p>` : ''}${ex ? `<h2>Exercises</h2><ul>${ex}</ul>` : ''}${d.tips?.length ? `<h2>Tips</h2><ul>${li(d.tips)}</ul>` : ''}`;
  }

  if (d.type === 'travel') {
    const meta = [d.travel_type ?? '', d.recommended_season ?? '', d.estimated_cost ?? ''].filter(Boolean).map(esc).join(' · ');
    return `${meta ? `<p class="meta">${meta}</p>` : ''}${d.locations.length ? `<h2>Places</h2><ul>${li(d.locations)}</ul>` : ''}${d.tips?.length ? `<h2>Tips</h2><ul>${li(d.tips)}</ul>` : ''}`;
  }

  if (d.type === 'product') {
    const meta = [d.brand ?? '', d.price ?? '', d.category ?? ''].filter(Boolean).map(esc).join(' · ');
    return `${meta ? `<p class="meta">${meta}</p>` : ''}${d.where_to_buy ? `<h2>Where to buy</h2><p>${esc(d.where_to_buy)}</p>` : ''}${d.pros.length ? `<h2>Pros</h2><ul>${li(d.pros)}</ul>` : ''}${d.cons.length ? `<h2>Cons</h2><ul>${li(d.cons)}</ul>` : ''}`;
  }

  return `${d.key_points.length ? `<h2>Key points</h2><ul>${li(d.key_points)}</ul>` : ''}${d.actionable_items.length ? `<h2>Action items</h2><ul>${li(d.actionable_items)}</ul>` : ''}`;
}

/** Full printable HTML document for a saved item. */
export function buildItemHtml(item: SavedItem, includeNotes: boolean): string {
  const title = shareTitle(item);
  const body = sectionsFor(item);
  const notes = includeNotes && item.user_notes?.trim() ? `<h2>My notes</h2><p>${esc(item.user_notes.trim())}</p>` : '';
  const src = item.source_url ? `<a href="${esc(item.source_url)}">${esc(item.source_url)}</a>` : '';
  const creator = item.source_creator_handle ? `Creator: @${esc(item.source_creator_handle)}` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; color: #111827; padding: 34px 30px; line-height: 1.5; }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #6366F1; margin: 0 0 6px; }
    h1 { font-size: 26px; margin: 0 0 8px; letter-spacing: -0.02em; }
    .summary { color: #374151; font-size: 15px; margin: 0 0 14px; }
    .meta { color: #6366F1; font-weight: 600; font-size: 13px; margin: 0 0 8px; }
    .tags { color: #6B7280; font-size: 12px; margin: 0 0 8px; }
    h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    ul, ol { margin: 0; padding-left: 20px; }
    li { margin: 4px 0; font-size: 14px; }
    .note { color: #9CA3AF; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; }
    a { color: #6366F1; word-break: break-all; }
  </style></head><body>
    <p class="brand">SaveBot</p>
    <h1>${esc(title)}</h1>
    ${item.ai_summary ? `<p class="summary">${esc(item.ai_summary)}</p>` : ''}
    ${body}
    ${notes}
    <div class="footer">${creator}${creator && src ? ' · ' : ''}${src}<br/>Saved with SaveBot</div>
  </body></html>`;
}

/** Render a saved item to a PDF and open the share sheet with it. */
export async function exportItemPdf(item: SavedItem, includeNotes: boolean): Promise<void> {
  const html = buildItemHtml(item, includeNotes);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: shareTitle(item),
      UTI: 'com.adobe.pdf',
    });
  }
}
