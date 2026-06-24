# Reference Platform Keyword Audit

## Purpose

Reference links are auxiliary outputs of the generator. They should not reuse one generic keyword list across every platform. Each platform has a different retrieval model, content type, and practical use case, so generated keywords need to be translated into the vocabulary that works for that platform.

The issue observed with Behance is a good example:

- Weak query: `AI big data knowledge graph ontology brochure case study`
- Better Behance-style queries: `technology brochure design`, `corporate brochure design`, `editorial brochure layout`, `brand booklet design`

Pinterest can often handle broad mood and image phrases, but Behance is more project/portfolio oriented and tends to work better with design discipline, artifact type, and project-context terms.

## Current Implementation Summary

Primary implementation:

- `lib/references.ts`
  - Defines all platform configs, site URLs, search URL patterns, allowed platforms by `domainHint`, and default keywords by platform.
- `lib/generatorAnalysis.ts`
  - Prompts Gemini to return `referenceKeywordsByPlatform` per direction.
  - Normalizes Gemini output and merges it with local defaults via `resolveDirectionReferenceQueries`.
- `lib/assetProfile.ts`
  - Maps asset type to project kind and domain hint.

Current risk:

- Platform purpose is separated, but query quality rules are still loose.
- Gemini-provided keywords and local defaults are merged without platform-specific cleanup.
- Technical domain terms can be passed directly into creative platforms, especially Behance.
- Some platforms are enabled for a domain but receive keywords that do not match their native content type.

## Registered Platforms

The current platform list in `lib/references.ts` includes:

- Dribbble
- Behance
- Mobbin
- Pinterest
- Figma Community
- Google
- GDWEB
- Land-book
- Page Flows
- Brand New
- Awwwards
- Lapa Ninja
- DBDIC
- DBCUT
- AppShots
- UI Bowl
- World Brand Design
- Brand Archive
- BrandB
- Fonts in Use

## Platform Criteria

| Platform | Best for | Strong keyword pattern | Weak keyword pattern |
| --- | --- | --- | --- |
| Dribbble | UI shots, visual style, components | `dashboard UI`, `landing page`, `hero section`, `mobile app UI` | Long domain explanations, technical concept chains |
| Behance | Portfolio projects, brand systems, case studies, editorial work | `brand identity`, `brochure design`, `editorial layout`, `UX case study` | Long mixed queries like `AI big data ontology brochure case study` |
| Pinterest | Moodboards, visual inspiration, image direction | `technology moodboard`, `brochure inspiration`, `abstract background` | Exact UX flows or narrow product screen tasks |
| Figma Community | Templates, UI kits, components, reusable files | `dashboard UI kit`, `landing page template`, `component library` | `case study`, `moodboard inspiration` |
| Mobbin | Real product screens, UI elements, app/web flows | `login`, `checkout`, `settings`, `onboarding`, `dashboard screen` | Brochure, brand identity, abstract visual direction |
| Page Flows | User journeys and recorded screen flows | `onboarding flow`, `settings flow`, `checkout flow` | Single visual style, cover image, brand identity |
| Google | Real services, competitors, public websites | `AI company website`, `dashboard UI reference`, `competitor website` | Internal design jargon only |
| GDWEB | Korean corporate, campaign, event, and homepage references | `AI 홈페이지`, `기업 홈페이지`, `이벤트페이지` | English-only technical chains, app flow terms |
| Land-book | Website and landing page gallery | `AI landing page`, `SaaS website`, `software homepage` | App flows, brochure covers |
| Awwwards | Awarded creative websites and interactive web experiences | `corporate website`, `interactive website`, `agency website` | Admin dashboards, document artifacts |
| Lapa Ninja | Landing page archive and full-page website screenshots | `SaaS landing page`, `AI landing page`, `startup homepage` | Dashboard detail flows, print artifacts |
| DBDIC | Korean website layout and style references | `기업 홈페이지`, `GNB 구조`, `서비스 홈페이지` | Brochure, typography-only, app flow terms |
| DBCUT | Korean web design evaluation and selected websites | `홈페이지 리뉴얼`, `기업사이트`, `웹사이트 트렌드` | Mobile app screens, abstract backgrounds |
| AppShots | Mobile app screens | `login screen`, `profile setup`, `mobile onboarding` | Web landing, brochure, brand archives |
| UI Bowl | Korean mobile UI patterns and components | `탭 컴포넌트`, `카드 컴포넌트`, `폼 컴포넌트` | Brand, editorial, cover visual terms |
| Brand New | Brand identity reviews and rebrands | `rebrand`, `identity redesign`, `brand system` | UI kits, dashboards, user flows |
| BrandB | Korean CI/BI and brand design archive | `CI BI 디자인`, `브랜드 리뉴얼` | UX flows, screen components |
| World Brand Design | Brand, package, identity, and campaign work | `corporate branding`, `brand identity`, `packaging design` | Admin screens, app interaction flows |
| Brand Archive | Logos, art direction, brand applications | `technology brand`, `AI brands`, `art direction`, `brand application` | Detailed UX flows |
| Fonts in Use | Real typography usage examples | `editorial typography`, `report typography`, `brochure typography` | Technical domain terms alone |

