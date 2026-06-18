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

export default function ExploreMap({
  plants,
  dataCenters,
  fuelVisibility,
  showPowerPlants,
  showDataCenters,
  focusRequest,
  onSelect
}) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const plantLayerRef = useRef(null);
  const dataCenterLayerRef = useRef(null);
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
    mapRef.current = map;
    canvasRendererRef.current = L.canvas({ padding: 0.45 });
    plantLayerRef.current = L.layerGroup().addTo(map);
    dataCenterLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
