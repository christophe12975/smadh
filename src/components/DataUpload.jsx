import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

const FILE_CONFIGS = {
  precip: {
    label: 'Precipitations journalieres',
    icon: '🌧',
    unit: 'mm',
    exportName: 'Precipitations_25stations_1991_2020.xlsx',
    sheetName: 'Precipitations',
    description: '25 stations pluviometriques - mm - Journalier',
    expectedCols: 26,
  },
  tmin: {
    label: 'Temperatures minimales (Tmin)',
    icon: '❄️',
    unit: 'C',
    exportName: 'Tmin_4stations_1991_2020.xlsx',
    sheetName: 'Tmin',
    description: '4 stations synoptiques - C - Journalier',
    expectedCols: 5,
  },
  tmax: {
    label: 'Temperatures maximales (Tmax)',
    icon: '🌡️',
    unit: 'C',
    exportName: 'Tmax_4stations_1991_2020.xlsx',
    sheetName: 'Tmax',
    description: '4 stations synoptiques - C - Journalier',
    expectedCols: 5,
  },
  debit: {
    label: 'Debits journaliers (Bonou)',
    icon: '💧',
    unit: 'm3/s',
    exportName: 'Debits_Bonou_1991_2020.xlsx',
    sheetName: 'Debits',
    description: 'Exutoire de Bonou - m3/s - Journalier',
    expectedCols: 2,
  },
};

