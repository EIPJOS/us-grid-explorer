# US Grid Explorer Build Roadmap

The product is an original nationwide grid exploration application. It follows useful infrastructure-map interaction patterns without copying another product's branding, text, proprietary data, or source code.

Virginia is the first validated regional slice. Nationwide infrastructure layers can be loaded from federal and open sources, while data center coverage expands state by state and is disclosed clearly in the interface.

## Product Views

1. **Explore** - full-screen infrastructure map with search and layer controls.
2. **Dashboard** - national and regional metrics, charts, and grid signals.
3. **Facilities** - searchable data center and power plant directory.
4. **Analysis** - state, county, and grid-region comparisons and pressure scoring.
5. **Sources** - methodology, licensing, coverage, freshness, and source links.

## Map Layers

| Layer | Initial geography | Refresh target | Preferred source |
| --- | --- | --- | --- |
| Data centers | Nationwide, progressive coverage | Monthly/manual | County GIS, planning records, operator disclosures |
| Power plants | Nationwide | Monthly | EIA-860 / EIA APIs |
| Transmission lines | Nationwide | Quarterly | OpenStreetMap or licensed public GIS |
| Substations | Nationwide | Quarterly | OpenStreetMap or public GIS |
| State/county boundaries | Nationwide | Annual | U.S. Census TIGER/Line |
| Interconnection queues | ISO/RTO regions | Monthly | PJM, ERCOT, CAISO, MISO, SPP, NYISO, ISO-NE |
| Grid load and generation | Balancing-authority regions | Hourly | EIA-930 and ISO/RTO feeds |
| Weather alerts | Nationwide | Minutes | National Weather Service API |

## Delivery Stages

### Stage 1: Data foundation

- Common feature schema and source metadata
- Coverage-aware national data center catalog, beginning with Virginia
- Data validation script
- Freshness and confidence labels

### Stage 2: Explore map

- React application shell
- Full-screen Leaflet map centered on the continental United States
- Search, layer controls, counts, and detail drawer
- URL state for selected layers and facilities

### Stage 3: Grid infrastructure

- Nationwide EIA power plants
- Transmission and substation GeoJSON
- Fuel filters and infrastructure legends

### Stage 4: Live signals

- Server-side proxy for EIA and ISO/RTO credentials
- Current load, generation mix, and price snapshots
- Error, stale-data, and last-updated states

### Stage 5: Analysis

- State, county, and grid-region comparisons
- Development timeline
- Transparent pressure-score methodology
- Exportable filtered dataset

### Stage 6: Grid guide

- Sourced question answering over the local dataset
- Suggested questions based on selected map area
- Answers link back to facilities and source records

## Quality Rules

- Never present estimated capacity or location as verified fact.
- Every record must include a source URL and last-checked date.
- Public pages must disclose incomplete coverage and modeled values.
- Live widgets must show their source timestamp, not only browser time.
- A failed API must produce a visible stale/error state rather than fabricated data.
