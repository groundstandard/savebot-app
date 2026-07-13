import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SavedItem, Category } from '../types';

interface LibraryState {
  items: SavedItem[];
  categories: Category[];
  loading: boolean;
  fetchCategories: (includeHidden?: boolean) => Promise<void>;
  fetchItems: (categoryId?: string) => Promise<void>;
  addItem: (item: SavedItem) => void;
  updateItem: (id: string, updates: Partial<SavedItem>) => void;
  removeItem: (id: string) => void;
  // Category management
  createCategory: (name: string, icon: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  setCategoryHidden: (id: string, hidden: boolean) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  categories: [],
  loading: false,

  fetchCategories: async (includeHidden = false) => {
    let query = supabase.from('categories').select('*').order('sort_order');
    if (!includeHidden) query = query.eq('is_hidden', false);
    const { data } = await query;
    if (data) set({ categories: data as Category[] });
  },

  fetchItems: async (categoryId?: string) => {
    set({ loading: true });
    let query = supabase
      .from('saved_items')
      .select('*, media:saved_item_media(*), category:categories(*), subcategory:subcategories(*)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data } = await query;
    set({ items: (data as SavedItem[]) ?? [], loading: false });
  },

  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),

  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  createCategory: async (name, icon) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const nextOrder = get().categories.reduce((m, c) => Math.max(m, c.sort_order), -1) + 1;
    const { data } = await supabase
      .from('categories')
      .insert({
        user_id: session.user.id, name, icon,
        sort_order: nextOrder, is_default: false, is_hidden: false,
      })
      .select()
      .single();
    if (data) set((s) => ({ categories: [...s.categories, data as Category] }));
  },

  renameCategory: async (id, name) => {
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) }));
    await supabase.from('categories').update({ name }).eq('id', id);
  },

  setCategoryHidden: async (id, hidden) => {
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, is_hidden: hidden } : c)) }));
    await supabase.from('categories').update({ is_hidden: hidden }).eq('id', id);
  },

  deleteCategory: async (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    // Detach items first so the delete doesn't fail on the FK.
    await supabase.from('saved_items').update({ category_id: null }).eq('category_id', id);
    await supabase.from('categories').delete().eq('id', id);
  },
}));
