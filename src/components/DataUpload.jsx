import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// ============================================================
// CONFIG DES 4 FICHIERS
// ============================================================
const FILE_CONFIGS = {
  precip: {
    label: 'Précipitations journalières',
    icon: '🌧',
    color: '#4a9fe0',
    stations: ['ABOMEY','BANTE','BASSILA','BEMBEREKE','BETEROU','BIRNI','BOHICON',
      'BONOU','DASSA','DJOUGOU','INA','KETOU','KOUANDE','NIKKI','OKPARA',
      'OUESSE','PARAKOU','PARTAGO','PENESSOULOU','POBE','SAVALOU','SAVE',
      'TCHAOUROU','TOUI','ZAGNANADO'],
    unit: 'mm',
    exportName: 'Precipitations_25stations_1991_2020.xlsx',
    sheetName: 'Précipitations',
    description: '25 stations pluviométriques · mm · Journalier',
    expectedCols: 26,
  },
  tmin: {
    label: 'Températures minimales (Tmin)',
    icon: '❄️',
    color: '#4ecba0',
    stations: ['Cotonou','Bohicon','Save','Parakou'],
    unit: '°C',
    exportName: 'Tmin_4stations_1991_2020.xlsx',
    sheetName: 'Tmin',
    description: '4 stations synoptiques · °C · Journalier',
    expectedCols: 5,
  },
  tmax: {
    label: 'Températures maximales (Tmax)',
    icon: '🌡️',
    color: '#e06060',
    stations: ['Cotonou','Bohicon','Save','Parakou'],
    unit: '°C',
    exportName: 'Tmax_4stations_1991_2020.xlsx',
    sheetName: 'Tmax',
    description: '4 stations synoptiques · °C · Journalier',
    expectedCols: 5,
  },
  debit: {
    label: 'Débits journaliers (Bonou)',
    icon: '💧',
    color: '#a0c4e0',
    stations: ['Debit'],
    unit: 'm³/s',
    exportName: 'Debits_Bonou_1991_2020.xlsx',
    sheetName: 'Débits',
    description: 'Exutoire de Bonou · m³/s · Journalier',
    expectedCols: 2,
  },
};

