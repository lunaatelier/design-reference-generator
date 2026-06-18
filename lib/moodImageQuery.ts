import type { GeneratorAnalysis } from "@/types";

const PEOPLE_PATTERN = /handshake|meeting|office\s*people|business\s*people|corporate\s*photography|shaking\s*hands|group\s*of\s*people/i;

function isDocumentAsset(assetType: string): boolean {
  return /brochure|proposal|report|poster/i.test(assetType);
}

function isWebAsset(assetType: string): boolean {
  return /web|landing|homepage|event/i.test(assetType);
}

export function buildImageSearchQuery(analysis: GeneratorAnalysis, mood: GeneratorAnalysis["moods"][number]): string {
  const { assetType, domain } = analysis.project;
  const keywords = analysis.imageKeywords.filter((keyword) => !PEOPLE_PATTERN.test(keyword));

  if (keywords.length) return keywords.slice(0, 3).join(" ");

  if (isDocumentAsset(assetType)) return `${domain} abstract technology background`;
  if (isWebAsset(assetType)) return `${domain} hero image`;

  const moodKeywords = mood.keywords.filter((keyword) => !PEOPLE_PATTERN.test(keyword));
  return [...moodKeywords.slice(0, 2), domain].filter(Boolean).join(" ");
}
