# Data Sources

## Power Plants

- Publisher: U.S. Energy Information Administration
- Dataset: Form EIA-860 2025 Early Release
- Source: https://www.eia.gov/electricity/data/eia860/
- Download: https://www.eia.gov/electricity/data/eia860/xls/eia8602025ER.zip
- Checked: 2026-06-18
- Coverage: 15,813 plant records across 51 state/territory codes
- Refresh target: replace when EIA publishes the final 2025 release

The layer joins EIA Schedule 2 plant locations with Schedule 3 operable and proposed generators. Capacity and fuel categories are aggregated per individual plant for map display.

EIA states that the Early Release is preliminary, incompletely edited, and inappropriate for state or national aggregation. The application therefore uses it for individual plant exploration and does not present calculated national totals as official statistics.

## Data Centers

- Publisher: OpenStreetMap contributors
- Dataset: OpenStreetMap data-center tags via Overpass
- Source: https://www.openstreetmap.org/
- Checked: 2026-06-18
- Coverage: 1,592 community-reported U.S. features
- License: ODbL 1.0
- Refresh target: monthly

OpenStreetMap is community-maintained and incomplete. Missing facilities do not indicate that no data center exists in an area. Names, operators, addresses, status, and coordinates may be missing, approximate, duplicated, or outdated. The application does not estimate facility capacity where no public value is reported.

## Grid Signals

- Publisher: U.S. Energy Information Administration
- Dataset: EIA-930 Hourly Electric Grid Monitor, balancing-authority demand
- Source: https://www.eia.gov/electricity/gridmonitor/about
- Frequency: hourly
- Operators currently displayed: PJM, ERCOT, MISO, CAISO, NYISO, ISO-NE, and SPP

Demand values are preliminary hourly operating data reported by balancing authorities. The interface shows the source period and labels the unit as MWh during the reported hour. API failures produce a visible error state rather than cached or fabricated live values.
