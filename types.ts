export type ProjectKind = "ui" | "visual" | "mixed";

export type AssetProfile = {
  /** Raw Gemini-provided or fallback-detected assetType string, kept for display only. */
  assetType: string;
  projectKind: ProjectKind;
  needsLayoutVariants: boolean;
  needsImageDirections: boolean;
  referenceMode: "layout" | "image" | "both" | "none";
  domainHint: "dashboard-ops" | "marketing-web" | "document" | "mobile-app" | "keyvisual" | "generic";
};

export type ProjectIntent = {
  title: string;
  description: string;
  domain: string;
  target: string;
  tags: string[];
};

export type Mood = {
  title: string;
  desc: string;
  colors: string[];
  keywords: string[];
};

/** Closed enum: app/page.tsx statically dispatches a preview component per value. */
export type LayoutStructure =
  | "command-center"
  | "map-centric"
  | "kpi-wall"
  | "incident-focused"
  | "split-monitoring"
  | "generic-dashboard"
  | "generic-list"
  | "generic-detail"
  // Document/editorial structures (brochure, proposal, report, poster) — these render as
  // print/editorial layouts, not app screens, so they're kept distinct from the UI structures above.
  // Grouped by deliverable archetype (cover/toc/body/closing) — see
  // memory/project_deliverable-scoped-layouts.md for the full taxonomy and rationale.
  | "cover-logotype"
  | "cover-full-bleed"
  | "cover-minimal-text"
  | "numbered-list"
  | "timeline"
  | "card-grid"
  | "split-content"
  | "editorial-grid"
  | "page-spread"
  | "infographic-page"
  | "comparison-table"
  | "vision-statement"
  | "proposal-section"
  | "report-page"
  | "poster-layout";

export type LayoutModule = {
  id: string;
  label: string;
  weight: "primary" | "secondary" | "support";
};

export type LayoutVariant = {
  id: string;
  structure: LayoutStructure;
  title: string;
  description: string;
  density: "compact" | "comfortable" | "spacious";
  modules: LayoutModule[];
  notes: string[];
};

export type UiDirection = {
  // layoutVariants live per-screenType (not a single direction-wide pool) so picking a
  // different Deliverable actually changes which structural candidates are offered, instead
  // of every Deliverable sharing one generic set. See memory/project_deliverable-scoped-layouts.md.
  screenTypes: Array<{
    icon: string;
    name: string;
    count: number;
    desc: string;
    layoutVariants: LayoutVariant[];
  }>;
};

export type ImageDirection = {
  id: string;
  title: string;
  styleNotes: string;
  /** Indexes into VisualDirection.promptSeeds/promptSeedsKo that belong to this image direction. */
  promptSeedIndexes: number[];
  stockQueries: string[];
};

export type VisualDirection = {
  /** Flat, English. Kept as a plain string[] so an external KPI scanner can grep it for masking compliance. */
  promptSeeds: string[];
  /** Same order/count as promptSeeds. */
  promptSeedsKo: string[];
  imageDirections: ImageDirection[];
  themeRecommendation: {
    preferred: "light" | "dark" | "both";
    reason: string;
    alternatives: string[];
  };
};

export type ReferenceQuery = {
  /** Key into lib/references.ts PLATFORMS. */
  platform: string;
  keywords: string[];
};

export type DesignDirection = {
  id: string;
  label: string;
  appliesTo: string;
  /** Indexes into GeneratorAnalysis.moods this direction applies to. Usually [0,1,2] (all moods). */
  moodIndexes: number[];
  ui?: UiDirection;
  visual?: VisualDirection;
  references: ReferenceQuery[];
};

export type GeneratorAnalysis = {
  projectIntent: ProjectIntent;
  assetProfile: AssetProfile;
  directions: DesignDirection[];
  palette: Array<{
    name: string;
    hex: string;
    role: string;
  }>;
  moods: Mood[];
  keywordGroups: {
    deliverable: string[];
    colorMood: string[];
    design: string[];
    domain: string[];
  };
};

export type ReferenceGroup = {
  name: string;
  note: string;
  siteUrl: string;
  searchable: boolean;
  purpose: "layout" | "image" | "both";
  items: Array<{
    label: string;
    url: string;
  }>;
};

export type AnalysisSource = "gemini" | "fallback";

export type AnalyzeResponse = {
  analysis: GeneratorAnalysis;
  extractedTextLength: number;
  /** Masked text (see lib/promptMasking.ts) — never the raw uploaded document text. */
  documentText: string;
  analysisSource: AnalysisSource;
};

export type RegenerateMoodsResponse = {
  palette: GeneratorAnalysis["palette"];
  moods: GeneratorAnalysis["moods"];
};

export type RegenerateMoodsApiResponse = RegenerateMoodsResponse & {
  source: AnalysisSource;
};

export type MoodImageProvider = "Pexels" | "Unsplash";

export type MoodImage = {
  src: string;
  link: string;
  credit: string;
  query: string;
  provider: MoodImageProvider;
  description?: string;
};

export type MoodImagesResponse = {
  images: MoodImage[];
  queries: string[];
  providers: MoodImageProvider[];
};
