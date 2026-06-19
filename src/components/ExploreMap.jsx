import { useEffect, useRef } from "react";
import L from "leaflet";

export const FUEL_COLORS = {
  oil_gas: "#ff6257",
  coal: "#8d99ae",
  nuclear: "#ffd84d",
  wind: "#86a8ff",
  solar: "#ffbe3d",
  hydro: "#4cc9f0",
  storage: "#bd80ff",
  biomass: "#69e2ae",
  geothermal: "#ff925c",
  other: "#c0c7d3"
};

const CONUS_BOUNDS = L.latLngBounds([24.3, -125.2], [49.8, -66.5]);
const TRANSMISSION_SERVICE = "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query";
const SUBSTATION_SERVICE = "https://services6.arcgis.com/OO2s4OoyCZkYJ6oE/arcgis/rest/services/Substations/FeatureServer/0/query";

export default function ExploreMap({
  plants,
  dataCenters,
  fuelVisibility,
  showPowerPlants,
  showDataCenters,
  showTransmission,
  showSubstations,
  focusRequest,
  onSelect,
  onViewportChange
}) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const plantLayerRef = useRef(null);
  const dataCenterLayerRef = useRef(null);
  const transmissionLayerRef = useRef(null);
  const substationLayerRef = useRef(null);
  const canvasRendererRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !elementRef.current) return;

    const map = L.map(elementRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 3
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; <a href="https://carto.com/">CARTO</a>'
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.fitBounds(CONUS_BOUNDS, { padding: [18, 18] });
    map.createPane("transmissionPane");
    map.getPane("transmissionPane").style.zIndex = "330";
    map.createPane("substationPane");
    map.getPane("substationPane").style.zIndex = "360";
    mapRef.current = map;
    canvasRendererRef.current = L.canvas({ padding: 0.45 });
    transmissionLayerRef.current = L.geoJSON(null, { pane: "transmissionPane" }).addTo(map);
    substationLayerRef.current = L.geoJSON(null, {
      pane: "substationPane",
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, substationStyle(feature, map.getZoom()))
    }).addTo(map);
    plantLayerRef.current = L.layerGroup().addTo(map);
    dataCenterLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function reportViewport() {
      const bounds = map.getBounds();
      onViewportChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
      });
    }

    map.on("moveend", reportViewport);
    reportViewport();
    return () => map.off("moveend", reportViewport);
  }, [onViewportChange]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = transmissionLayerRef.current;
    if (!map || !layer) return;

    let controller = null;
    let timer = null;

    async function loadVisibleLines() {
      controller?.abort();
      controller = new AbortController();

      if (!showTransmission) {
        layer.clearLayers();
        return;
      }

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const minimumVoltage = zoom <= 4 ? 345 : zoom <= 6 ? 230 : zoom <= 8 ? 100 : 0;
      const where = minimumVoltage ? `VOLTAGE >= ${minimumVoltage}` : "1=1";
      const params = new URLSearchParams({
        where,
        geometry: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(","),
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outSR: "4326",
        outFields: "OBJECTID_1,ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,INFERRED,SOURCE,SOURCEDATE,SUB_1,SUB_2",
        returnGeometry: "true",
        resultRecordCount: "2000",
        f: "geojson"
      });

      try {
        const response = await fetch(`${TRANSMISSION_SERVICE}?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Transmission service returned ${response.status}`);
        const geojson = await response.json();
        layer.clearLayers();
        layer.addData(geojson);
        layer.setStyle((feature) => transmissionStyle(feature, zoom));
        layer.eachLayer((featureLayer) => {
          const feature = featureLayer.feature;
          if (!feature) return;
          featureLayer.bindTooltip(transmissionTooltip(feature.properties), { sticky: true, opacity: 0.96 });
          featureLayer.on("click", () => onSelect(normalizeTransmissionFeature(feature)));
        });
      } catch (error) {
        if (error.name !== "AbortError") console.warn(error.message);
      }
    }

    function scheduleLoad() {
      clearTimeout(timer);
      timer = setTimeout(loadVisibleLines, 180);
    }

    map.on("moveend zoomend", scheduleLoad);
    scheduleLoad();

    return () => {
      clearTimeout(timer);
      controller?.abort();
      map.off("moveend zoomend", scheduleLoad);
    };
  }, [showTransmission, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = substationLayerRef.current;
    if (!map || !layer) return;

    let controller = null;
    let timer = null;

    async function loadVisibleSubstations() {
      controller?.abort();
      controller = new AbortController();

      if (!showSubstations) {
        layer.clearLayers();
        return;
      }

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const minimumVoltage = zoom <= 4 ? 345 : zoom <= 6 ? 230 : zoom <= 8 ? 100 : 0;
      const where = minimumVoltage ? `MAX_VOLT >= ${minimumVoltage}` : "1=1";
      const params = new URLSearchParams({
        where,
        geometry: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(","),
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outSR: "4326",
        outFields: "OBJECTID,ID,NAME,CITY,STATE,TYPE,STATUS,COUNTY,SOURCE,SOURCEDATE,VAL_METHOD,VAL_DATE,LINES,MAX_VOLT,MIN_VOLT,MAX_INFER,MIN_INFER",
        returnGeometry: "true",
        resultRecordCount: "2000",
        f: "geojson"
      });

      try {
        const response = await fetch(`${SUBSTATION_SERVICE}?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Substation service returned ${response.status}`);
        const geojson = await response.json();
        layer.clearLayers();
        layer.addData(geojson);
        layer.eachLayer((featureLayer) => {
          const feature = featureLayer.feature;
          if (!feature) return;
          featureLayer.setStyle(substationStyle(feature, zoom));
          featureLayer.bindTooltip(substationTooltip(feature.properties), { direction: "top", opacity: 0.96 });
          featureLayer.on("click", () => onSelect(normalizeSubstationFeature(feature)));
        });
      } catch (error) {
        if (error.name !== "AbortError") console.warn(error.message);
      }
    }

    function scheduleLoad() {
      clearTimeout(timer);
      timer = setTimeout(loadVisibleSubstations, 180);
    }

    map.on("moveend zoomend", scheduleLoad);
    scheduleLoad();

    return () => {
      clearTimeout(timer);
      controller?.abort();
      map.off("moveend zoomend", scheduleLoad);
    };
  }, [showSubstations, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = plantLayerRef.current;
    const renderer = canvasRendererRef.current;
    if (!map || !layer || !renderer) return;

    layer.clearLayers();
    if (!showPowerPlants) return;

    plants.forEach((plant) => {
      const category = plant.properties.primaryFuel;
      if (!fuelVisibility[category]) return;

      const [longitude, latitude] = plant.geometry.coordinates;
      const capacity = plant.properties.operatingCapacityMw;
      const radius = Math.max(3, Math.min(10, 3 + Math.log10(capacity + 1) * 1.7));
      const marker = L.circleMarker([latitude, longitude], {
        renderer,
        radius,
        color: "rgba(255,255,255,0.7)",
        weight: 0.7,
        fillColor: FUEL_COLORS[category] ?? FUEL_COLORS.other,
        fillOpacity: 0.82
      });

      marker.bindTooltip(
        `<strong>${escapeHtml(plant.name)}</strong><br>${capacity.toLocaleString()} MW`,
        { direction: "top", opacity: 0.96 }
      );
      marker.on("click", () => onSelect({ type: "power_plant", feature: plant }));
      marker.addTo(layer);
    });
  }, [plants, fuelVisibility, showPowerPlants, onSelect]);

  useEffect(() => {
    const layer = dataCenterLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showDataCenters) return;

    dataCenters.forEach((center) => {
      const [longitude, latitude] = center.geometry.coordinates;
      const marker = L.circleMarker([latitude, longitude], {
        renderer: canvasRendererRef.current,
        radius: 5.5,
        color: "#f1ff9b",
        weight: 1.2,
        fillColor: "#dfff3f",
        fillOpacity: 0.78
      });
      const operator = center.properties.operator;
      marker.bindTooltip(
        `<strong>${escapeHtml(center.name)}</strong><br>${escapeHtml(operator || "Community-reported data center")}`
      );
      marker.on("click", () => onSelect({ type: "data_center", feature: center }));
      marker.addTo(layer);
    });
  }, [dataCenters, showDataCenters, onSelect]);

  useEffect(() => {
    if (!focusRequest || !mapRef.current) return;
    const [longitude, latitude] = focusRequest.coordinates;
    mapRef.current.flyTo([latitude, longitude], 10, { duration: 0.9 });
  }, [focusRequest]);

  return <div ref={elementRef} className="map-root" aria-label="United States grid map" />;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function transmissionStyle(feature, zoom) {
  const voltage = Number(feature?.properties?.VOLTAGE) || 0;
  return {
    pane: "transmissionPane",
    color: voltage >= 500 ? "#ff6b66" : voltage >= 345 ? "#8ba8ff" : voltage >= 230 ? "#6288ea" : "#4168bd",
    weight: voltage >= 500 ? 2.4 : voltage >= 345 ? 1.9 : voltage >= 230 ? 1.5 : 1.1,
    opacity: zoom <= 5 ? 0.68 : 0.8
  };
}

