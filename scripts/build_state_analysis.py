"""Build finalized EIA-860 state-level capacity and fuel summaries."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

from build_eia_power_plants import fuel_category, number, normalize_header, rows_as_dicts


SOURCE_PAGE = "https://www.eia.gov/electricity/data/eia860/"
SOURCE_DOWNLOAD = "https://www.eia.gov/electricity/data/eia860/xls/eia8602024.zip"


def state_record() -> dict[str, Any]:
    return {
        "plantCodes": set(),
        "operatingGenerators": 0,
        "proposedGenerators": 0,
        "operatingCapacityMw": 0.0,
        "proposedCapacityMw": 0.0,
        "capacityByFuelMw": defaultdict(float),
    }


def build_states(generator_path: Path):
    states = defaultdict(state_record)

    for sheet_name, proposed in (("Operable", False), ("Proposed", True)):
        for row in rows_as_dicts(generator_path, sheet_name):
            state = normalize_header(row.get("State")).upper()
            plant_code = row.get("Plant Code")
            if not state or plant_code in (None, ""):
                continue

            capacity = number(row.get("Nameplate Capacity (MW)"))
            record = states[state]
            record["plantCodes"].add(int(plant_code))

            if proposed:
                record["proposedGenerators"] += 1
                record["proposedCapacityMw"] += capacity
            else:
                record["operatingGenerators"] += 1
                record["operatingCapacityMw"] += capacity
                category = fuel_category(
                    normalize_header(row.get("Technology")),
                    normalize_header(row.get("Energy Source 1")),
                )
                record["capacityByFuelMw"][category] += capacity

    output = []
    for state, record in sorted(states.items()):
        output.append({
            "state": state,
            "plantCount": len(record["plantCodes"]),
            "operatingGenerators": record["operatingGenerators"],
            "proposedGenerators": record["proposedGenerators"],
            "operatingCapacityMw": round(record["operatingCapacityMw"], 1),
            "proposedCapacityMw": round(record["proposedCapacityMw"], 1),
            "capacityByFuelMw": {
                category: round(capacity, 1)
                for category, capacity in sorted(record["capacityByFuelMw"].items())
                if capacity > 0
            },
        })
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generator", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--checked-at", default=date.today().isoformat())
    args = parser.parse_args()

    states = build_states(args.generator)
    national = {
        "plantCount": sum(state["plantCount"] for state in states),
        "operatingGenerators": sum(state["operatingGenerators"] for state in states),
        "proposedGenerators": sum(state["proposedGenerators"] for state in states),
        "operatingCapacityMw": round(sum(state["operatingCapacityMw"] for state in states), 1),
        "proposedCapacityMw": round(sum(state["proposedCapacityMw"] for state in states), 1),
    }
    payload = {
        "meta": {
            "layer": "state_analysis",
            "release": "2024 Final",
            "releaseStatus": "final",
            "checkedAt": args.checked_at,
            "sourceUrl": SOURCE_PAGE,
            "downloadUrl": SOURCE_DOWNLOAD,
            "note": "Capacity totals use the finalized 2024 EIA-860 generator release.",
        },
        "national": national,
        "states": states,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(states)} state and territory summaries to {args.output}")


if __name__ == "__main__":
    main()
