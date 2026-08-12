export type SourcePlatform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'youtube'
  | 'manual';

export type ContentType = 'image' | 'carousel' | 'video' | 'text' | 'mixed';

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type ContentClassification =
  | 'recipe'
  | 'workout'
  | 'travel'
  | 'product'
  | 'education'
  | 'advice'
  | 'entertainment'
  | 'other';

export type SubscriptionTier = 'free' | 'pro';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  onboarding_preferences: OnboardingPreferences | null;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  profile_public: boolean;
  created_at: string;
}

export interface OnboardingPreferences {
  interests: string[];
  platforms: SourcePlatform[];
  usage_intent: 'organize' | 'use' | 'both';
  dietary_preferences: string[];
  ai_autonomy: 'minimal' | 'full' | 'balanced';
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_ai_generated: boolean;
  created_at: string;
}

export interface SavedItemMedia {
  id: string;
  saved_item_id: string;
  media_type: 'image' | 'video' | 'thumbnail';
  storage_path: string;
  ocr_text: string | null;
  transcription_text: string | null;
  sort_order: number;
}

export interface SavedItem {
  id: string;
  user_id: string;
  source_platform: SourcePlatform;
  source_url: string | null;
  source_creator_handle: string | null;
  source_creator_display_name: string | null;
  source_creator_avatar_url: string | null;
  content_type: ContentType;
  raw_caption: string | null;
  raw_hashtags: string[];
  original_post_data: Record<string, unknown> | null;
  ai_summary: string | null;
  structured_data: StructuredData | null;
  content_classification: ContentClassification | null;
  category_id: string | null;
  subcategory_id: string | null;
  ai_tags: string[];
  user_notes: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_public: boolean;
  preferred_view: 'clean' | 'original';
  processing_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
  // Joined
  media?: SavedItemMedia[];
  category?: Category;
  subcategory?: Subcategory;
}

// Structured data variants
export type StructuredData =
  | RecipeData
  | WorkoutData
  | TravelData
  | ProductData
  | GenericData;

export interface RecipeData {
  type: 'recipe';
  dish_name: string;
  cuisine: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink' | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  dietary_tags: string[];
  ingredients: { item: string; quantity: number | null; unit: string | null; notes: string | null }[];
  instructions: { step: number; text: string; time_minutes: number | null }[];
  nutrition: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null } | null;
  tips: string[];
}

export interface WorkoutData {
  type: 'workout';
  workout_name: string;
  workout_type: string;
  target_muscles: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  duration_minutes: number | null;
  equipment_needed: string[];
  exercises: { name: string; sets: number | null; reps: string | null; rest_seconds: number | null; notes: string | null }[];
  tips: string[];
}

export interface TravelData {
  type: 'travel';
  destination: string;
  locations: string[];
  travel_type: string | null;
  recommended_season: string | null;
  estimated_cost: string | null;
  tips: string[];
}

export interface ProductData {
  type: 'product';
  product_name: string;
  brand: string | null;
  price: string | null;
  where_to_buy: string | null;
  pros: string[];
  cons: string[];
  category: string | null;
}

export interface GenericData {
  type: 'generic';
  title: string;
  key_points: string[];
  actionable_items: string[];
}
