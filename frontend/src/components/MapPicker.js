import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon broken in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const customIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Inner component to handle map click
function ClickHandler({ onPick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      // Reverse geocode via Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        if (data.display_name) address = data.display_name;
      } catch {}

      onPick({ lat, lng, address });
    },
  });
  return null;
}

const MapPicker = ({ value, onChange }) => {
  const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center
  const center = value ? { lat: value.lat, lng: value.lng } : defaultCenter;

  return (
    <div>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          height: 320,
          position: 'relative',
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 15 : 5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickHandler onPick={onChange} />
          {value && (
            <Marker position={[value.lat, value.lng]} icon={customIcon} />
          )}
        </MapContainer>

        {!value && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(17,24,39,0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              padding: '8px 16px',
              borderRadius: 100,
              pointerEvents: 'none',
              zIndex: 1000,
              whiteSpace: 'nowrap',
            }}
          >
            🗺️ Click on the map to drop a pin
          </div>
        )}
      </div>

      {value && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
              Location selected
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {value.address}
            </p>
          </div>
          <button
            onClick={() => onChange(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