## Asset-Type Guidelines

### Brochure / Proposal / Report

Recommended platform emphasis:

- Behance: `technology brochure design`, `corporate brochure design`, `editorial layout`, `brand booklet design`
- Pinterest: `brochure moodboard`, `technology abstract background`, `editorial design inspiration`
- Figma Community: `proposal template`, `presentation template`, `brochure layout template`
- Brand New: `identity redesign`, `brand system`
- Brand Archive: `technology brand`, `brand application`
- Fonts in Use: `editorial typography`, `corporate report typography`

Avoid:

- Mobbin and Page Flows unless the document also explicitly needs app/web UI.
- Long technical chains in Behance.

### Dashboard / Admin / Web App

Recommended platform emphasis:

- Mobbin: `dashboard screen`, `settings`, `analytics`, `account setup`
- Page Flows: `onboarding flow`, `settings flow`, `account setup flow`
- Dribbble: `dashboard UI`, `admin dashboard`, `data table UI`
- Figma Community: `dashboard UI kit`, `admin dashboard template`, `component library`
- Behance: `enterprise dashboard case study`, `product UX case study`

Avoid:

- Brand archive platforms unless the task also requires brand identity.
- Pinterest as the only source for detailed interaction structure.

### Landing / Website / Event Page

Recommended platform emphasis:

- Land-book: `AI landing page`, `SaaS website`, `software homepage`
- Lapa Ninja: `startup homepage`, `SaaS landing page`
- Awwwards: `interactive website`, `corporate website`
- GDWEB / DBDIC / DBCUT: Korean homepage and corporate website terms
- Dribbble: `landing page`, `hero section`
- Behance: `website case study`, `brand system`, `product storytelling website`

Avoid:

- Mobbin/Page Flows unless product flows are needed.

### Mobile App

Recommended platform emphasis:

- Mobbin: `onboarding`, `profile`, `settings`, `payment`, `subscription`
- Page Flows: `mobile onboarding flow`, `checkout flow`, `account setup flow`
- AppShots: `login screen`, `profile setup`, `mobile onboarding`
- UI Bowl: Korean component terms such as `탭 컴포넌트`, `카드 컴포넌트`
- Dribbble: `mobile app UI`, `profile screen`
- Figma Community: `mobile app UI kit`

Avoid:

- Website award platforms unless a marketing page is also needed.

### Brand / Key Visual / Cover Image

Recommended platform emphasis:

- Pinterest: mood, image, and key visual discovery
- Behance: brand visual case studies and campaign systems
- World Brand Design: brand identity and campaign work
- Brand Archive: logo, art direction, applications
- Brand New: rebrand and identity reviews
- Fonts in Use: typography references

