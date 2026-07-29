import React, { useState, useMemo } from 'react';
import { Station } from './BasinMap';

interface StationTableProps {
  stations: Station[];
}

export const StationTable: React.FC<StationTableProps> = ({ stations }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Station>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredStations = useMemo(() => {
    return stations
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [stations, search, statusFilter, sortField, sortOrder]);

  const handleSort = (field: keyof Station) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: Station['status']) => {
    const config = {
      normal: { label: 'Normal', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' },
      vigilance: { label: 'Vigilance', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' },
      danger: { label: 'Alerte Crue', bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }
    };
    const c = config[status];
    return (
      <span style={{ 
        padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
        backgroundColor: c.bg, color: c.color, display: 'inline-block' 
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      {/* Barre d'outils (Recherche + Filtrage) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <input
          type="text"
          placeholder="Rechercher une station..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--bg-main)', color: 'var(--text-main)', minWidth: '240px'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--bg-main)', color: 'var(--text-main)'
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="normal">Normal</option>
          <option value="vigilance">Vigilance</option>
          <option value="danger">Alerte Crue</option>
        </select>
      </div>

      {/* Tableau des données */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
              <th onClick={() => handleSort('name')} style={{ padding: '10px', cursor: 'pointer' }}>Station ↕</th>
              <th onClick={() => handleSort('status')} style={{ padding: '10px', cursor: 'pointer' }}>Statut ↕</th>
              <th onClick={() => handleSort('rx5day')} style={{ padding: '10px', cursor: 'pointer' }}>Rx5day (mm) ↕</th>
              <th onClick={() => handleSort('cdd')} style={{ padding: '10px', cursor: 'pointer' }}>CDD (jours) ↕</th>
              <th onClick={() => handleSort('completeness')} style={{ padding: '10px', cursor: 'pointer', width: '180px' }}>Complétude (1991-2020) ↕</th>
            </tr>
          </thead>
          <tbody>
            {filteredStations.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '12px 10px' }}>{getStatusBadge(s.status)}</td>
                <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>{s.rx5day}</td>
                <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>{s.cdd}</td>
                <td style={{ padding: '12px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${s.completeness}%`, height: '100%', 
                        backgroundColor: s.completeness > 95 ? 'var(--success)' : s.completeness > 85 ? 'var(--warning)' : 'var(--danger)' 
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '32px' }}>{s.completeness}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};