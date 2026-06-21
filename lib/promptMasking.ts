// Masks sensitive data before any document text reaches an external LLM (Gemini).
// Categories/method follow the org Security KPI spec (docs/Security_KPI_Auto_Measurement_Tool_v4_8...):
// customer/account identifiers, internal network info, and credentials must be replaced with
// masked-notation placeholders before being sent to an external API.
//
// Known limitation: full company/customer-NAME redaction needs NER and is out of scope for a
// regex-based tool. This only catches structurally-detectable categories (email, phone, RRN, IP,
// internal-looking URLs, key/token-shaped strings, card-like digit sequences).

export type MaskCategory = "rrn" | "credit-card" | "email" | "phone" | "ip" | "internal-url" | "api-key-token";

export type MaskMatch = {
  category: MaskCategory;
  original: string;
  index: number;
};

const MASK_TOKENS: Record<MaskCategory, string> = {
  rrn: "[MASKED_RRN]",
  "credit-card": "[MASKED_CARD]",
  email: "[MASKED_EMAIL]",
  phone: "[MASKED_PHONE]",
  ip: "[MASKED_IP]",
  "internal-url": "[MASKED_URL]",
  "api-key-token": "[MASKED_TOKEN]",
};

// Order matters: RRN must be checked before phone (both are digit-dash patterns of similar
// shape), and credit-card before phone/IP for the same reason.
const MASK_RULES: Array<{ category: MaskCategory; pattern: RegExp }> = [
  { category: "rrn", pattern: /\b\d{6}-?[1-4]\d{6}\b/g },
  { category: "credit-card", pattern: /\b(?:\d[ -]?){13,19}\b/g },
  { category: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { category: "phone", pattern: /\b01[0-9]-?\d{3,4}-?\d{4}\b|\b0\d{1,2}-?\d{3,4}-?\d{4}\b/g },
  { category: "ip", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { category: "internal-url", pattern: /\bhttps?:\/\/[^\s/]*(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|\.internal|\.local|\.corp|intranet)[^\s]*/gi },
  // Known-prefixed key formats first, then a generic long-opaque-token fallback. The fallback
  // favors over-masking (a false positive just adds noise to the prompt) over under-masking a
  // real secret.
  { category: "api-key-token", pattern: /\b(?:sk-|ghp_|AIza|xox[baprs]-)[A-Za-z0-9_-]{10,}\b|\b[A-Za-z0-9_-]{32,}\b/g },
];

export function maskSensitiveText(text: string): { masked: string; matches: MaskMatch[] } {
  let masked = text;
  const matches: MaskMatch[] = [];

  for (const rule of MASK_RULES) {
    masked = masked.replace(rule.pattern, (match, offset: number) => {
      matches.push({ category: rule.category, original: match, index: offset });
      return MASK_TOKENS[rule.category];
    });
  }

  return { masked, matches };
}
