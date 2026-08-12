import { supabase } from '../supabase';

export interface TemplateCategory {
  name: string;
  icon?: string;
  subcategories?: string[];
}

export interface CommunityTemplate {
  id: string;
  creator_user_id: string;
  name: string;
  description: string | null;
  category_structure: { categories?: TemplateCategory[] } | null;
  install_count: number;
  rating_avg: number;
  created_at: string;
}

/** Browse published community templates, most-installed first. */
export async function listTemplates(): Promise<CommunityTemplate[]> {
  const { data, error } = await supabase
    .from('community_templates')
    .select('*')
    .order('install_count', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data as CommunityTemplate[]) ?? [];
}

/** Count of categories a template will add (for display). */
export function templateCategoryCount(t: CommunityTemplate): number {
  return t.category_structure?.categories?.length ?? 0;
}

/**
 * Install a template: create any categories (+ their subcategories) the user
 * doesn't already have, then bump the template's install count.
 * Returns how many new categories were added.
 */
export async function installTemplate(t: CommunityTemplate): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0;
  const cats = t.category_structure?.categories ?? [];
  if (cats.length === 0) return 0;

  const { data: existing } = await supabase
    .from('categories')
    .select('name, sort_order')
    .eq('user_id', session.user.id);
  const existingNames = new Set((existing ?? []).map((c: { name: string }) => c.name.toLowerCase()));
  let order = (existing ?? []).reduce((m: number, c: { sort_order: number }) => Math.max(m, c.sort_order), -1) + 1;

  let created = 0;
  for (const cat of cats) {
    if (!cat.name || existingNames.has(cat.name.toLowerCase())) continue;
    const { data: newCat } = await supabase
      .from('categories')
      .insert({
        user_id: session.user.id, name: cat.name, icon: cat.icon || '📁',
        sort_order: order++, is_default: false, is_hidden: false,
      })
      .select('id')
      .single();
    created++;
    existingNames.add(cat.name.toLowerCase());
    if (newCat && Array.isArray(cat.subcategories) && cat.subcategories.length) {
      const subs = cat.subcategories
        .filter(Boolean)
        .map((name, i) => ({ category_id: newCat.id, name, sort_order: i, is_ai_generated: false }));
      if (subs.length) await supabase.from('subcategories').insert(subs);
    }
  }

  await supabase.rpc('increment_template_installs', { template_id: t.id });
  return created;
}

/** Publish the user's current (visible) category setup as a community template. */
export async function publishTemplate(name: string, description: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, icon')
    .eq('user_id', session.user.id)
    .eq('is_hidden', false)
    .order('sort_order');

  const categories: TemplateCategory[] = [];
  for (const cat of (cats ?? []) as { id: string; name: string; icon: string }[]) {
    const { data: subs } = await supabase
      .from('subcategories')
      .select('name')
      .eq('category_id', cat.id)
      .order('sort_order');
    categories.push({
      name: cat.name,
      icon: cat.icon,
      subcategories: ((subs ?? []) as { name: string }[]).map((s) => s.name),
    });
  }

  await supabase.from('community_templates').insert({
    creator_user_id: session.user.id,
    name: name.trim(),
    description: description.trim() || null,
    category_structure: { categories },
  });
}