function transmissionTooltip(properties) {
  const voltage = Number(properties.VOLTAGE) || 0;
  const owner = escapeHtml(properties.OWNER || "Owner not reported");
  return `<strong>${voltage ? `${voltage.toLocaleString()} kV` : "Voltage not reported"}</strong><br>${owner}`;
}

function normalizeTransmissionFeature(feature) {
  const properties = feature.properties ?? {};
  const voltage = Number(properties.VOLTAGE) || 0;
  return {
    type: "transmission_line",
    feature: {
      id: `transmission-${properties.OBJECTID_1 ?? properties.ID}`,
      type: "transmission_line",
      name: voltage ? `${voltage.toLocaleString()} kV transmission line` : "Transmission line",
      geometry: feature.geometry,
      properties: {
        owner: properties.OWNER || "",
        status: properties.STATUS || "",
        voltage,
        voltageClass: properties.VOLT_CLASS || "",
        inferred: properties.INFERRED || "",
        sourceName: properties.SOURCE || "",
        sourceDate: properties.SOURCEDATE || "",
        substationFrom: properties.SUB_1 || "",
        substationTo: properties.SUB_2 || ""
      },
      sourceRef: "national-transmission-lines"
    }
  };
}

function substationStyle(feature, zoom) {
  const voltage = Number(feature?.properties?.MAX_VOLT) || 0;
  return {
    pane: "substationPane",
    radius: zoom <= 5 ? 2.2 : zoom <= 8 ? 3 : 4,
    color: voltage >= 500 ? "#ffd84d" : "#75d5ff",
    weight: 0.8,
    fillColor: voltage >= 500 ? "#ffd84d" : "#75d5ff",
    fillOpacity: 0.82
  };
}

