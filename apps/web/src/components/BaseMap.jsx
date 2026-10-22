import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interactive OpenStreetMap without the www.openstreetmap.org embed — that
// host is unreachable from some networks (DNS fails), so we render Leaflet
// with CARTO-hosted tiles instead. Attribution stays truthful.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

/**
 * Minimal Leaflet wrapper.
 *   center      [lat, lng]
 *   zoom        initial zoom (ignored once fitBounds runs)
 *   markers     [{ latitude, longitude, name, href }]
 * A full re-render only re-positions markers; the map itself is created once.
 * `onRef` hands control to async consumers (PlaceGuide drops a marker later).
 */
export default function BaseMap({ center, zoom = 15, markers = [], fit = false, style, onRef, className = 'map-embed' }) {
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

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const coords = [];
    for (const m of markers) {
      if (!m.latitude || !m.longitude) continue;
      coords.push([m.latitude, m.longitude]);
      const html = m.href
        ? `<a href="${m.href}" style="font-weight:700;color:var(--primary-dark)">${m.name || ''}</a>`
        : `<strong style="color:var(--primary-dark)">${m.name || ''}</strong>`;
      L.marker([m.latitude, m.longitude]).bindPopup(html).addTo(layer);
    }
    if (fit && coords.length) {
      map.fitBounds(L.latLngBounds(coords).pad(0.25), { animate: false });
    }
  }, [markers, fit]);

  return <div ref={containerRef} className={className} style={style} role="application" aria-label="map" />;
}
