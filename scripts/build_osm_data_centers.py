"""Convert an Overpass response into the US Grid Explorer data-center layer."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any


SOURCE_PAGE = "https://www.openstreetmap.org/"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def clean(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def coordinates(element: dict[str, Any]):
    if element["type"] == "node":
        return [element.get("lon"), element.get("lat")]
    center = element.get("center") or {}
    return [center.get("lon"), center.get("lat")]


def address(tags: dict[str, Any]) -> str:
    street = " ".join(
        value for value in (
            clean(tags.get("addr:housenumber")),
            clean(tags.get("addr:street")),
        ) if value
    )
    locality = ", ".join(
        value for value in (
            clean(tags.get("addr:city")),
            clean(tags.get("addr:state")),
            clean(tags.get("addr:postcode")),
        ) if value
    )
    return ", ".join(value for value in (street, locality) if value)


def status(tags: dict[str, Any]) -> str:
    if tags.get("construction") or tags.get("building") == "construction":
        return "under_construction"
    if tags.get("disused") == "yes" or tags.get("abandoned") == "yes":
        return "inactive"
    return "existing"


def build_features(raw: dict[str, Any]):
    features = []
    for element in raw.get("elements", []):
        point = coordinates(element)
        if len(point) != 2 or point[0] is None or point[1] is None:
            continue

        longitude, latitude = map(float, point)
        if not (-180 <= longitude <= -60 and 15 <= latitude <= 75):
            continue

        tags = element.get("tags") or {}
        osm_type = element["type"]
        osm_id = int(element["id"])
        name = clean(tags.get("name") or tags.get("operator") or "Unnamed data center")

        features.append({
            "id": f"osm-{osm_type}-{osm_id}",
            "type": "data_center",
            "name": name,
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude],
            },
            "properties": {
                "osmType": osm_type,
                "osmId": osm_id,
                "operator": clean(tags.get("operator")),
                "owner": clean(tags.get("owner")),
                "address": address(tags),
                "city": clean(tags.get("addr:city")),
                "state": clean(tags.get("addr:state")),
                "postcode": clean(tags.get("addr:postcode")),
                "website": clean(tags.get("website")),
                "status": status(tags),
                "startDate": clean(tags.get("start_date")),
                "clli": clean(tags.get("clli")),
                "coverage": "community_reported",
                "capacityMw": None,
            },
            "sourceRef": "openstreetmap-overpass",
        })

    return sorted(features, key=lambda feature: feature["id"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--checked-at", default=date.today().isoformat())
    args = parser.parse_args()

    raw = json.loads(args.input.read_text(encoding="utf-8"))
    features = build_features(raw)
    named_count = sum(feature["name"] != "Unnamed data center" for feature in features)
    operator_count = sum(bool(feature["properties"]["operator"]) for feature in features)
    payload = {
        "meta": {
            "layer": "data_centers",
            "recordCount": len(features),
            "namedCount": named_count,
            "operatorCount": operator_count,
            "coverage": "United States features reported in OpenStreetMap",
            "coverageStatus": "incomplete",
            "checkedAt": args.checked_at,
            "sourceUrl": SOURCE_PAGE,
            "coverageWarning": (
                "OpenStreetMap is community-maintained. Missing facilities do not "
                "indicate that no data center exists in an area."
            ),
            "sources": {
                "openstreetmap-overpass": {
                    "publisher": "OpenStreetMap contributors",
                    "dataset": "OpenStreetMap data-center tags via Overpass",
                    "url": SOURCE_PAGE,
                    "downloadUrl": OVERPASS_URL,
                    "checkedAt": args.checked_at,
                    "confidence": "community_reported",
                    "cadence": "monthly",
                    "license": "ODbL 1.0",
                    "note": (
                        "Community-reported and incomplete. Facility attributes may "
                        "be missing, approximate, duplicated, or outdated."
                    ),
                }
            },
        },
        "features": features,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=True),
        encoding="utf-8",
    )
    print(f"Wrote {len(features):,} data centers to {args.output}")


if __name__ == "__main__":
    main()
