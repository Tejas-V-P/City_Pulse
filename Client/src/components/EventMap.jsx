import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './EventMap.css';

export default function EventMap({ events = [], selectedCity, userCoords, onSelectEvent }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center (San Francisco) or user coordinates
    const initialCenter = userCoords
      ? [userCoords.lat, userCoords.lng]
      : [37.7749, -122.4194];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Sleek dark-theme basemap (100% Free, Zero API key required, No watermarks)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: '&copy; Esri'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // Add User location beacon if available
    if (userCoords && userCoords.lat && userCoords.lng) {
      const userIcon = L.divIcon({
        className: 'user-marker-wrapper',
        html: `<div class="user-location-marker" title="Your Current Location"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .bindTooltip('📍 Your Location', { permanent: false, direction: 'top' })
        .addTo(markersLayer);
    }

    const bounds = [];
    if (userCoords) bounds.push([userCoords.lat, userCoords.lng]);

    // Add pulse marker for each event
    events.forEach(evt => {
      const coords = evt.coordinates || { lat: 37.7749, lng: -122.4194 };
      if (!coords.lat || !coords.lng) return;

      const latLng = [coords.lat, coords.lng];
      bounds.push(latLng);

      const eventMarkerIcon = L.divIcon({
        className: 'custom-pulse-marker',
        html: `
          <div class="marker-pulse-wrapper">
            <div class="marker-dot"></div>
            <div class="marker-ring"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const popupHtml = `
        <div class="map-popup-card">
          <img src="${evt.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80'}" class="map-popup-img" alt="${evt.title}" />
          <div class="map-popup-body">
            <div class="map-popup-badge-row">
              <span class="map-popup-category">${evt.category || 'Event'}</span>
              <span class="map-popup-price">${evt.isFree || evt.price === 0 ? 'FREE' : `$${evt.price}`}</span>
            </div>
            <h4 class="map-popup-title">${evt.title}</h4>
            <p class="map-popup-venue">📍 ${evt.venue || 'Venue'}</p>
            ${evt.distanceKm !== null && evt.distanceKm !== undefined ? `<p style="font-size: 0.7rem; color: #38bdf8; margin: 0;">🧭 ${evt.distanceKm} km away</p>` : ''}
            <button class="map-popup-btn" id="map-btn-${evt.id || evt._id}">View Details</button>
          </div>
        </div>
      `;

      const marker = L.marker(latLng, { icon: eventMarkerIcon })
        .bindPopup(popupHtml, { maxWidth: 260 })
        .addTo(markersLayer);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`map-btn-${evt.id || evt._id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectEvent) onSelectEvent(evt);
          };
        }
      });
    });

    // Fit map bounds smoothly
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    // Invalidate map size after animation frames to avoid Leaflet render glitches
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [events, selectedCity, userCoords]);

  return (
    <div className="event-map-container">
      <div className="map-status-overlay">
        <span className="map-status-dot"></span>
        <span>Live Interactive Radar • {events.length} Events Geocoded</span>
      </div>
      <div ref={mapContainerRef} className="event-map-element" />
    </div>
  );
}