Avoid:

- Mobbin/Page Flows unless the key visual is part of an app flow.

## Keyword Cleanup Rules To Consider

### 1. Technical Term Compression

Before sending keywords to design platforms, collapse long technical chains:

- `AI, big data, knowledge graph, ontology` -> `AI technology` or `data technology`
- `cybersecurity KPI automated measurement tool` -> `cybersecurity dashboard` or `security analytics`
- `smart city traffic CCTV incident response` -> `smart city operations` or `traffic control`

Use the full technical phrase only for Google-style discovery, not for creative galleries.

### 2. Platform Intent Translation

Convert the same project intent into platform-specific vocabulary:

- Behance: design discipline + artifact + case/project context
- Pinterest: mood + visual subject + inspiration/moodboard
- Figma Community: artifact + template/UI kit/component
- Mobbin/Page Flows: screen/flow/task name
- Brand platforms: identity/rebrand/art direction/application
- Fonts in Use: typography + artifact/use case

### 3. Query Length Limits

Suggested limits:

- Behance: 2-4 words, occasionally 5 if needed.
- Pinterest: 2-5 words.
- Mobbin/Page Flows: 1-3 task/screen words.
- Figma Community: 2-5 words including `template`, `UI kit`, or `component`.
- Google: can be longer, 3-7 words.

### 4. Case Study Term Usage

Use `case study` selectively:

- Good: UX/product/web/brand projects on Behance.
- Less useful: print brochure layout searches where `brochure design`, `editorial layout`, or `brand booklet` may work better.

### 5. Korean Platform Localization

For GDWEB, DBDIC, DBCUT, BrandB, and UI Bowl, use Korean search terms when possible:

- `기업 홈페이지`
- `서비스 홈페이지`
- `브랜드 리뉴얼`
- `CI BI 디자인`
- `탭 컴포넌트`

## Audit Plan

1. Collect sample outputs
   - Use at least one sample each for brochure, dashboard, landing page, mobile app, and brand/key visual.
   - Save the generated `references` arrays for each direction.

2. Score platform fit
   - For each generated keyword, classify as:
     - `good`: matches the platform's content model.
     - `okay`: usable but could be sharper.
     - `poor`: likely to produce irrelevant results.

3. Check platform coverage by asset type
   - Confirm that each asset type enables the right platforms.
   - Confirm irrelevant platforms are excluded or deprioritized.

4. Test real search result quality
   - Open 2-3 generated links per platform.
   - Record whether first-page results are relevant.
   - Pay special attention to Behance for document/technology cases.

5. Define platform keyword templates
   - Create template rules per platform and asset type.
   - Include domain compression and localization rules.

6. Decide implementation changes
   - Update Gemini prompt rules if the issue starts in model output.
   - Update `lib/references.ts` if local defaults are weak.
   - Add a post-processing cleanup function if merged keywords need normalization.

## Recommended Implementation Direction

Do not only tweak Behance manually. The more robust fix is a small platform keyword normalization layer:

1. Build domain compression helpers.
2. Build per-platform keyword builders.
3. Filter or rewrite Gemini keywords that violate platform rules.
4. Limit the number of keywords per platform to the best 2-3.
5. Keep Google broader and more literal than the creative platforms.

This keeps Gemini useful for project interpretation while preventing raw technical terms from leaking into platforms where design-language queries work better.

## Source Notes

Reference platform characteristics checked from:

- Behance: creative portfolio and project showcase platform.
- Pinterest: visual discovery, pins, boards, and guided search behavior.
- Dribbble: designer portfolio and design shot platform.
- Mobbin: real-world app/web screens, UI elements, and flows.
- Page Flows: real-world user flow examples and UX patterns.
- Land-book and Lapa Ninja: curated website and landing page galleries.
- Awwwards: awarded web design and digital experience platform.
- Brand Archive: logos, art direction, and brand applications.
- Fonts in Use: public archive of typography usage examples.

