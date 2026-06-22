import type { AssetProfile, ProjectKind } from "@/types";

type AssetTypeRule = {
  pattern: RegExp;
  projectKind: ProjectKind;
  domainHint: AssetProfile["domainHint"];
};

// Single source of truth for "what does this assetType imply", replacing the regex
// classifiers that used to be duplicated across lib/generatorAnalysis.ts,
// lib/moodImageQuery.ts and app/page.tsx.
const ASSET_PROFILE_RULES: AssetTypeRule[] = [
  { pattern: /dashboard|admin|data|console|web-app/i, projectKind: "ui", domainHint: "dashboard-ops" },
  { pattern: /mobile-app/i, projectKind: "ui", domainHint: "mobile-app" },
  { pattern: /webpage|website|homepage|landing|event-page|web/i, projectKind: "mixed", domainHint: "marketing-web" },
  { pattern: /brochure|proposal|report|poster/i, projectKind: "mixed", domainHint: "document" },
  { pattern: /image|cover|hero|login/i, projectKind: "visual", domainHint: "keyvisual" },
];

function classifyAssetType(assetType: string): { projectKind: ProjectKind; domainHint: AssetProfile["domainHint"] } {
  const rule = ASSET_PROFILE_RULES.find((item) => item.pattern.test(assetType));
  // Unknown assetType: assume both UI and visual might be needed rather than silently
  // biasing toward UI-only (which previously made unclassified docs look like dashboards).
  return rule ? { projectKind: rule.projectKind, domainHint: rule.domainHint } : { projectKind: "mixed", domainHint: "generic" };
}

function referenceModeFor(needsLayoutVariants: boolean, needsImageDirections: boolean): AssetProfile["referenceMode"] {
  if (needsLayoutVariants && needsImageDirections) return "both";
  if (needsLayoutVariants) return "layout";
  if (needsImageDirections) return "image";
  return "none";
}

export function buildAssetProfile(input: { assetType?: string }): AssetProfile {
  const assetType = input.assetType || "other";
  const { projectKind, domainHint } = classifyAssetType(assetType);
  const needsLayoutVariants = projectKind === "ui" || projectKind === "mixed";
  const needsImageDirections = projectKind === "visual" || projectKind === "mixed";

  return {
    assetType,
    projectKind,
    needsLayoutVariants,
    needsImageDirections,
    referenceMode: referenceModeFor(needsLayoutVariants, needsImageDirections),
    domainHint,
  };
}
