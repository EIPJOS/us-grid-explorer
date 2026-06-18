"""Fetch community-reported US data centers from OpenStreetMap Overpass."""

from __future__ import annotations

import argparse
import urllib.parse
import urllib.request
from pathlib import Path


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:240];
area["ISO3166-1"="US"][admin_level=2]->.us;
(
  nwr["telecom"="data_center"](area.us);
  nwr["telecom"="data_centre"](area.us);
  nwr["man_made"="data_center"](area.us);
  nwr["man_made"="data_centre"](area.us);
  nwr["building"="data_center"](area.us);
  nwr["building"="data_centre"](area.us);
);
out center tags;
""".strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    request = urllib.request.Request(
        OVERPASS_URL,
        data=urllib.parse.urlencode({"data": QUERY}).encode("ascii"),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "USGridExplorer/0.1 (public infrastructure research)",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        payload = response.read()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(payload)
    print(f"Wrote {len(payload):,} bytes to {args.output}")


if __name__ == "__main__":
    main()
