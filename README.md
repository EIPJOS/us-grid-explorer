# US Grid Explorer

An original nationwide infrastructure intelligence application for exploring data centers, power plants, transmission, substations, grid regions, market signals, and development pressure across the United States.

## Status

V2 is under active development. Virginia is the first validated regional dataset, not the product boundary. National layers will come from authoritative federal and grid-operator sources, while data center records will expand state by state with explicit coverage and confidence labels.

## Current Views

- Explore: full-screen national infrastructure map with plants, data centers, transmission, substations, and geographic search
- Facilities: searchable, filterable infrastructure directory
- Grid Signals: live EIA-930 hourly demand for seven major grid operators
- Analysis: finalized state capacity, fuel mix, and facility comparisons
- Learn: six interactive lessons, data stories, and map onboarding
- Grid Guide: sourced OpenAI assistant with selected-feature context and optional map actions

## Planned Work

- Automated data refresh workflows
- Outage and weather-risk layers
- URL-based routing and shareable selections
- Expanded tests, accessibility, and monitoring

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
```

## Production Build

```powershell
npm.cmd run build
```

See `docs/BUILD_ROADMAP.md` for the staged delivery plan.
