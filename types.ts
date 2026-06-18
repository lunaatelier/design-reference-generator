export type ReferencePurposeValue = "ui-reference" | "image-reference";

export type ReferencePurpose = {
  value: ReferencePurposeValue;
  label: string;
  reason: string;
};

export type GeneratorAnalysis = {
  project: {
    title: string;
    description: string;
    domain: string;
    target: string;
    assetType: string;
    tags: string[];
  };
  referencePurpose: ReferencePurpose;
  referencePurposes: ReferencePurpose[];
  referenceNeeds: {
    layout: boolean;
    image: boolean;
    reason: string;
  };
  themeRecommendation: {
    preferred: "light" | "dark" | "both";
    reason: string;
    alternatives: string[];
  };
  referencePlan: string[];
  screenTypes: Array<{
    icon: string;
    name: string;
    count: number;
    desc: string;
  }>;
  directions: string[];
  palette: Array<{
    name: string;
    hex: string;
    role: string;
  }>;
  moods: Array<{
    title: string;
    desc: string;
    colors: string[];
    keywords: string[];
  }>;
  keywordGroups: {
    deliverable: string[];
    colorMood: string[];
    design: string[];
    domain: string[];
  };
  referenceKeywords: string[];
  platformKeywords: Record<string, string[]>;
  imageKeywords: string[];
  imagePrompts: string[];
  references: ReferenceGroup[];
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
};

export type MoodImagesResponse = {
  images: MoodImage[];
  query: string;
  providers: MoodImageProvider[];
};
