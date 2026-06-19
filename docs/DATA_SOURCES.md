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

## Transmission Lines

- Dataset: Electric Power Transmission Lines
- Source: https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0
- Checked: 2026-06-18
- Coverage: 52,244 national line segments
- Delivery: viewport queries through the public ArcGIS FeatureServer

The map requests only lines intersecting the visible map area. At national zoom it displays 345 kV and higher; 230 kV and lower-voltage lines appear progressively as the user zooms in. The public service limits each request to 2,000 records, so dense local views may be incomplete. Ownership, voltage, status, and endpoints may be missing or inferred in the source data.

## Substations

- Publisher: HIFLD / Oak Ridge National Laboratory and partner agencies
- Dataset: HIFLD Substations 1/9/2025
- Source: https://www.arcgis.com/home/item.html?id=83397b209bfb4007a2f4c00e70df8e5d
- Checked: 2026-06-18
- Coverage: 77,946 points
- Delivery: viewport queries through the public ArcGIS FeatureServer

The source primarily represents transmission-associated substations at 69 kV and above, although some lower-voltage facilities are included. Lower-voltage coverage is not complete. The map progressively reveals substations by maximum voltage as the user zooms and limits each viewport request to 2,000 features.
