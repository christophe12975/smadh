import React from 'react';

export default function IndicatorsCard() {
  const cards = [
    { title: 'Débit d\'extrême crue (Q95)', value: '342 m³/s', change: '+12%', status: 'warning' },
    { title: 'Cumul Précipitations', value: '128 mm', change: '-5%', status: 'info' },
    { title: 'Niveau d\'Alerte Hydro', value: 'Modéré', change: 'Stable', status: 'success' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {cards.map((card, index) => (
        <div key={index} style={{
          background: 'var(--bg-surface)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.title}</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{card.value}</span>
          <span style={{ fontSize: '12px', color: card.status === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
            {card.change} par rapport au mois dernier
          </span>
        </div>
      ))}
    </div>
  );
}