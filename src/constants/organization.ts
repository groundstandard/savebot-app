// Moral-lesson themes — an exhaustive, fixed taxonomy so items group cleanly
// along this axis (Bobby, 2026-08-17). The AI extractor must pick exactly one of
// these labels; keep this list in sync with the prompt in process-save-item.
// `icon` values are Ionicons names, used for chips in the UI.
export const MORAL_LESSONS: { label: string; icon: string }[] = [
  { label: 'Business & Money', icon: 'cash-outline' },
  { label: 'Career & Work', icon: 'briefcase-outline' },
  { label: 'Mindset & Discipline', icon: 'barbell-outline' },
  { label: 'Productivity & Habits', icon: 'checkmark-done-outline' },
  { label: 'Leadership', icon: 'flag-outline' },
  { label: 'Personal Growth', icon: 'trending-up-outline' },
  { label: 'Spiritual Growth', icon: 'sparkles-outline' },
  { label: 'Philosophy & Wisdom', icon: 'library-outline' },
  { label: 'Relationships & Love', icon: 'heart-outline' },
  { label: 'Health & Fitness', icon: 'fitness-outline' },
  { label: 'Mental & Emotional Wellbeing', icon: 'happy-outline' },
  { label: 'Creativity', icon: 'color-palette-outline' },
  { label: 'Learning & Education', icon: 'school-outline' },
  { label: 'Society & Culture', icon: 'globe-outline' },
  { label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const MORAL_LESSON_LABELS = MORAL_LESSONS.map((m) => m.label);

/** Ionicons name for a moral-lesson label (falls back to a generic bookmark). */
export function moralLessonIcon(label: string | null | undefined): string {
  return MORAL_LESSONS.find((m) => m.label === label)?.icon ?? 'pricetag-outline';
}
