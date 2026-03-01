# Reality of India - Codebase Information

## 1. Project Summary
- Name: `reality-of-india`
- Type: React + TypeScript + Vite single-page app
- Primary feature: Interactive India map (state and district selection) with layered visual overlays and live evaluation indicators.
- Map engine: Leaflet (canvas renderer).
- Deployment target: GitHub Pages (`base` path is `/reality-of-india/`).

## 2. Tech Stack and Tooling
- Runtime UI: React 19
- Language: TypeScript (strict mode)
- Bundler: Vite 7
- Map library: Leaflet
- Icons: react-icons
- Linting: ESLint + typescript-eslint + react-hooks plugin

### Important config
- `vite.config.ts`
  - Uses `@vitejs/plugin-react`
  - `base` path from `app.config.ts`
  - Build output: `dist`
- `tsconfig.app.json`
  - Strict typing enabled
  - `noUnusedLocals` and `noUnusedParameters` enabled
- `eslint.config.js`
  - Lints `ts`/`tsx`
  - Ignores `dist`

## 3. Top-Level App Flow
1. `src/main.tsx` mounts `<App />` into `#root`.
2. `App.tsx` wraps content with:
   - `ErrorBoundary`
   - `DataLoadingProvider`
3. `AppContent` coordinates:
   - Selection state (`useSelectionState`)
   - Side panel open/close state (`usePanelState`)
   - Global loading/error/theme mode from `DataLoadingContext`
   - Search modal state
4. Main UI layout:
   - Header (search, panel toggle, dark/light toggle)
   - `NodeNetworks` overlay container
   - `MapView` (Leaflet map)
   - `CanvasMiniMap` (secondary canvas preview)
   - `SidePanel`
   - `SearchModal`

## 4. State Model
### Global/context state (`DataLoadingContext`)
- `isLoading`: map/data load status
- `error`: top error banner message
- `isDarkMode`: controls basemap tiles

### Selection state (`useSelectionState`)
- `selectedState: string | null`
- `selectedDistrict: string | null`
- `selectedStateName: string | null`

Actions:
- `handleStateSelect(state)` sets state, clears district
- `handleDistrictSelect(district, state)` sets both
- `handleReset()` clears all selection

### UI local state
- Side panel open/close (`usePanelState`)
- Search modal open/close in `AppContent`
- Search input/dropdown state in `SidePanel`
- Search input/results state in `SearchModal`

## 5. Data Sources
### GeoJSON sources (`src/services/dataService.ts`)
- States: `https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson`
- Districts: `https://projects.datameet.org/maps/data/geojson/dists11.geojson`
- India boundary: `https://raw.githubusercontent.com/yashshukla0918/datasets/main/countries/India/maps/india_state.geojson`

### Evaluation sources (`src/services/evaluation`)
- World Bank API (`https://api.worldbank.org/v2`)
- OpenAQ API (`https://api.openaq.org/v2`)

Current provider registry (`providers.ts`):
- GDP per capita (PPP)
- Unemployment
- Gini
- Life expectancy
- Infant mortality
- Literacy rate
- Air quality index

## 6. Caching and Request Behavior
### Geo data cache (`dataService.ts`)
- In-memory singleton variables for states, districts, boundary
- Promise memoization prevents duplicate concurrent fetches
- Districts grouped by state, with duplicate district guard (`state::district` key)

### Evaluation cache (`services/evaluation/services.ts`)
- In-memory cache key: `state::district` (normalized lowercase)
- TTL: 30 minutes
- Inflight dedupe map avoids duplicate concurrent requests
- Cache entry includes:
  - evaluation data
  - source names
  - timestamp

## 7. Map Rendering Flow
### `MapView.tsx`
Composes four hooks:
1. `useMapInitialization`
   - Creates Leaflet map once
   - Canvas renderer, zoom limits, attribution off
   - Dark/light Carto basemap switch based on `isDarkMode`
2. `useIndiaBoundary`
   - Loads India boundary GeoJSON
   - Applies style updates based on selection depth
