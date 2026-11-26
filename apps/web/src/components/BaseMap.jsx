import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Standard OSM raster tiles: free, no API key. CARTO's keyless "voyager"
// endpoint now ships a placeholder tile stamped "API KEY REQUIRED",
// so it is no longer usable without an account.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Use an explicit icon instead of Leaflet's default. In Vite (especially the
// Docker dev container) Leaflet's default icon detection prefixes the already
// absolute "/@fs/..." asset URL with the CSS image path again, producing a
// broken URL like ".../images//@fs/.../marker-icon.png" and a torn-image pin.
// Passing the imported URLs straight to L.icon bypasses that detection.
const PLACE_ICON = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

export const ZONE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5', '#0d9488'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasPoint(item) {
  return Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude));
}

/**
 * Minimal Leaflet wrapper.
 *   center        [lat, lng]
 *   zoom          initial zoom (ignored once fitBounds runs)
 *   markers       [{ latitude, longitude, name, href, isFocus }]
 *   zones         [{ latitude, longitude, radius, name, color, isFocus }]
 *   intersections [{ polygon: [[lat,lng],…], aName, bName, areaM2 }]
 *   fit           fit the viewport to markers + zones
 * A full re-render only re-positions markers/circles; the map itself is created
 * once. `onRef` hands control to async consumers (PlaceGuide drops a marker
 * later).
 */
export default function BaseMap({
  center,
  zoom = 15,
  markers = [],
  zones = [],
  intersections = [],
  fit = false,
  fitPadding = 0.2,
  style,
  onRef,
  className = 'map-embed',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  // Create once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false, // a scroll on the page must not hijack-zoom the map
      scrollWheelListen: false,
    });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Make sure tiles load even if the container resized before we booted
    // (e.g. tab was hidden when the page mounted).
    setTimeout(() => map.invalidateSize(), 50);
    onRef?.(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers, zones and overlap lenses
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1) Audio zones (below everything else).
    zones.forEach((zone, index) => {
      if (!hasPoint(zone) || !(Number(zone.radius) > 0)) return;
      const color = zone.color || ZONE_COLORS[index % ZONE_COLORS.length];
      const circle = L.circle([Number(zone.latitude), Number(zone.longitude)], {
        radius: Number(zone.radius),
        color: zone.isFocus ? '#b45309' : color,
        weight: zone.isFocus ? 3 : 1.5,
        opacity: 0.95,
        fillColor: color,
        fillOpacity: zone.isFocus ? 0.2 : 0.1,
        dashArray: zone.isFocus ? null : '4 4',
      }).addTo(layer);
      circle.bindTooltip(
        `${escapeHtml(zone.name || 'Vùng phát')} · ${Math.round(Number(zone.radius))} m`,
        { sticky: true }
      );
      bounds.extend(circle.getBounds());
    });

    // 2) Overlap lenses: the red "giao" area the admin needs to see.
    intersections.forEach((hit) => {
      if (!Array.isArray(hit.polygon) || hit.polygon.length < 3) return;
      const polygon = L.polygon(hit.polygon, {
        color: '#b91c1c',
        weight: 2.5,
        opacity: 1,
        fillColor: '#ef4444',
        fillOpacity: 0.45,
      }).addTo(layer);
      const area = Number(hit.areaM2);
      polygon.bindTooltip('Vùng giao', { sticky: true, className: 'zone-overlap-tooltip' });
      polygon.bindPopup(
        `<strong style="color:#b91c1c">Vùng giao</strong><br/>` +
        `${escapeHtml(hit.aName)} ↔ ${escapeHtml(hit.bName)}` +
        (Number.isFinite(area) ? `<br/><span style="font-size:0.8rem">≈ ${Math.round(area)} m²</span>` : '')
      );
      hit.polygon.forEach((point) => bounds.extend(point));
    });

    // 3) Place pins on top.
    markers.forEach((m) => {
      if (!hasPoint(m)) return;
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      const html = m.href
        ? `<a href="${escapeHtml(m.href)}" style="font-weight:700;color:var(--primary-dark)">${escapeHtml(m.name)}</a>`
        : `<strong style="color:var(--primary-dark)">${escapeHtml(m.name)}</strong>`;
      L.marker([lat, lng], {
        icon: m.icon || PLACE_ICON,
        title: m.name || '',
        zIndexOffset: m.isFocus ? 1000 : 0,
      }).bindPopup(html).addTo(layer);
      bounds.extend([lat, lng]);
    });

    if (fit && bounds.isValid()) {
      map.fitBounds(bounds.pad(fitPadding), { animate: false, maxZoom: 17 });
    }
  }, [markers, zones, intersections, fit, fitPadding]);

  return <div ref={containerRef} className={className} style={style} role="application" aria-label="map" />;
}