function substationTooltip(properties) {
  const name = escapeHtml(substationName(properties.NAME));
  const voltage = Number(properties.MAX_VOLT) || 0;
  return `<strong>${name}</strong><br>${voltage ? `${voltage.toLocaleString()} kV maximum` : "Voltage not reported"}`;
}

function normalizeSubstationFeature(feature) {
  const properties = feature.properties ?? {};
  const name = substationName(properties.NAME);
  return {
    type: "substation",
    feature: {
      id: `substation-${properties.OBJECTID ?? properties.ID}`,
      type: "substation",
      name,
      geometry: feature.geometry,
      properties: {
        city: properties.CITY || "",
        state: properties.STATE || "",
        county: properties.COUNTY || "",
        type: properties.TYPE || "",
        status: properties.STATUS || "",
        lines: Number(properties.LINES) || 0,
        maxVoltage: Number(properties.MAX_VOLT) || 0,
        minVoltage: Number(properties.MIN_VOLT) || 0,
        maxInferred: properties.MAX_INFER || "",
        minInferred: properties.MIN_INFER || "",
        sourceName: properties.SOURCE || "",
        sourceDate: properties.SOURCEDATE || "",
        validationMethod: properties.VAL_METHOD || "",
        validationDate: properties.VAL_DATE || ""
      },
      sourceRef: "hifld-substations-2025"
    }
  };
}

function substationName(value) {
  const name = String(value || "").trim();
  return !name || /^unknown\d*$/i.test(name) ? "Unnamed substation" : name;
}