3. `useStateLayer`
   - Loads state layers
   - Hover, click handlers
   - Selected-state styling
   - Fits map bounds to selected state
4. `useDistrictLayer`
   - Lazy loads districts for selected state
   - Hover/click handlers
   - Selected-district styling
   - Fits map bounds to selected district

### Styling behavior
- No selection: neutral subtle layers
- State selected: highlighted state
- District selected: district strongly highlighted, state toned down

## 8. Search Flow
### Shared data hook: `useSearchData(searchValue)`
- Loads states + districts once
- Flattens into mixed list of `SearchItem` (`state` or `district`)
- Uses 100ms debounce for filtering

### `SidePanel`
- Inline search dropdown
- Click outside closes dropdown
- Reset button clears selection

### `SearchModal`
- Global shortcut from `App.tsx`: Ctrl/Cmd + F
- Enter key chooses first result
- Clicking result selects state/district and closes modal

## 9. Node Network Overlay Flow
### Component: `src/components/NodeNetworks/NodeNetworks.tsx`
Responsibilities:
- Calls `useDistrictEvaluation(selectedState, selectedDistrict)` for district-level live data
- For state-only mode, aggregates from evaluation cache (`getCachedEvaluationsByState`)
- Converts category scores into radial network nodes
- Displays indicator-level values per category node
- Uses `EvaluationReferenceIndex` for ordering categories and indicators
- Shows legend with data source information

### Rendering behavior
- Overlay only shows when a state is selected
- District mode:
  - One district's category nodes + indicators
- State mode:
  - Aggregated average scores from cached district evaluations only

Important implication:
- State-level network data appears only for districts that were previously fetched in district mode during the session.

## 10. Evaluation Pipeline Details
### 10.1 Fetch layer (`fetch.ts`)
- Common `fetchJSON` with abort timeout (10s)
- Typed responses for World Bank and OpenAQ
- Dedicated functions per indicator + generic `fetchWorldBankIndicator`

### 10.2 Provider layer (`providers.ts`)
- Central extension point for multiple APIs
- Each provider defines:
  - signal key
  - human label
  - source name
  - async fetch function

### 10.3 Fabrication/normalization (`fabricate.ts`)
- Converts raw signal values to normalized 0-100 scores (`normalizeMinMax`)
- No synthetic/random fallback values
- Indicators are only emitted when real source values exist
- Current produced categories:
  - Economic Stability
  - Healthcare & Public Health
  - Education & Human Capital

### 10.4 Service layer (`services.ts`)
- Calls all providers via `Promise.allSettled`
- Builds partial signal bag from fulfilled providers
- Aggregates source names used
- Returns `DistrictEvaluationResponse` with:
  - `data`
  - `error`
  - `stale`
  - `sources`

`stale` is true when provider failures happen (best-effort response).

## 11. Types
### Geo types (`src/types/geo.ts`)
- `StateFeature`
- `DistrictFeature`
- `SelectionState`

### Evaluation types (`src/types/evaluation.ts`)
- `EvaluationIndicator`
- `EvaluationCategory`
- `DistrictEvaluation`
- `EvaluationError`
- `DistrictEvaluationResponse`

## 12. Styling System
- Global styles: `src/index.css`, `src/App.css`
- Component-specific styles:
  - Search modal
  - Loading spinner
  - Error boundary
  - Canvas minimap
  - Node networks

Design direction observed:
- Dark-theme-first map shell
- Glassmorphism modal
- Strong use of gradients and glow for overlays
- Extensive responsive breakpoints for mobile and landscape

## 13. Error Handling Strategy
- Network/service errors are surfaced through `DataLoadingContext.error`
- App-level top bar offers `Retry` by full page reload
- React runtime errors caught by `ErrorBoundary`
- Several hooks log errors to console and also set context error

## 14. Build/Release Workflow
### Scripts in `package.json`
- `dev`, `build`, `preview`
- Release helpers:
  - `release:patch/minor/major`
  - `version-build`
  - `deploy`, `gh-pages-deploy`

