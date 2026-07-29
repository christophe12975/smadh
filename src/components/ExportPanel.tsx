import React from 'react';
import { Station } from './BasinMap';
import { exportStationsToCSV, printHydroAlertBulletin } from './exportUtils';

interface ExportPanelProps {
  stations: Station[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ stations }) => {
  return (
    <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
      <button
        onClick={() => exportStationsToCSV(stations)}
        style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg-surface)', color: 'var(--text-main)', cursor: 'pointer',
          fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px'
        }}
      >
        📄 Exporter CSV
      </button>

      <button
        onClick={() => printHydroAlertBulletin(stations)}
        style={{
          padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
          background: 'var(--primary)', color: '#ffffff', cursor: 'pointer',
          fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px'
        }}
      >
        🚨 Générer Bulletin PDF
      </button>
    </div>
  );
};