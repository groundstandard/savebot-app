export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  background: '#F8F9FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  border: '#E2E8F0',
  borderLight: '#F8FAFC',

  white: '#FFFFFF',
  card: '#FFFFFF',

  // kept for backward compat
  primaryDarkOld: '#4F46E5',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#64748B',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primary: {
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
};

export const TAB_BAR_HEIGHT = 90;

export const DEFAULT_CATEGORIES = [
  { name: 'Recipes & Cooking', icon: '🍳' },
  { name: 'Health & Fitness', icon: '💪' },
  { name: 'Travel & Places', icon: '✈️' },
  { name: 'Home & Living', icon: '🏠' },
  { name: 'Fashion & Beauty', icon: '👗' },
  { name: 'Career & Productivity', icon: '💼' },
  { name: 'Learning & Education', icon: '📚' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Parenting & Family', icon: '👨‍👩‍👧' },
  { name: 'Shopping & Products', icon: '🛍️' },
  { name: 'Miscellaneous', icon: '📌' },
];

export const FREE_TIER_SAVE_LIMIT = 5;
