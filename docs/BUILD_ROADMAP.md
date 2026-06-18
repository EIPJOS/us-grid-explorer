# Virginia Grid Explorer Build Roadmap

The product is an original Virginia-focused grid exploration application. It follows the useful interaction patterns of modern infrastructure maps without copying another product's branding, text, proprietary data, or source code.

## Product Views

1. **Explore** - full-screen infrastructure map with search and layer controls.
2. **Dashboard** - metrics, charts, watchlist, and recent grid signals.
3. **Facilities** - searchable data center and power plant directory.
4. **Analysis** - county comparison, development timeline, and pressure scoring.
5. **Sources** - methodology, licensing, freshness, and source links.

## Map Layers

| Layer | Initial geography | Refresh target | Preferred source |
| --- | --- | --- | --- |
| Data centers | Virginia | Monthly/manual | County GIS, planning records, operator disclosures |
| Power plants | Virginia + nearby PJM | Monthly | EIA-860 / EIA APIs |
| Transmission lines | Virginia + nearby PJM | Quarterly | OpenStreetMap or licensed public GIS |
| Substations | Virginia | Quarterly | OpenStreetMap or county/public GIS |
| County boundaries | Virginia | Annual | U.S. Census TIGER/Line |
| Interconnection queue | PJM | Monthly | PJM queue data |
| Grid load and generation | Dominion/PJM | Hourly | EIA-930 and PJM |
| Weather alerts | Virginia | Minutes | National Weather Service API |

## Delivery Stages

### Stage 1: Data foundation

- Common feature schema and source metadata
- Verified Loudoun and Prince William data center inventory
- Data validation script
- Freshness and confidence labels

### Stage 2: Explore map

- React application shell
- Full-screen Leaflet map
- Search, layer controls, counts, and detail drawer
- URL state for selected layers and facilities

### Stage 3: Grid infrastructure

- EIA power plants
- Transmission and substation GeoJSON
- Fuel filters and infrastructure legends

### Stage 4: Live signals

- Server-side proxy for EIA/PJM credentials
- Current load, generation mix, and price snapshots
- Error, stale-data, and last-updated states

### Stage 5: Analysis

- County comparisons
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
- Public pages must disclose approximate coordinates and modeled values.
- Live widgets must show their source timestamp, not only the browser time.
- A failed API must produce a visible stale/error state rather than fabricated data.
