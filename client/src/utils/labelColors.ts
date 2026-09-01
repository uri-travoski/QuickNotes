export interface LabelDotColor {
  parent: string;
  child: string;
}

export interface LabelColorOption {
  id: string;
  name: string;
  parent: string;
  child: string;
}

export const LABEL_COLOR_PRESETS: LabelColorOption[] = [
  { id: 'blue', name: 'Blue', parent: '#3B82F6', child: '#93C5FD' },
  { id: 'purple', name: 'Purple', parent: '#8B5CF6', child: '#C4B5FD' },
  { id: 'indigo', name: 'Indigo', parent: '#6366F1', child: '#A5B4FC' },
  { id: 'cyan', name: 'Cyan', parent: '#06B6D4', child: '#67E8F9' },
  { id: 'teal', name: 'Teal', parent: '#14B8A6', child: '#5EEAD4' },
  { id: 'mint', name: 'Mint / Green', parent: '#10B981', child: '#6EE7B7' },
  { id: 'amber', name: 'Amber / Gold', parent: '#F59E0B', child: '#FCD34D' },
  { id: 'peach', name: 'Peach / Orange', parent: '#FB923C', child: '#FDBA74' },
  { id: 'coral', name: 'Coral / Red', parent: '#EF4444', child: '#FCA5A5' },
  { id: 'blossom', name: 'Blossom / Pink', parent: '#EC4899', child: '#F9A8D4' },
  { id: 'slate', name: 'Slate / Steel', parent: '#64748B', child: '#94A3B8' },
  { id: 'gray', name: 'Gray / Neutral', parent: '#6B7280', child: '#9CA3AF' },
];

const NAMED_PALETTE: Record<string, LabelDotColor> = {
  blue: { parent: '#3B82F6', child: '#93C5FD' },
  storm: { parent: '#3B82F6', child: '#93C5FD' },
  indigo: { parent: '#6366F1', child: '#A5B4FC' },
  purple: { parent: '#8B5CF6', child: '#C4B5FD' },
  violet: { parent: '#7C3AED', child: '#C4B5FD' },
  cyan: { parent: '#06B6D4', child: '#67E8F9' },
  teal: { parent: '#14B8A6', child: '#5EEAD4' },
  mint: { parent: '#10B981', child: '#6EE7B7' },
  green: { parent: '#10B981', child: '#6EE7B7' },
  red: { parent: '#EF4444', child: '#FCA5A5' },
  coral: { parent: '#F43F5E', child: '#FDA4AF' },
  amber: { parent: '#F59E0B', child: '#FCD34D' },
  sand: { parent: '#F59E0B', child: '#FCD34D' },
  peach: { parent: '#FB923C', child: '#FDBA74' },
  blossom: { parent: '#EC4899', child: '#F9A8D4' },
  pink: { parent: '#EC4899', child: '#F9A8D4' },
  slate: { parent: '#64748B', child: '#94A3B8' },
  gray: { parent: '#6B7280', child: '#9CA3AF' },
  fog: { parent: '#64748B', child: '#94A3B8' },
  clay: { parent: '#A855F7', child: '#D8B4FE' },
  chalk: { parent: '#3B82F6', child: '#93C5FD' },
  default: { parent: '#3B82F6', child: '#93C5FD' },
};

export function getLabelDotColors(colorNameOrHex?: string, seedKey?: string): LabelDotColor {
  if (colorNameOrHex) {
    const lower = colorNameOrHex.toLowerCase().trim();
    if (NAMED_PALETTE[lower]) {
      return NAMED_PALETTE[lower];
    }
    if (lower.startsWith('#') && (lower.length === 7 || lower.length === 4)) {
      return {
        parent: colorNameOrHex,
        child: colorNameOrHex + '99',
      };
    }
  }

  // Consistent deterministic color derived from label name/ID
  const key = (seedKey || colorNameOrHex || 'label').trim();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % LABEL_COLOR_PRESETS.length;
  return LABEL_COLOR_PRESETS[index];
}

export function getAutoPickedColor(existingCount: number = 0): string {
  const preset = LABEL_COLOR_PRESETS[existingCount % LABEL_COLOR_PRESETS.length];
  return preset.id;
}