### `scripts/release.js`
- Enforces clean working tree
- Builds app
- Creates orphan `vX.X.X` branch
- Copies `dist` contents to root of release branch
- Commits and pushes release branch
- Returns to `main`
- Cleans working directory

### `scripts/version-build.js`
- Builds app
- Stores build snapshot in `dist-versions/vX.X.X`

## 15. Observed Gaps and Risks
1. `src/index.css` includes Vite default theme styles (`color-scheme: light dark`) that may conflict with app-specific styles in `App.css`.
2. `useMap.ts` exists but is not used by current composition (`useMapInitialization` is used instead).
3. `useCanvasPanelState.ts` is currently unused.
4. `NodeNetworks` state-mode aggregation depends on cached district evaluations, so a freshly selected state can show no network data until at least one district is fetched.
5. `SearchModal.tsx` defines `modalRef` but does not use it functionally.
6. `evaluation-enum-indicator.ts` defines full taxonomy, but live evaluation currently fills only a subset of categories/indicators.
7. `any` usage remains in map geometry handling and some search mapping logic; strict typing is partially bypassed.
8. `Error` handling often resorts to full page reload instead of retrying failed requests selectively.

## 16. Suggested Next Refactor Targets
1. Unify map style constants (colors, weights) into a central config file.
2. Remove dead hooks (`useMap`, `useCanvasPanelState`) if intentionally unused.
3. Replace `any` geometry handling with stricter GeoJSON types.
4. Add persistent evaluation store for state aggregates (not only in-memory cache).
5. Expand provider set to cover more `EvaluationReferenceIndex` categories.
6. Introduce test coverage for:
   - provider normalization
   - cache TTL/inflight behavior
   - selection-to-map-layer transitions

## 17. File-by-File Responsibility Index
- `src/App.tsx`: top-level composition and global UI controls
- `src/components/MapView/MapView.tsx`: map + layer hook composition
- `src/hooks/useMapInitialization.ts`: map creation + basemap switching
- `src/hooks/useIndiaBoundary.ts`: India outline layer
- `src/hooks/useStateLayer.ts`: state polygons interactions
- `src/hooks/useDistrictLayer.ts`: district polygons interactions
- `src/services/dataService.ts`: geo data fetch/caching/selectors
- `src/components/SidePanel/SidePanel.tsx`: side drawer search/reset
- `src/components/SearchModal/SearchModal.tsx`: quick-search modal
- `src/hooks/useSearchData.ts`: search data load/filter pipeline
- `src/components/CanvasMiniMap/CanvasMiniMap.tsx`: canvas snapshot map for selected region
- `src/components/NodeNetworks/NodeNetworks.tsx`: radial evaluation overlay
- `src/services/evaluation/fetch.ts`: HTTP fetch utilities for evaluation sources
- `src/services/evaluation/providers.ts`: multi-source provider registry
- `src/services/evaluation/fabricate.ts`: signal-to-score/category transformation
- `src/services/evaluation/services.ts`: orchestration, caching, hook
- `src/types/geo.ts`: map domain types
- `src/types/evaluation.ts`: evaluation domain types

## 18. Practical Runtime Sequence (Typical User Path)
1. App loads -> spinner shown.
2. Map initializes with India boundary + state layers.
3. User selects a state -> state highlighted, district layer loads.
4. User selects a district -> district highlighted + map zooms in.
5. Node network triggers district evaluation fetch from API providers.
6. Evaluation response normalized and rendered as radial category nodes + indicator rows.
7. Source label in legend shows live providers used.
8. User toggles light/dark -> basemap URL updated in-place.
9. User resets -> map returns to unselected overview state.

## 19. Current Knowledge Limits
- No backend service in this repository; all data access is client-side fetch.
- Evaluation API correctness and rate limits depend on third-party endpoints (World Bank/OpenAQ).
- Session cache is in-memory only and resets on page refresh.
