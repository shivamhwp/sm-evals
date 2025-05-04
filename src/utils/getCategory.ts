// Category mapping based on Python evaluation code
const CATEGORY_MAPPING: Record<string, string> = {
  "1": "Multi-Hop",
  "2": "Single-Hop",
  "3": "Open-Domain",
  "4": "Temporal",
  "5": "Adversarial",
};

// Reverse mapping for command line arguments
export const CATEGORY_ID_MAPPING: Record<string, number> = {
  "multi-hop": 1,
  "single-hop": 2,
  "open-domain": 3,
  temporal: 4,
  adversarial: 5,
};

export function getCategoryName(category: string): string {
  return CATEGORY_MAPPING[category] || `Unknown (${category})`;
}
