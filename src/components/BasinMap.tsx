import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'normal' | 'vigilance' | 'danger';
  rx5day: number; // mm
  cdd: number;    // jours
  completeness: number; // %
}

interface BasinMapProps {
  stations: Station[];
  onSelectStation?: (station: Station) => void;
}

// Coordonnées de l'exutoire de Bonou (Bassin de l'Ouémé)
const BONOU_EXUTOIRE = { lat: 6.892, lng: 2.443 };

const createCustomIcon = (status: Station['status']) => {
  const colors = {
    normal: '#10b981',
    vigilance: '#f59e0b',
    danger: '#ef4444'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${colors[status]};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const outletIcon = L.divIcon({
  className: 'outlet-marker',
  html: `<div style="
    background-color: #0284c7;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 10px rgba(2,132,199,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    font-weight: bold;
  ">▲</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export const BasinMap: React.FC<BasinMapProps> = ({ stations, onSelectStation }) => {
  return (
    <div style={{ height: '450px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer 
        center={[8.0, 2.3]} 
        zoom={8} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'var(--bg-main)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Exutoire de Bonou */}
        <Marker position={[BONOU_EXUTOIRE.lat, BONOU_EXUTOIRE.lng]} icon={outletIcon}>
          <Popup>
            <strong>Exutoire de Bonou</strong><br />
            Station hydrométrique de référence<br />
            Bassin de l'Ouémé
          </Popup>
        </Marker>

        {/* Zone tampon autour de Bonou */}
        <Circle 
          center={[BONOU_EXUTOIRE.lat, BONOU_EXUTOIRE.lng]} 
          radius={15000} 
          pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.1 }} 
        />

        {/* 25 Stations Pluviométriques */}
        {stations.map((s) => (
          <Marker 
            key={s.id} 
            position={[s.lat, s.lng]} 
            icon={createCustomIcon(s.status)}
            eventHandlers={{ click: () => onSelectStation?.(s) }}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{s.name}</strong>
                <hr style={{ margin: '4px 0', borderColor: 'var(--border)' }} />
                <div>Rx5day: <strong>{s.rx5day} mm</strong></div>
                <div>CDD: <strong>{s.cdd} jours</strong></div>
                <div>Complétude: <strong>{s.completeness}%</strong></div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};