// ============================================================
// UTILITAIRES
// ============================================================
function parseNumeric(val) {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function computeStats(data, cols) {
  const result = {};
  cols.forEach(col => {
    const vals = data
      .map(r => parseNumeric(r[col]))
      .filter(v => v !== null);
    if (vals.length === 0) return;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(
      vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
    );
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

  if (!data || data.length === 0) {
    errors.push('Fichier vide ou format non reconnu.');
    return { errors, warnings };
  }

  const cols = Object.keys(data[0]);
  const dateCols = cols.filter(c => c.toLowerCase().includes('date'));
  const valueCols = cols.filter(c => !c.toLowerCase().includes('date'));

  if (dateCols.length === 0)
    errors.push('Colonne "Date" introuvable.');

  if (data.length < 100)
    warnings.push(`Seulement ${data.length} lignes (attendu ~10 957).`);

  if (data.length > 11000)
    warnings.push(`${data.length} lignes — vérifier la période.`);

  const missingTotal = data.reduce((acc, row) =>
    acc + valueCols.filter(c => parseNumeric(row[c]) === null).length, 0);

  if (missingTotal > 0)
    warnings.push(`${missingTotal} valeur(s) manquante(s) détectée(s).`);

  if (valueCols.length !== cfg.expectedCols - 1)
    warnings.push(
      `${valueCols.length} colonne(s) de données (attendu ${cfg.expectedCols - 1}).`
    );

  return { errors, warnings };
}

function standardize(data) {
  return data.map(row => {
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
}

// ============================================================
// EXPORT EXCEL
// ============================================================
function exportToExcel(key, data) {
  const cfg = FILE_CONFIGS[key];
  const standardized = standardize(data);
  const cols = Object.keys(data[0]).filter(
    c => !c.toLowerCase().includes('date')
  );
  const stats = computeStats(data, cols);

  const wb = XLSX.utils.book_new();

  // Feuille 1 — Données
  const ws = XLSX.utils.json_to_sheet(standardized);
  XLSX.utils.book_append_sheet(wb, ws, cfg.sheetName);

  // Feuille 2 — Statistiques
  const statsRows = [
    ['Station', 'Moyenne', 'Écart-type', 'Minimum', 'Maximum',
     'N valides', 'Manquants'],
  ];
  Object.entries(stats).forEach(([col, s]) => {
    statsRows.push([col, s.mean, s.std, s.min, s.max, s.n, s.missing]);
  });
  XLSX.utils.book_append_sheet(
    wb, XLSX.utils.aoa_to_sheet(statsRows), 'Statistiques'
  );

  // Feuille 3 — Métadonnées
  const meta = [
    ['Champ', 'Valeur'],
    ['Fichier', cfg.exportName],
    ['Type de données', cfg.label],
    ['Unité', cfg.unit],
    ['Nombre de lignes', data.length],
    ['Nombre de colonnes', Object.keys(data[0]).length],
    ['Bassin', "Ouémé à Bonou — Bénin"],
    ['Période', '1991–2020'],
    ['Outil', 'HydroClim Analyzer — SMADH'],
    ["Date d'export", new Date().toLocaleDateString('fr-FR')],
  ];
  XLSX.utils.book_append_sheet(
    wb, XLSX.utils.aoa_to_sheet(meta), 'Métadonnées'
  );

  XLSX.writeFile(wb, cfg.exportName);
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function DataUpload() {
  const [activeTab, setActiveTab] = useState('precip');
  const [files, setFiles] = useState({
    precip: null, tmin: null, tmax: null, debit: null,
  });
  const [data, setData] = useState({
    precip: null, tmin: null, tmax: null, debit: null,
  });
  const [errors, setErrors] = useState({
    precip: null, tmin: null, tmax: null, debit: null,
  });
  const [validation, setValidation] = useState({
    precip: null, tmin: null, tmax: null, debit: null,
  });

  // ---- LECTURE FICHIER ----
  const handleFile = useCallback((e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setFiles(prev => ({ ...prev, [key]: file.name }));
    setErrors(prev => ({ ...prev, [key]: null }));
    setData(prev => ({ ...prev, [key]: null }));

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, {
          type: 'binary', cellDates: true,
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, {
          raw: false, dateNF: 'DD/MM/YYYY',
        });
        if (!json || json.length === 0) {
          setErrors(prev => ({
            ...prev, [key]: 'Fichier vide ou format non reconnu.',
          }));
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
        setErrors(prev => ({
          ...prev, [key]: 'Erreur : ' + err.message,
        }));
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  // ---- STATS ----
  const getStats = useCallback(key => {
    const d = data[key];
    if (!d) return null;
    const cols = Object.keys(d[0]).filter(
      c => !c.toLowerCase().includes('date')
    );
    return computeStats(d, cols);
  }, [data]);

  // ---- PROGRESS ----
  const progress = Object.values(data).filter(Boolean).length;

  // ---- STYLES ----
  const s = {
    container: {
      padding: '16px',
      background: '#0f2030',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e8f4f0',
    },
    title: {
      fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px',
    },
    sub: { fontSize: '12px', color: '#8ab5a5', marginBottom: '16px' },
    card: {
      background: '#1a2f42', border: '1px solid #234055',
      borderRadius: '14px', padding: '16px', marginBottom: '12px',
    },
    cardTitle: {
      fontSize: '13px', fontWeight: 600, color: '#e8f4f0', marginBottom: '8px',
    },
    tabs: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' },
    tab: (active) => ({
      flex: 1, minWidth: '60px', padding: '8px 4px',
      borderRadius: '8px', fontSize: '11px', fontWeight: 600,
      cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
      border: active ? '1px solid #4ecba0' : '1px solid #234055',
      background: active ? 'rgba(78,203,160,.12)' : '#0d2235',
      color: active ? '#4ecba0' : '#6a9080',
    }),
    uploadZone: (state) => ({
      border: `2px dashed ${state === 'ok' ? '#4ecba0' : state === 'err' ? '#e06060' : '#234055'}`,
      borderStyle: state === 'ok' ? 'solid' : 'dashed',
      borderRadius: '10px', padding: '20px', textAlign: 'center',
      cursor: 'pointer', background: state === 'ok'
        ? 'rgba(78,203,160,.06)' : state === 'err'
        ? 'rgba(220,80,80,.06)' : '#0d1b2a',
      position: 'relative', marginBottom: '12px', transition: 'all .2s',
    }),
    fileInput: {
      position: 'absolute', inset: 0, opacity: 0,
      cursor: 'pointer', width: '100%', height: '100%',
    },
    progressTrack: {
      height: '6px', background: '#0d2235',
      borderRadius: '4px', overflow: 'hidden', marginTop: '8px',
    },
    progressFill: {
      height: '100%', width: `${progress * 25}%`,
      background: 'linear-gradient(90deg,#0f6e56,#4ecba0)',
      borderRadius: '4px', transition: 'width .4s',
    },
    btnPrimary: (disabled) => ({
      width: '100%', padding: '12px',
      background: disabled
        ? 'rgba(78,203,160,.2)'
        : 'linear-gradient(135deg,#0f6e56,#0a9e7a)',
      color: disabled ? '#4a6a5a' : '#fff',
      border: 'none', borderRadius: '10px',
      fontSize: '13px', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginBottom: '8px',
    }),
    btnSecondary: (disabled) => ({
      width: '100%', padding: '10px',
      background: 'rgba(78,203,160,.1)',
      color: disabled ? '#4a6a5a' : '#4ecba0',
      border: '1px solid rgba(78,203,160,.3)',
      borderRadius: '10px', fontSize: '12px', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', marginBottom: '8px',
    }),
    statGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '6px', marginTop: '8px',
    },
    statItem: {
      background: '#0d2235', borderRadius: '8px',
      padding: '8px', textAlign: 'center',
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    th: {
      color: '#6a9080', padding: '4px 6px',
      textAlign: 'left', borderBottom: '1px solid #234055',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '4px 6px', borderBottom: '1px solid #1a2f42',
      color: '#c0d8d0', whiteSpace: 'nowrap',
    },
    sectionLabel: {
      fontSize: '10px', color: '#4a6a5a',
      textTransform: 'uppercase', letterSpacing: '.08em',
      margin: '10px 0 4px',
    },
    interpBox: {
      background: 'rgba(78,203,160,.06)',
      borderLeft: '3px solid #4ecba0',
      borderRadius: '0 8px 8px 0',
      padding: '10px 12px', fontSize: '11px',
      lineHeight: 1.6, color: '#c0d8d0', marginTop: '8px',
    },
    warnBox: {
      background: 'rgba(220,160,60,.06)',
      borderLeft: '3px solid #e0a060',
      borderRadius: '0 8px 8px 0',
      padding: '8px 12px', fontSize: '11px',
      lineHeight: 1.6, color: '#c0b080', marginTop: '6px',
    },
    errBox: {
      background: 'rgba(220,80,80,.06)',
      borderLeft: '3px solid #e06060',
      borderRadius: '0 8px 8px 0',
      padding: '8px 12px', fontSize: '11px',
      lineHeight: 1.6, color: '#d0a0a0', marginTop: '6px',
    },
  };

  // ---- RENDU PANNEAU ----
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
        {/* ZONE UPLOAD */}
        <div style={s.uploadZone(zoneState)}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            style={s.fileInput}
            onChange={e => handleFile(e, key)}
          />
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>
            {d ? '✅' : err ? '❌' : '📂'}
          </div>
          <div style={{ fontSize: '12px', color: '#8ab5a5', fontWeight: 600 }}>
            {files[key] || 'Glisser ou cliquer pour uploader'}
          </div>
          <div style={{ fontSize: '10px', color: '#4a6a5a', marginTop: '3px' }}>
            {d ? `${d.length.toLocaleString()} lignes · ${cols.length} colonnes`
               : 'Formats : .xlsx · .xls · .csv'}
          </div>
          {d && (
            <div style={{ fontSize: '11px', color: '#4ecba0',
              fontWeight: 600, marginTop: '6px' }}>
              Chargé avec succès
            </div>
          )}
          {err && (
            <div style={{ fontSize: '11px', color: '#e06060',
              fontWeight: 600, marginTop: '6px' }}>
              {err}
            </div>
          )}
        </div>

        {/* VALIDATION */}
        {v && (
          <>
            <div style={s.sectionLabel}>Validation</div>
            {v.warnings.length > 0 && (
              <div style={s.warnBox}>
                {v.warnings.map((w, i) => (
                  <div key={i}>⚠️ {w}</div>
                ))}
              </div>
            )}
            {v.errors.length === 0 && v.warnings.length === 0 && (
              <div style={s.interpBox}>
                ✓ Format valide — {d?.length?.toLocaleString()} lignes,
                {valueCols.length} station(s) détectée(s).
              </div>
            )}
          </>
        )}

        {/* APERÇU */}
        {d && (
          <>
            <div style={s.sectionLabel}>
              Aperçu (5 premières lignes)
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {cols.slice(0, 4).map(c => (
                      <th key={c} style={s.th}>{c}</th>
                    ))}
                    {cols.length > 4 && (
                      <th style={s.th}>+{cols.length - 4}…</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {d.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {cols.slice(0, 4).map(c => (
                        <td key={c} style={s.td}>{row[c] ?? '—'}</td>
                      ))}
                      {cols.length > 4 && <td style={s.td}>…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* STATISTIQUES */}
        {stats && (
          <>
            <div style={s.sectionLabel}>
              Statistiques globales ({cfg.unit})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Station','Moy.','Éc.-t.','Min','Max','N'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats).map(([col, st]) => (
                    <tr key={col}>
                      <td style={{ ...s.td, color: '#4ecba0',
                        fontWeight: 600 }}>{col}</td>
                      <td style={s.td}>{st.mean}</td>
                      <td style={s.td}>{st.std}</td>
                      <td style={s.td}>{st.min}</td>
                      <td style={s.td}>{st.max}</td>
                      <td style={s.td}>{st.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BOUTON EXPORT INDIVIDUEL */}
        {d && (
          <button
            style={{ ...s.btnSecondary(false), marginTop: '12px' }}
            onClick={() => exportToExcel(key, d)}
          >
            📥 Exporter {cfg.label}
          </button>
        )}
      </div>
    );
  };

  // ---- RENDU PRINCIPAL ----
  return (
    <div style={s.container}>
      <div style={s.title}>Gestion des données</div>
      <div style={s.sub}>
        Upload · Validation · Standardisation · Export Excel
      </div>

      {/* PROGRESSION */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center' }}>
          <div style={s.cardTitle}>Progression globale</div>
          <span style={{ fontSize: '13px', color: '#4ecba0',
            fontWeight: 700 }}>{progress} / 4</span>
        </div>
        <div style={s.progressTrack}>
          <div style={s.progressFill} />
        </div>
        <div style={{ fontSize: '10px', color: '#6a9080', marginTop: '6px' }}>
          {progress === 4
            ? '✓ Tous les fichiers chargés — export disponible'
            : 'Chargez les 4 fichiers pour activer l\'export global'}
        </div>
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        {Object.entries(FILE_CONFIGS).map(([key, cfg]) => {
          const ok = !!data[key];
          const err = !!errors[key];
          const badge = ok ? ' ✓' : err ? ' !' : '';
          return (
            <div
              key={key}
              style={s.tab(activeTab === key)}
              onClick={() => setActiveTab(key)}
            >
              {cfg.icon} {key.toUpperCase()}{badge}
            </div>
          );
        })}
      </div>

      {/* PANNEAU ACTIF */}
      <div style={s.card}>
        <div style={s.cardTitle}>
          {FILE_CONFIGS[activeTab].icon} {FILE_CONFIGS[activeTab].label}
        </div>
        <div style={{ fontSize: '11px', color: '#6a9080',
          marginBottom: '10px' }}>
          {FILE_CONFIGS[activeTab].description}
        </div>
        {renderPanel(activeTab)}
      </div>

      {/* EXPORT GLOBAL */}
      <div style={s.card}>
        <div style={s.cardTitle}>Export global</div>
        <div style={{ fontSize: '11px', color: '#6a9080',
          marginBottom: '10px' }}>
          Télécharge les 4 fichiers Excel standardisés
        </div>
        {Object.entries(FILE_CONFIGS).map(([key, cfg]) => (
          <button
            key={key}
            style={s.btnSecondary(!data[key])}
            disabled={!data[key]}
            onClick={() => data[key] && exportToExcel(key, data[key])}
          >
            {cfg.icon} Exporter {cfg.label}
          </button>
        ))}
        <button
          style={s.btnPrimary(progress < 4)}
          disabled={progress < 4}
          onClick={() => {
            Object.entries(data).forEach(([key, d], i) => {
              if (d) setTimeout(() => exportToExcel(key, d), i * 600);
            });
          }}
        >
          📦 Exporter les {progress} fichier(s) chargé(s)
        </button>
      </div>
    </div>
  );
}