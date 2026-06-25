# US Grid Explorer

Interactive infrastructure intelligence for the U.S. power grid, data centers, transmission corridors, regional grid signals, and public-source development pressure.

[Live site](https://usgridexplorer.com) | [Data sources](docs/DATA_SOURCES.md) | [Attribution](ATTRIBUTION.md)

![US Grid Explorer nationwide map](docs/assets/us-grid-explorer-map.png)

## What I Built

- Nationwide React + Leaflet infrastructure map with power plants, data centers, transmission lines, substations, fuel filters, search, and feature detail panels.
- Data pipelines that normalize EIA power-plant records, OpenStreetMap data-center records, state summaries, fuel directories, grid-region pages, glossary pages, and SEO landing pages.
- Live-adjacent grid and policy views, including EIA-930 grid signals and a Federal Register-powered data-center watch feed.
- Recruiter- and public-facing trust surfaces: data source notes, coverage warnings, correction workflow, confidence labels, sitemap, and custom production domain.
- Performance-minded map defaults that reduce first-render marker load while keeping high-value infrastructure categories easy to reveal.
- CI-ready validation script that checks required fields, coordinates, source references, duplicate IDs, and state codes before deployment.

## Screenshots

![Data Center Watch page](docs/assets/data-center-watch.png)

![State rankings hub](docs/assets/state-rankings.png)

## Architecture

```mermaid
flowchart LR
  User["User / recruiter / researcher"] --> Browser["React SPA on Vercel"]
  Browser --> Map["Leaflet map + view panels"]
  Browser --> StaticData["Static JSON datasets in public/data"]
  Browser --> Serverless["Vercel serverless functions"]
  Serverless --> FederalRegister["Federal Register API"]
  BuildScripts["Node data/page generators"] --> StaticData
  BuildScripts --> Pages["Static SEO pages"]
  Validation["Data validation script"] --> StaticData
  Validation --> CI["GitHub Actions CI"]
  CI --> Vercel["Vercel production deploy"]
```

## Data Flow

```mermaid
flowchart TD
  Sources["Authoritative and public sources"] --> Normalize["Normalize into app-ready records"]
  Normalize --> Validate["Validate IDs, coordinates, states, and source refs"]
  Validate --> PublicData["Write public/data JSON"]
  PublicData --> App["Map, directories, rankings, profiles, and reports"]
  App --> Feedback["Corrections and source-confidence notes"]
```

## Data Sources

Core sources include:

- U.S. Energy Information Administration Form EIA-860 for power plants.
- U.S. Energy Information Administration EIA-930 for hourly balancing-authority demand.
- OpenStreetMap contributors for community-reported data-center features.
- Federal Register API for public notices related to data-center, energy, permitting, and grid infrastructure.
- Public ArcGIS services for transmission and substation layers.

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) and [ATTRIBUTION.md](ATTRIBUTION.md) for source details, licenses, caveats, and refresh notes.

## Tech Stack

- React 19, Vite, Leaflet, React Leaflet, Recharts, Lucide icons
- Node.js scripts for static page and data generation
- Vercel hosting, Vercel serverless functions, Vercel Analytics
- GitHub Actions for build and data validation

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

## Quality Checks

```powershell
npm.cmd run validate:data
npm.cmd run build
```

The validation script checks required fields, point coordinates, source metadata, duplicate IDs, source references, and invalid U.S. state or territory codes.

## Production

Production is deployed on Vercel at [usgridexplorer.com](https://usgridexplorer.com). Every push to `main` runs GitHub Actions and triggers a Vercel deployment.

## Roadmap

- Automated source refresh workflows with visible last-checked dates.
- More state and regional editorial pages for high-intent search traffic.
- Expanded correction review flow and source confidence scoring.
- Optional AI guide activation after API billing is intentionally enabled.
