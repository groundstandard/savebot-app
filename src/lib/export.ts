import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { shareTitle } from './api/shareItem';
import type { SavedItem, StructuredData } from '../types';

/** Human-readable saved date, e.g. "Aug 13, 2026". Falls back to the raw string. */
function savedDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Quote a CSV cell if it contains a comma, quote, or newline (RFC 4180). */
function csvCell(value: unknown): string {
  const s = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_COLUMNS = [
  'Title', 'Type', 'Theme', 'Topic', 'People', 'Platform', 'Creator', 'URL', 'Summary', 'Tags', 'References', 'Notes', 'Favorite', 'Saved',
] as const;

function csvRow(item: SavedItem): string {
  return [
    shareTitle(item),
    item.content_classification ?? '',
    item.moral_lesson ?? '',
    item.topic ?? '',
    (item.people ?? []).join('; '),
    item.source_platform ?? '',
    item.source_creator_handle ? `@${item.source_creator_handle}` : '',
    item.source_url ?? '',
    item.ai_summary ?? '',
    (item.ai_tags ?? []).join('; '),
    (item.reference_links ?? []).map((r) => r.url).join('; '),
    item.user_notes ?? '',
    item.is_favorite ? 'yes' : '',
    savedDate(item.created_at),
  ].map(csvCell).join(',');
}

/** Build a spreadsheet-ready CSV of all saves (one row per item). */
export function buildItemsCsv(items: SavedItem[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = items.map(csvRow);
  // Lead with a UTF-8 BOM so Excel opens accented characters correctly.
  return '﻿' + [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Markdown (Notion / docs)
// ---------------------------------------------------------------------------

function mdList(items: string[]): string {
  return items.filter(Boolean).map((x) => `- ${x}`).join('\n');
}

/** Type-specific detail block for a single item, as Markdown. */
function mdSections(item: SavedItem): string {
  const d = item.structured_data as StructuredData | null;
  if (!d) return '';

  if (d.type === 'recipe') {
    const meta = [d.total_time_minutes ? `${d.total_time_minutes} min` : '', d.servings ? `${d.servings} servings` : '', d.difficulty ?? '']
      .filter(Boolean).join(' · ');
    const ing = d.ingredients.map((i) => `- ${[i.quantity, i.unit, i.item].filter(Boolean).join(' ')}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
    const steps = d.instructions.map((s, n) => `${n + 1}. ${s.text}`).join('\n');
    return [meta && `_${meta}_`, ing && `**Ingredients**\n${ing}`, steps && `**Instructions**\n${steps}`, d.tips?.length && `**Tips**\n${mdList(d.tips)}`]
      .filter(Boolean).join('\n\n');
  }

  if (d.type === 'workout') {
    const ex = d.exercises.map((e) => {
      const sub = [e.sets ? `${e.sets} sets` : '', e.reps ? `${e.reps} reps` : '', e.rest_seconds ? `${e.rest_seconds}s rest` : ''].filter(Boolean).join(' · ');
      return `- **${e.name}**${sub ? ` — ${sub}` : ''}${e.notes ? ` (${e.notes})` : ''}`;
    }).join('\n');
    return [d.equipment_needed.length && `**Equipment:** ${d.equipment_needed.join(', ')}`, ex && `**Exercises**\n${ex}`, d.tips?.length && `**Tips**\n${mdList(d.tips)}`]
      .filter(Boolean).join('\n\n');
  }

  if (d.type === 'travel') {
    return [d.locations.length && `**Places**\n${mdList(d.locations)}`, d.tips?.length && `**Tips**\n${mdList(d.tips)}`]
      .filter(Boolean).join('\n\n');
  }

  if (d.type === 'product') {
    const meta = [d.brand ?? '', d.price ?? ''].filter(Boolean).join(' · ');
    return [meta && `_${meta}_`, d.where_to_buy && `**Where to buy:** ${d.where_to_buy}`, d.pros.length && `**Pros**\n${mdList(d.pros)}`, d.cons.length && `**Cons**\n${mdList(d.cons)}`]
      .filter(Boolean).join('\n\n');
  }

  return [d.key_points.length && `**Key points**\n${mdList(d.key_points)}`, d.actionable_items.length && `**Action items**\n${mdList(d.actionable_items)}`]
    .filter(Boolean).join('\n\n');
}

function mdItem(item: SavedItem): string {
  const meta = [item.source_platform, item.content_classification, savedDate(item.created_at)].filter(Boolean).join(' · ');
  const org = [
    item.moral_lesson ? `**Theme:** ${item.moral_lesson}` : '',
    item.topic ? `**Topic:** ${item.topic}` : '',
    (item.people ?? []).length ? `**People:** ${item.people.join(', ')}` : '',
  ].filter(Boolean).join(' · ');
  const refs = (item.reference_links ?? []).length
    ? `**References**\n${item.reference_links.map((r) => `- [${r.title}](${r.url})`).join('\n')}`
    : '';
  const parts = [
    `## ${shareTitle(item)}`,
    meta && `_${meta}_`,
    org,
    item.ai_summary,
    mdSections(item),
    (item.ai_tags ?? []).length ? `**Tags:** ${item.ai_tags.map((t) => `#${t}`).join(' ')}` : '',
    refs,
    item.user_notes?.trim() ? `**My notes:** ${item.user_notes.trim()}` : '',
    item.source_url ? `[Original post](${item.source_url})` : '',
  ];
  return parts.filter(Boolean).join('\n\n');
}

/** Build a Markdown document of all saves (importable into Notion, Obsidian, etc.). */
export function buildItemsMarkdown(items: SavedItem[]): string {
  const header = `# My SaveBot Library\n\n_${items.length} saved item${items.length === 1 ? '' : 's'} · exported ${savedDate(new Date().toISOString())}_`;
  return [header, ...items.map(mdItem)].join('\n\n---\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// Write + share
// ---------------------------------------------------------------------------

async function writeAndShare(filename: string, contents: string, mimeType: string, uti: string): Promise<void> {
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export SaveBot library', UTI: uti });
  }
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Export every saved item as a CSV file and open the share sheet. */
export async function exportItemsCsv(items: SavedItem[]): Promise<void> {
  await writeAndShare(`savebot-${stamp()}.csv`, buildItemsCsv(items), 'text/csv', 'public.comma-separated-values-text');
}

/** Export every saved item as a Markdown file (for Notion / docs) and open the share sheet. */
export async function exportItemsMarkdown(items: SavedItem[]): Promise<void> {
  await writeAndShare(`savebot-${stamp()}.md`, buildItemsMarkdown(items), 'text/markdown', 'net.daringfireball.markdown');
}
