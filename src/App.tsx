import React, { useState } from 'react';
import { BasinMap, Station } from './components/BasinMap';
import { StationTable } from './components/StationTable';
import { ExportPanel } from './components/ExportPanel';
import './index.css';

// Exemple de jeu de données (25 stations du bassin de l'Ouémé)
const initialStations: Station[] = [
  { id: '1', name: 'Bonou', lat: 6.892, lng: 2.443, status: 'danger', rx5day: 185.4, cdd: 12, completeness: 98.5 },
  { id: '2', name: 'Savè', lat: 8.033, lng: 2.483, status: 'vigilance', rx5day: 142.0, cdd: 25, completeness: 96.0 },
  { id: '3', name: 'Parakou', lat: 9.350, lng: 2.617, status: 'normal', rx5day: 95.2, cdd: 40, completeness: 100.0 },
  { id: '4', name: 'Bembèrèkè', lat: 10.228, lng: 2.663, status: 'normal', rx5day: 88.0, cdd: 45, completeness: 92.1 },
  // ... Ajoutez vos autres stations ici
];

export function App() {
  const [stations] = useState<Station[]>(initialStations);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* En-tête du Dashboard */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>HydroClim Analyzer</h1>
          <p>Suivi hydro-climatique du Bassin de l'Ouémé à Bonou (1991–2020)</p>
        </div>
        {/* Panneau d'Export CSV / PDF */}
        <ExportPanel stations={stations} />
      </header>

      {/* Section Carte Interactive */}
      <section>
        <h2>Localisation des stations & Exutoire</h2>
        <div style={{ marginTop: '12px' }}>
          <BasinMap stations={stations} />
        </div>
      </section>

      {/* Section Tableau de données */}
      <section>
        <h2>Indices climatiques par station</h2>
        <div style={{ marginTop: '12px' }}>
          <StationTable stations={stations} />
        </div>
      </section>
    </div>
  );
}

export default App;