function parseNumeric(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function computeStats(data, cols) {
  const result = {};
  cols.forEach(col => {
    const vals = data.map(r => parseNumeric(r[col])).filter(v => v !== null);
    if (vals.length === 0) return;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    result[col] = {
      mean: +mean.toFixed(3),
      std: +std.toFixed(3),
      min: +Math.min(...vals).toFixed(3),
      max: +Math.max(...vals).toFixed(3),
      n: vals.length,
      missing: data.length - vals.length,
    };
  });
  return result;
}

function validateData(data, key) {
  const cfg = FILE_CONFIGS[key];
  const errors = [];
  const warnings = [];
  if (!data || data.length === 0) { errors.push('Fichier vide.'); return { errors, warnings }; }
  const cols = Object.keys(data[0]);
  const dateCols = cols.filter(c => c.toLowerCase().includes('date'));
  const valueCols = cols.filter(c => !c.toLowerCase().includes('date'));
  if (dateCols.length === 0) errors.push('Colonne Date introuvable.');
  if (data.length < 100) warnings.push(`Seulement ${data.length} lignes (attendu ~10957).`);
  const missingTotal = data.reduce((acc, row) =>
    acc + valueCols.filter(c => parseNumeric(row[c]) === null).length, 0);
  if (missingTotal > 0) warnings.push(`${missingTotal} valeur(s) manquante(s).`);
  if (valueCols.length !== cfg.expectedCols - 1)
    warnings.push(`${valueCols.length} colonne(s) de donnees (attendu ${cfg.expectedCols - 1}).`);
  return { errors, warnings };
}

function exportToExcel(key, data) {
  const cfg = FILE_CONFIGS[key];
  const standardized = data.map(row => {
    const newRow = {};
    Object.entries(row).forEach(([k, v]) => {
      const cleanKey = k.trim();
      if (cleanKey.toLowerCase().includes('date')) {
        newRow[cleanKey] = v;
      } else {
        const n = parseNumeric(v);
        newRow[cleanKey] = n !== null ? n : v;
      }
    });
    return newRow;
  });

  const cols = Object.keys(data[0]).filter(c => !c.toLowerCase().includes('date'));
  const stats = computeStats(data, cols);
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(standardized);
  XLSX.utils.book_append_sheet(wb, ws, cfg.sheetName);

  const statsRows = [['Station', 'Moyenne', 'Ecart-type', 'Minimum', 'Maximum', 'N valides', 'Manquants']];
  Object.entries(stats).forEach(([col, s]) => {
    statsRows.push([col, s.mean, s.std, s.min, s.max, s.n, s.missing]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statsRows), 'Statistiques');

  const meta = [
    ['Champ', 'Valeur'],
    ['Fichier', cfg.exportName],
    ['Type', cfg.label],
    ['Unite', cfg.unit],
    ['Lignes', data.length],
    ['Colonnes', Object.keys(data[0]).length],
    ['Bassin', 'Oueme a Bonou - Benin'],
    ['Periode', '1991-2020'],
    ['Outil', 'HydroClim Analyzer - SMADH'],
    ['Date export', new Date().toLocaleDateString('fr-FR')],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Metadonnees');
  XLSX.writeFile(wb, cfg.exportName);
}

export default function DataUpload() {
  const [activeTab, setActiveTab] = useState('precip');
  const [files, setFiles] = useState({ precip: null, tmin: null, tmax: null, debit: null });
  const [data, setData] = useState({ precip: null, tmin: null, tmax: null, debit: null });
  const [errors, setErrors] = useState({ precip: null, tmin: null, tmax: null, debit: null });
  const [validation, setValidation] = useState({ precip: null, tmin: null, tmax: null, debit: null });

  const handleFile = useCallback((e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setFiles(prev => ({ ...prev, [key]: file.name }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setData(prev => ({ ...prev, [key]: null }));
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'DD/MM/YYYY' });
        if (!json || json.length === 0) {
          setErrors(prev => ({ ...prev, [key]: 'Fichier vide ou format non reconnu.' }));
          return;
        }
        const v = validateData(json, key);
        setValidation(prev => ({ ...prev, [key]: v }));
        if (v.errors.length === 0) {
          setData(prev => ({ ...prev, [key]: json }));
        } else {
          setErrors(prev => ({ ...prev, [key]: v.errors.join(' ') }));
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, [key]: 'Erreur: ' + err.message }));
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const getStats = useCallback(key => {
    const d = data[key];
    if (!d) return null;
    const cols = Object.keys(d[0]).filter(c => !c.toLowerCase().includes('date'));
    return computeStats(d, cols);
  }, [data]);

  const progress = Object.values(data).filter(Boolean).length;

  const st = {
    container: { padding: '16px', background: '#0f2030', minHeight: '100vh',
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#e8f4f0' },
    card: { background: '#1a2f42', border: '1px solid #234055',
      borderRadius: '14px', padding: '16px', marginBottom: '12px' },
    cardTitle: { fontSize: '13px', fontWeight: 600, color: '#e8f4f0', marginBottom: '8px' },
    tabs: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' },
    tab: (active) => ({
      flex: 1, minWidth: '60px', padding: '8px 4px', borderRadius: '8px',
      fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center',
      border: active ? '1px solid #4ecba0' : '1px solid #234055',
      background: active ? 'rgba(78,203,160,.12)' : '#0d2235',
      color: active ? '#4ecba0' : '#6a9080',
    }),
    uploadZone: (s) => ({
      border: `2px ${s === 'ok' ? 'solid #4ecba0' : s === 'err' ? 'solid #e06060' : 'dashed #234055'}`,
      borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer',
      background: s === 'ok' ? 'rgba(78,203,160,.06)' : s === 'err' ? 'rgba(220,80,80,.06)' : '#0d1b2a',
      position: 'relative', marginBottom: '12px',
    }),
    fileInput: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' },
    progressTrack: { height: '6px', background: '#0d2235', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' },
    progressFill: { height: '100%', width: `${progress * 25}%`,
      background: 'linear-gradient(90deg,#0f6e56,#4ecba0)', borderRadius: '4px', transition: 'width .4s' },
    btnPrimary: (disabled) => ({
      width: '100%', padding: '12px',
      background: disabled ? 'rgba(78,203,160,.2)' : 'linear-gradient(135deg,#0f6e56,#0a9e7a)',
      color: disabled ? '#4a6a5a' : '#fff', border: 'none', borderRadius: '10px',
      fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: '8px',
    }),
    btnSecondary: (disabled) => ({
      width: '100%', padding: '10px', background: 'rgba(78,203,160,.1)',
      color: disabled ? '#4a6a5a' : '#4ecba0', border: '1px solid rgba(78,203,160,.3)',
      borderRadius: '10px', fontSize: '12px', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: '8px',
    }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    th: { color: '#6a9080', padding: '4px 6px', textAlign: 'left', borderBottom: '1px solid #234055', whiteSpace: 'nowrap' },
    td: { padding: '4px 6px', borderBottom: '1px solid #1a2f42', color: '#c0d8d0', whiteSpace: 'nowrap' },
    sectionLabel: { fontSize: '10px', color: '#4a6a5a', textTransform: 'uppercase',
      letterSpacing: '.08em', margin: '10px 0 4px' },
    interpBox: { background: 'rgba(78,203,160,.06)', borderLeft: '3px solid #4ecba0',
      borderRadius: '0 8px 8px 0', padding: '10px 12px', fontSize: '11px',
      lineHeight: 1.6, color: '#c0d8d0', marginTop: '8px' },
    warnBox: { background: 'rgba(220,160,60,.06)', borderLeft: '3px solid #e0a060',
      borderRadius: '0 8px 8px 0', padding: '8px 12px', fontSize: '11px',
      lineHeight: 1.6, color: '#c0b080', marginTop: '6px' },
  };

  const renderPanel = (key) => {
    const cfg = FILE_CONFIGS[key];
    const d = data[key];
    const err = errors[key];
    const v = validation[key];
    const stats = getStats(key);
    const zoneState = d ? 'ok' : err ? 'err' : 'idle';
    const cols = d ? Object.keys(d[0]) : [];
    const valueCols = cols.filter(c => !c.toLowerCase().includes('date'));

    return (
      <div>
        <div style={st.uploadZone(zoneState)}>
          <input type="file" accept=".xlsx,.xls,.csv"
            style={st.fileInput} onChange={e => handleFile(e, key)} />
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>
            {d ? '✅' : err ? '❌' : '📂'}
          </div>
          <div style={{ fontSize: '12px', color: '#8ab5a5', fontWeight: 600 }}>
            {files[key] || 'Glisser ou cliquer pour uploader'}
          </div>
          <div style={{ fontSize: '10px', color: '#4a6a5a', marginTop: '3px' }}>
            {d ? `${d.length.toLocaleString()} lignes - ${cols.length} colonnes` : 'Formats: .xlsx .xls .csv'}
          </div>
          {d && <div style={{ fontSize: '11px', color: '#4ecba0', fontWeight: 600, marginTop: '6px' }}>Charge avec succes</div>}
          {err && <div style={{ fontSize: '11px', color: '#e06060', fontWeight: 600, marginTop: '6px' }}>{err}</div>}
        </div>

        {v && (
          <>
            <div style={st.sectionLabel}>Validation</div>
            {v.warnings.length > 0 && (
              <div style={st.warnBox}>
                {v.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
              </div>
            )}
            {v.errors.length === 0 && v.warnings.length === 0 && (
              <div style={st.interpBox}>
                ✓ Format valide — {d?.length?.toLocaleString()} lignes, {valueCols.length} station(s).
              </div>
            )}
          </>
        )}

        {d && (
          <>
            <div style={st.sectionLabel}>Apercu (5 premieres lignes)</div>
            <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
              <table style={st.table}>
                <thead>
                  <tr>
                    {cols.slice(0, 4).map(c => <th key={c} style={st.th}>{c}</th>)}
                    {cols.length > 4 && <th style={st.th}>+{cols.length - 4}...</th>}
                  </tr>
                </thead>
                <tbody>
                  {d.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {cols.slice(0, 4).map(c => <td key={c} style={st.td}>{row[c] ?? '-'}</td>)}
                      {cols.length > 4 && <td style={st.td}>...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {stats && (
          <>
            <div style={st.sectionLabel}>Statistiques ({cfg.unit})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={st.table}>
                <thead>
                  <tr>
                    {['Station','Moy.','Ec.-t.','Min','Max','N'].map(h => (
                      <th key={h} style={st.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats).map(([col, s]) => (
                    <tr key={col}>
                      <td style={{ ...st.td, color: '#4ecba0', fontWeight: 600 }}>{col}</td>
                      <td style={st.td}>{s.mean}</td>
                      <td style={st.td}>{s.std}</td>
                      <td style={st.td}>{s.min}</td>
                      <td style={st.td}>{s.max}</td>
                      <td style={st.td}>{s.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {d && (
          <button style={{ ...st.btnSecondary(false), marginTop: '12px' }}
            onClick={() => exportToExcel(key, d)}>
            📥 Exporter {cfg.label}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={st.container}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
        Gestion des donnees
      </div>
      <div style={{ fontSize: '12px', color: '#8ab5a5', marginBottom: '16px' }}>
        Upload - Validation - Standardisation - Export Excel
      </div>

      <div style={st.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={st.cardTitle}>Progression globale</div>
          <span style={{ fontSize: '13px', color: '#4ecba0', fontWeight: 700 }}>{progress} / 4</span>
        </div>
        <div style={st.progressTrack}><div style={st.progressFill} /></div>
        <div style={{ fontSize: '10px', color: '#6a9080', marginTop: '6px' }}>
          {progress === 4 ? '✓ Tous les fichiers charges - export disponible'
            : 'Chargez les 4 fichiers pour activer l export global'}
        </div>
      </div>

      <div style={st.tabs}>
        {Object.entries(FILE_CONFIGS).map(([key, cfg]) => {
          const ok = !!data[key];
          const err = !!errors[key];
          const badge = ok ? ' ✓' : err ? ' !' : '';
          return (
            <div key={key} style={st.tab(activeTab === key)} onClick={() => setActiveTab(key)}>
              {cfg.icon} {key.toUpperCase()}{badge}
            </div>
          );
        })}
      </div>

      <div style={st.card}>
        <div style={st.cardTitle}>
          {FILE_CONFIGS[activeTab].icon} {FILE_CONFIGS[activeTab].label}
        </div>
        <div style={{ fontSize: '11px', color: '#6a9080', marginBottom: '10px' }}>
          {FILE_CONFIGS[activeTab].description}
        </div>
        {renderPanel(activeTab)}
      </div>

      <div style={st.card}>
        <div style={st.cardTitle}>Export global</div>
        <div style={{ fontSize: '11px', color: '#6a9080', marginBottom: '10px' }}>
          Telechargez les 4 fichiers Excel standardises
        </div>
        {Object.entries(FILE_CONFIGS).map(([key, cfg]) => (
          <button key={key} style={st.btnSecondary(!data[key])}
            disabled={!data[key]} onClick={() => data[key] && exportToExcel(key, data[key])}>
            {cfg.icon} Exporter {cfg.label}
          </button>
        ))}
        <button style={st.btnPrimary(progress < 1)} disabled={progress < 1}
          onClick={() => {
            Object.entries(data).forEach(([key, d], i) => {
              if (d) setTimeout(() => exportToExcel(key, d), i * 600);
            });
          }}>
          📦 Exporter les {progress} fichier(s) charge(s)
        </button>
      </div>
    </div>
  );
}