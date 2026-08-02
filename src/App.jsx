import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { createClient } from "@supabase/supabase-js";

console.log("SMADH APP CHARGE");

// --- INITIALISATION SÉCURISÉE DE SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
console.log("URL SUPABASE:", supabaseUrl);

// --- PALETTE DE COULEURS & CONSTANTES ---
const ink = "#12242b";
const teal = "#0f6e56";
const tealLight = "#9fe1cb";
const slate = "#5f5e5a";
const amber = "#ba7517";
const bg = "#f3f6f5";

const stations = [
  "ABOMEY", "BANTÈ", "BASSILA", "BEMBÈRÈKÈ", "BÉTÉROU",
  "BIRNI", "BOHICON", "BONOU", "DASSA", "DJOUGOU",
  "INA", "KÉTOU", "KOUANDÉ", "NIKKI", "OKPARA",
  "OUÈSSÈ", "PARAKOU", "PARTAGO", "PÉNÉSSOULOU", "POBÈ",
  "SAVALOU", "SAVÈ", "TCHAOUROU", "TOUI", "ZAGNANADO",
];

const debits = [
  { annee: 2015, debit: 42 }, { annee: 2016, debit: 51 }, { annee: 2017, debit: 38 },
  { annee: 2018, debit: 64 }, { annee: 2019, debit: 58 }, { annee: 2020, debit: 71 },
  { annee: 2021, debit: 49 }, { annee: 2022, debit: 66 }, { annee: 2023, debit: 73 },
];

const seuils = [
  { indice: "RX1day", seuil: "> 80 mm", statut: "dépassé", date: "12/07/2026" },
  { indice: "CDD", seuil: "> 20 jours", statut: "normal", date: "—" },
  { indice: "R95p", seuil: "> 60 mm", statut: "dépassé", date: "03/07/2026" },
];

const indicesDefaut = [
  { code: "RX1day", nom: "Précip. max 1 jour", rho: 0.71, n: 9 },
  { code: "R95p", nom: "Précip. jours très humides", rho: 0.64, n: 9 },
  { code: "TXx", nom: "Température max extrême", rho: -0.38, n: 9 },
  { code: "CDD", nom: "Jours secs consécutifs", rho: -0.55, n: 9 },
  { code: "SDII", nom: "Intensité pluie quotidienne", rho: 0.47, n: 9 },
];

const NOMS_INDICES = {
  PRCPTOT: "Précipitation totale annuelle", RX1day: "Précip. max 1 jour", Rx5day: "Précip. max 5 jours",
  R10: "Jours de pluie > 10mm", R20: "Jours de pluie > 20mm", SDII: "Intensité pluie quotidienne",
  CDD: "Jours secs consécutifs", CWD: "Jours humides consécutifs",
  SU25: "Jours chauds (> 25°C)", TR20: "Nuits tropicales (> 20°C)", TN10p: "Nuits fraîches (10e pct)",
  TX10p: "Jours frais (10e pct)", TN90p: "Nuits chaudes (90e pct)", TX90p: "Jours chauds (90e pct)",
  WSDI: "Vagues de chaleur", CSDI: "Vagues de froid",
};

const coherence = [
  { echelle: "1-2 ans", coh: 0.42 }, { echelle: "2-4 ans", coh: 0.81 },
  { echelle: "4-8 ans", coh: 0.58 }, { echelle: "8-16 ans", coh: 0.29 },
];

// --- FONCTIONS STATISTIQUES ---
function rang(valeurs) {
  const indexed = valeurs.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const rangs = new Array(valeurs.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const rangMoyen = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) rangs[indexed[k].i] = rangMoyen;
    i = j + 1;
  }
  return rangs;
}

function spearman(x, y) {
  const n = x.length;
  if (n < 3) return { rho: 0, n };
  const rx = rang(x), ry = rang(y);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  const rho = dx && dy ? num / Math.sqrt(dx * dy) : 0;
  return { rho, n };
}

// --- TRADUCTION DES ERREURS SUPABASE ---
function traduireErreurSupabase(msg) {
  if (!msg) return "Une erreur est survenue.";
  if (msg.includes("already registered")) return "Cet email est déjà utilisé.";
  if (msg.includes("Email not confirmed")) return "Email non confirmé. Vérifie ta boîte mail (et les spams).";
  if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (msg.includes("Password should be")) return "Le mot de passe doit contenir au moins 6 caractères.";
  return msg;
}

// --- HOOKS PERSONNALISÉS ---
function useIndicesExcel(debitsParStationAnnee) {
  const [indices, setIndices] = useState(indicesDefaut);
  const [source, setSource] = useState("données de démonstration");
  const [stationsExcel, setStationsExcel] = useState([]);
  const [stationChoisie, setStationChoisie] = useState(null);

  useEffect(() => {
    fetch("/indices.xlsx")
      .then(res => {
        if (!res.ok) throw new Error("fichier introuvable");
        return res.arrayBuffer();
      })
      .then(buf => {
        const workbook = XLSX.read(buf, { type: "array" });
        let toutesLignes = [];
        workbook.SheetNames.forEach(nom => {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[nom]);
          toutesLignes = toutesLignes.concat(rows);
        });
        if (toutesLignes.length === 0) return;
        const stationsUniques = [...new Set(toutesLignes.map(r => r.Station).filter(Boolean))];
        setStationsExcel(stationsUniques);
        const station = stationsUniques[0];
        setStationChoisie(station);

        const lignesStation = toutesLignes.filter(r => r.Station === station);
        const colonnesExclues = new Set(["Annee", "Année", "Station"]);
        const colonnesIndices = Object.keys(toutesLignes[0]).filter(c => !colonnesExclues.has(c));

        const resultats = colonnesIndices.map(code => {
          const paires = lignesStation
            .map(r => ({ annee: r.Annee ?? r["Année"], val: Number(r[code]) }))
            .filter(p => !isNaN(p.val) && debitsParStationAnnee[p.annee] !== undefined);
          if (paires.length < 3) return null;
          const x = paires.map(p => p.val);
          const y = paires.map(p => debitsParStationAnnee[p.annee]);
          const { rho, n } = spearman(x, y);
          return { code, nom: NOMS_INDICES[code] || code, rho, n };
        }).filter(Boolean);

        if (resultats.length > 0) {
          setIndices(resultats.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho)));
          setSource(`indices.xlsx — station ${station} (${resultats[0].n} années communes)`);
        }
      })
      .catch((err) => {
        console.warn("Impossible de charger indices.xlsx, utilisation des données de démonstration :", err.message);
      });
  }, []);

  return { indices, source, stationsExcel, stationChoisie };
}

// --- COMPOSANTS UI DE BASE ---
function Shell({ title, subtitle, onBack, children }) {
  return (
    <div style={{
      maxWidth: 420, margin: "20px auto", background: "#fff", minHeight: 680,
      fontFamily: "'Inter', system-ui, sans-serif", color: ink, borderRadius: 20,
      overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
    }}>
      <div style={{ background: ink, color: "#fff", padding: "22px 20px 18px" }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "none", border: "none", color: tealLight,
            fontSize: 13, padding: 0, marginBottom: 10, cursor: "pointer"
          }}>← retour</button>
        )}
        <div style={{ fontSize: 11, letterSpacing: "0.08em", color: tealLight, textTransform: "uppercase" }}>SMADH</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "#c9d3d1", marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "18px 20px 28px", background: bg, minHeight: 560 }}>{children}</div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
      border: "1px solid #e4e2d9", ...style
    }}>{children}</div>
  );
}

// --- COMPOSANT : IMPORTATION DES 4 FICHIERS POUR LE SCIENTIFIQUE ---
function DataUploadView({ back }) {
  const [activeTab, setActiveTab] = React.useState('precip');
  const [files, setFiles] = React.useState({ precip:null, tmin:null, tmax:null, debit:null });
  const [data, setData] = React.useState({ precip:null, tmin:null, tmax:null, debit:null });
  const [errors, setErrors] = React.useState({ precip:null, tmin:null, tmax:null, debit:null });
  const [validation, setValidation] = React.useState({ precip:null, tmin:null, tmax:null, debit:null });

  const FILE_CONFIGS = {
    precip:{ label:'Precipitations journalieres', icon:'🌧', unit:'mm', exportName:'Precipitations_25stations_1991_2020.xlsx', sheetName:'Precipitations', expectedCols:26 },
    tmin:  { label:'Temperatures minimales (Tmin)', icon:'❄️', unit:'C', exportName:'Tmin_4stations_1991_2020.xlsx', sheetName:'Tmin', expectedCols:5 },
    tmax:  { label:'Temperatures maximales (Tmax)', icon:'🌡️', unit:'C', exportName:'Tmax_4stations_1991_2020.xlsx', sheetName:'Tmax', expectedCols:5 },
    debit: { label:'Debits journaliers (Bonou)', icon:'💧', unit:'m3/s', exportName:'Debits_Bonou_1991_2020.xlsx', sheetName:'Debits', expectedCols:2 },
  };

  function parseNum(val) {
    if (val === null || val === undefined || val === '') return null;
    const n = parseFloat(String(val).replace(',','.'));
    return isNaN(n) ? null : n;
  }

  function computeStats(d, cols) {
    const res = {};
    cols.forEach(col => {
      const vals = d.map(r => parseNum(r[col])).filter(v => v !== null);
      if (!vals.length) return;
      const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
      const std = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);
      res[col] = { mean:+mean.toFixed(3), std:+std.toFixed(3), min:+Math.min(...vals).toFixed(3), max:+Math.max(...vals).toFixed(3), n:vals.length, missing:d.length-vals.length };
    });
    return res;
  }

  function handleFile(e, key) {
    const file = e.target.files[0];
    if (!file) return;
    setFiles(prev=>({...prev,[key]:file.name}));
    setErrors(prev=>({...prev,[key]:null}));
    setData(prev=>({...prev,[key]:null}));
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, {type:'binary', cellDates:true});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, {raw:false, dateNF:'DD/MM/YYYY'});
        if (!json || !json.length) { setErrors(prev=>({...prev,[key]:'Fichier vide.'})); return; }
        const cols = Object.keys(json[0]);
        const valueCols = cols.filter(c=>!c.toLowerCase().includes('date'));
        const warns = [];
        const cfg = FILE_CONFIGS[key];
        if (json.length < 100) warns.push(`${json.length} lignes (attendu ~10957).`);
        const missing = json.reduce((acc,row)=>acc+valueCols.filter(c=>parseNum(row[c])===null).length,0);
        if (missing > 0) warns.push(`${missing} valeur(s) manquante(s).`);
        if (valueCols.length !== cfg.expectedCols-1) warns.push(`${valueCols.length} colonne(s) (attendu ${cfg.expectedCols-1}).`);
        setValidation(prev=>({...prev,[key]:{warnings:warns}}));
        setData(prev=>({...prev,[key]:json}));
      } catch(err) {
        setErrors(prev=>({...prev,[key]:'Erreur: '+err.message}));
      }
    };
    reader.readAsBinaryString(file);
  }

  function exportFile(key) {
    const d = data[key];
    if (!d) return;
    const cfg = FILE_CONFIGS[key];
    const standardized = d.map(row=>{
      const nr={};
      Object.entries(row).forEach(([k,v])=>{
        const ck=k.trim();
        if(ck.toLowerCase().includes('date')) nr[ck]=v;
        else { const n=parseNum(v); nr[ck]=n!==null?n:v; }
      });
      return nr;
    });
    const cols = Object.keys(d[0]).filter(c=>!c.toLowerCase().includes('date'));
    const stats = computeStats(d, cols);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(standardized), cfg.sheetName);
    const srows = [['Station','Moyenne','Ecart-type','Minimum','Maximum','N valides','Manquants']];
    Object.entries(stats).forEach(([col,s])=>srows.push([col,s.mean,s.std,s.min,s.max,s.n,s.missing]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(srows), 'Statistiques');
    const meta = [['Champ','Valeur'],['Fichier',cfg.exportName],['Type',cfg.label],['Unite',cfg.unit],['Lignes',d.length],['Colonnes',Object.keys(d[0]).length],['Bassin','Oueme a Bonou - Benin'],['Periode','1991-2020'],['Outil','HydroClim Analyzer - SMADH'],['Date',new Date().toLocaleDateString('fr-FR')]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Metadonnees');
    XLSX.writeFile(wb, cfg.exportName);
  }

  const progress = Object.values(data).filter(Boolean).length;
  const cfg = FILE_CONFIGS[activeTab];
  const d = data[activeTab];
  const err = errors[activeTab];
  const v = validation[activeTab];
  const cols = d ? Object.keys(d[0]) : [];
  const valueCols = cols.filter(c=>!c.toLowerCase().includes('date'));

  return (
    <Shell title="Gestion des donnees" subtitle="Upload - Validation - Export Excel" onBack={back}>
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:600}}>Progression</div>
          <span style={{fontSize:13,color:teal,fontWeight:700}}>{progress} / 4</span>
        </div>
        <div style={{height:6,background:'#e4e2d9',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${progress*25}%`,background:teal,borderRadius:4,transition:'width .4s'}}/>
        </div>
        <div style={{fontSize:11,color:slate,marginTop:6}}>
          {progress===4 ? '✓ Tous les fichiers charges - export disponible' : 'Chargez les 4 fichiers pour activer l export global'}
        </div>
      </Card>

      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {Object.entries(FILE_CONFIGS).map(([key,c])=>(
          <div key={key} onClick={()=>setActiveTab(key)} style={{
            flex:1, minWidth:60, padding:'8px 4px', borderRadius:8,
            fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center',
            border: activeTab===key?`1px solid ${teal}`:'1px solid #d3d1c7',
            background: activeTab===key?'#e1f5ee':'#fff',
            color: activeTab===key?teal:slate,
          }}>
            {c.icon} {key.toUpperCase()}{data[key]?' ✓':errors[key]?' !':''}
          </div>
        ))}
      </div>

      <Card>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{cfg.icon} {cfg.label}</div>
        <div style={{fontSize:11,color:slate,marginBottom:12}}>{cfg.description || cfg.unit}</div>

        <div style={{
          border:`2px ${d?`solid ${teal}`:err?'solid #f09595':'dashed #d3d1c7'}`,
          borderRadius:10, padding:20, textAlign:'center', cursor:'pointer',
          background:d?'#f0faf6':err?'#fcebeb':'#fafaf8',
          position:'relative', marginBottom:12,
        }}>
          <input type="file" accept=".xlsx,.xls,.csv"
            style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}
            onChange={e=>handleFile(e,activeTab)} />
          <div style={{fontSize:28,marginBottom:6}}>{d?'✅':err?'❌':'📂'}</div>
          <div style={{fontSize:12,fontWeight:600,color:slate}}>
            {files[activeTab] || 'Glisser ou cliquer pour uploader'}
          </div>
          <div style={{fontSize:10,color:'#9e9c94',marginTop:3}}>
            {d?`${d.length.toLocaleString()} lignes - ${cols.length} colonnes`:'Formats: .xlsx .xls .csv'}
          </div>
          {d && <div style={{fontSize:11,color:teal,fontWeight:600,marginTop:6}}>Charge avec succes ✓</div>}
          {err && <div style={{fontSize:11,color:'#791f1f',fontWeight:600,marginTop:6}}>{err}</div>}
        </div>

        {v && v.warnings.length > 0 && (
          <div style={{background:'#fff8e6',borderLeft:`3px solid ${amber}`,borderRadius:'0 8px 8px 0',padding:'8px 12px',fontSize:11,marginBottom:10}}>
            {v.warnings.map((w,i)=><div key={i}>⚠️ {w}</div>)}
          </div>
        )}
        {d && !err && v && v.warnings.length===0 && (
          <div style={{background:'#f0faf6',borderLeft:`3px solid ${teal}`,borderRadius:'0 8px 8px 0',padding:'8px 12px',fontSize:11,marginBottom:10}}>
            ✓ Format valide — {d.length.toLocaleString()} lignes, {valueCols.length} station(s).
          </div>
        )}

        {d && (
          <>
            <div style={{fontSize:10,color:slate,textTransform:'uppercase',letterSpacing:'.06em',margin:'10px 0 4px'}}>Apercu (5 lignes)</div>
            <div style={{overflowX:'auto',borderRadius:8}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>{cols.slice(0,4).map(c=><th key={c} style={{color:slate,padding:'4px 6px',textAlign:'left',borderBottom:'1px solid #e4e2d9',whiteSpace:'nowrap'}}>{c}</th>)}
                  {cols.length>4&&<th style={{color:slate,padding:'4px 6px'}}>+{cols.length-4}...</th>}</tr>
                </thead>
                <tbody>
                  {d.slice(0,5).map((row,i)=>(
                    <tr key={i}>{cols.slice(0,4).map(c=><td key={c} style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4',whiteSpace:'nowrap'}}>{row[c]??'-'}</td>)}
                    {cols.length>4&&<td style={{padding:'4px 6px'}}>...</td>}</tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{fontSize:10,color:slate,textTransform:'uppercase',letterSpacing:'.06em',margin:'10px 0 4px'}}>Statistiques ({cfg.unit})</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>{['Station','Moy.','Ec.-t.','Min','Max','N'].map(h=><th key={h} style={{color:slate,padding:'4px 6px',textAlign:'left',borderBottom:'1px solid #e4e2d9',whiteSpace:'nowrap'}}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {Object.entries(computeStats(d,valueCols)).map(([col,s])=>(
                    <tr key={col}>
                      <td style={{padding:'4px 6px',color:teal,fontWeight:600,borderBottom:'1px solid #f0ede4'}}>{col}</td>
                      <td style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4'}}>{s.mean}</td>
                      <td style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4'}}>{s.std}</td>
                      <td style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4'}}>{s.min}</td>
                      <td style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4'}}>{s.max}</td>
                      <td style={{padding:'4px 6px',borderBottom:'1px solid #f0ede4'}}>{s.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={()=>exportFile(activeTab)} style={{
              width:'100%',padding:'10px',marginTop:12,
              background:'#e1f5ee',color:teal,border:`1px solid ${teal}`,
              borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'
            }}>
              📥 Exporter {cfg.label}
            </button>
          </>
        )}
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Export global</div>
        {Object.entries(FILE_CONFIGS).map(([key,c])=>(
          <button key={key} disabled={!data[key]} onClick={()=>data[key]&&exportFile(key)} style={{
            width:'100%',padding:'10px',marginBottom:8,
            background:data[key]?'#e1f5ee':'#f5f4f0',
            color:data[key]?teal:slate,
            border:`1px solid ${data[key]?teal:'#d3d1c7'}`,
            borderRadius:8,fontWeight:600,fontSize:12,
            cursor:data[key]?'pointer':'not-allowed'
          }}>
            {c.icon} Exporter {c.label}
          </button>
        ))}
        <button disabled={progress<1} onClick={()=>Object.entries(data).forEach(([k,d],i)=>{if(d)setTimeout(()=>exportFile(k),i*600);})} style={{
          width:'100%',padding:'12px',
          background:progress>=1?teal:'#e4e2d9',
          color:progress>=1?'#fff':slate,
          border:'none',borderRadius:8,fontWeight:600,fontSize:13,
          cursor:progress>=1?'pointer':'not-allowed'
        }}>
          📦 Exporter les {progress} fichier(s) charge(s)
        </button>
      </Card>
    </Shell>
  );
}
// --- VUES / ÉCRANS ---
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const handleConnect = async (e) => {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Le rôle est TOUJOURS lu depuis la base, jamais choisi côté client
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw new Error("Profil introuvable pour ce compte.");

      onLogin(profile.role, profile);
    } catch (error) {
      setErreur(traduireErreurSupabase(error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Connexion" subtitle="Analyse hydroclimatique">
      <Card>
        <form onSubmit={handleConnect}>
          {erreur && (
            <div style={{ fontSize: 12, color: "#791f1f", background: "#fcebeb", border: "1px solid #f09595", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              {erreur}
            </div>
          )}

          <div style={{ fontSize: 13, color: slate, marginBottom: 6 }}>Email</div>
          <input 
            type="email" 
            placeholder="Entrer votre email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d3d1c7", marginBottom: 12, fontSize: 14, boxSizing: "border-box" }}
          />

          <div style={{ fontSize: 13, color: slate, marginBottom: 6 }}>Mot de passe</div>
          <input 
            type="password" 
            placeholder="Entrer votre mot de passe" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d3d1c7", marginBottom: 14, fontSize: 14, boxSizing: "border-box" }}
          />

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px 0", background: teal, color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer"
          }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </Card>
    </Shell>
  );
}

function Dashboard({ role, go, indices }) {
  const nbAlertes = seuils.filter(s => s.statut === "dépassé").length;
  const items = [
    ...(role === "scientifique" ? [{ key: "dataUpload", label: "Importation des Données (4 Fichiers)", desc: "Précipitations, Tmin, Tmax, Débits", n: "NEW" }] : []),
    { key: "predict", label: "Prédiction en temps réel", desc: "Modèle RF & indices climatiques", n: "API" },
    { key: "data", label: "Consultation des données", desc: "Séries climatiques et débits", n: "M2" },
    { key: "os1", label: "Analyse des extrêmes", desc: "Indices ETCCDI · corrélation de Spearman", n: "OS1" },
    { key: "wavelet", label: "Réponse des débits", desc: "Transformée en ondelettes continue", n: "OS2" },
    { key: "os3", label: "Relations temps-fréquence", desc: "Ondelettes croisées · cohérence", n: "OS3" },
    { key: "decision", label: "Guide de Décision", desc: "Matrice cause-effet & préventions", n: "M8" },
    { key: "alerts", label: "Alertes", desc: `${nbAlertes} seuil(s) dépassé(s)`, n: "M7" },
  ];
  const adminItems = [
    { key: "users", label: "Gestion des utilisateurs", desc: "Profils, rôles, accès", n: "M1" },
    { key: "settings", label: "Paramétrage", desc: "Stations, période, seuils", n: "M9" },
  ];

  return (
    <Shell title="Tableau de bord" subtitle={`Connecté · ${role}`}>
      <Card style={{ background: teal, border: "none" }}>
        <div style={{ color: "#e1f5ee", fontSize: 12 }}>Indice le plus influent</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 2 }}>{indices[0]?.code || "—"}</div>
        <div style={{ color: "#c9ece0", fontSize: 12, marginTop: 2 }}>
          ρ = {indices[0]?.rho ? indices[0].rho.toFixed(2) : "0.00"} · {indices[0]?.nom || ""}
        </div>
      </Card>

      {role === "administrateur" && (
        <>
          <div style={{ fontSize: 11, color: slate, textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0 8px" }}>Administration</div>
          {adminItems.map(it => (
            <Card key={it.key} style={{ cursor: "pointer" }}>
              <div onClick={() => go(it.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</div>
                  <div style={{ fontSize: 12, color: slate, marginTop: 2 }}>{it.desc}</div>
                </div>
                <div style={{ fontSize: 11, color: amber, fontWeight: 700, background: "#faeeda", borderRadius: 6, padding: "3px 8px" }}>{it.n}</div>
              </div>
            </Card>
          ))}
          <div style={{ fontSize: 11, color: slate, textTransform: "uppercase", letterSpacing: "0.04em", margin: "10px 0 8px" }}>Analyses</div>
        </>
      )}

      {items.map(it => (
        <Card key={it.key} style={{ cursor: "pointer" }}>
          <div onClick={() => go(it.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 12, color: slate, marginTop: 2 }}>{it.desc}</div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
              color: it.key === "alerts" && nbAlertes > 0 ? "#791f1f" : teal,
              background: it.key === "alerts" && nbAlertes > 0 ? "#fcebeb" : "#e1f5ee"
            }}>{it.n}</div>
          </div>
        </Card>
      ))}
    </Shell>
  );
}

function PredictionView({ back }) {
  const [form, setForm] = useState({
    PRCPTOT: "", Rx5day: "", TR: "", CSDI: "", CDD: "", Rx1day: ""
  });
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [erreur, setErreur] = useState("");

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #d3d1c7", fontSize: 14, boxSizing: "border-box",
    background: "#fff", color: ink, outline: "none", marginTop: 4
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: slate, display: "block", marginBottom: 2
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PRCPTOT: parseFloat(form.PRCPTOT),
          Rx5day: parseFloat(form.Rx5day),
          TR: parseFloat(form.TR),
          CSDI: parseFloat(form.CSDI),
          CDD: parseFloat(form.CDD),
          Rx1day: parseFloat(form.Rx1day)
        })
      });
      if (!response.ok) throw new Error(`Le serveur de prédiction a répondu avec le statut ${response.status}.`);
      const data = await response.json();
      setResultat(data);

      const nouvelleLigne = {
        Date: new Date().toLocaleString(),
        ...form,
        Q5: data.Q5 ?? data.q5 ?? "",
        Q50: data.Q50 ?? data.q50 ?? "",
        Q95: data.Q95 ?? data.q95 ?? ""
      };
      setHistorique(prev => [...prev, nouvelleLigne]);
    } catch (err) {
      console.error("Erreur lors de la prédiction", err);
      setErreur("Impossible de joindre le serveur de prédiction. Vérifie que l'API est bien déployée et accessible.");
    } finally {
      setLoading(false);
    }
  };

  const telechargerExcel = () => {
    if (historique.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(historique);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prédictions");
    XLSX.writeFile(workbook, "historique_predictions.xlsx");
  };

  const champsConfig = [
    { name: "PRCPTOT", label: "Précip. annuelle totale (PRCPTOT en mm)" },
    { name: "Rx5day", label: "Précip. max 5 jours (Rx5day en mm)" },
    { name: "TR", label: "Nuits tropicales (TR en nb jours)" },
    { name: "CSDI", label: "CSDI (Indice vague de froid)" },
    { name: "CDD", label: "CDD (Jours consécutifs secs)" },
    { name: "Rx1day", label: "Rx1day (Précipitation max 1 jour)" },
  ];

  return (
    <Shell title="Prédiction de Débit" subtitle="Modèle Random Forest" onBack={back}>
      <Card>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>Paramètres climatiques d'entrée (ETCCDI)</div>

          {erreur && (
            <div style={{ fontSize: 12, color: "#791f1f", background: "#fcebeb", border: "1px solid #f09595", borderRadius: 8, padding: "8px 10px" }}>
              {erreur}
            </div>
          )}

          {champsConfig.map((champ) => (
            <div key={champ.name}>
              <label style={labelStyle}>{champ.label}</label>
              <input
                type="number"
                step="any"
                name={champ.name}
                value={form[champ.name]}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={{ marginTop: 10, padding: "12px", background: teal, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Calcul en cours..." : "Prédiction"}
          </button>
        </form>
      </Card>

      {resultat && (
        <Card style={{ background: "#e1f5ee", border: `1px solid ${tealLight}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: teal, marginBottom: 6 }}>RÉSULTATS ESTIMÉS (BONOU) :</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            • Débit d'étiage (Q5) : <b>{resultat.Q5 ?? resultat.q5 ?? "—"} m³/s</b><br />
            • Débit médian (Q50) : <b>{resultat.Q50 ?? resultat.q50 ?? "—"} m³/s</b><br />
            • Débit de crue extrême (Q95) : <b>{resultat.Q95 ?? resultat.q95 ?? "—"} m³/s</b>
          </div>
        </Card>
      )}

      {historique.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Historique ({historique.length} simulation(s))</div>
          <button onClick={telechargerExcel} style={{ width: "100%", padding: "10px", background: ink, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            📥 Télécharger le fichier Excel complet
          </button>
        </Card>
      )}
    </Shell>
  );
}

function Placeholder({ title, back }) {
  return (
    <Shell title={title} onBack={back}>
      <Card>
        <div style={{ fontSize: 13, color: slate }}>Écran non encore développé dans ce prototype.</div>
      </Card>
    </Shell>
  );
}

function DataView({ back }) {
  const [station, setStation] = useState(stations[0]);
  return (
    <Shell title="Données hydroclimatiques" onBack={back}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {stations.map(s => (
          <button key={s} onClick={() => setStation(s)} style={{
            padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: s === station ? `1.5px solid ${teal}` : "1px solid #d3d1c7",
            background: s === station ? "#e1f5ee" : "#fff", color: s === station ? teal : slate
          }}>{s}</button>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Débits observés — {station}</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={debits}>
            <CartesianGrid stroke="#eee" vertical={false} />
            <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={28} />
            <Tooltip />
            <Line type="monotone" dataKey="debit" stroke={teal} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Statistiques descriptives</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
          <div>Moyenne <b>57.9 m³/s</b></div>
          <div>Écart-type <b>11.4</b></div>
          <div>Minimum <b>38 m³/s</b></div>
          <div>Maximum <b>73 m³/s</b></div>
        </div>
      </Card>
    </Shell>
  );
}

function OS1({ back, indices, source }) {
  return (
    <Shell title="Indices extrêmes · OS1" subtitle="Corrélation de Spearman avec les débits" onBack={back}>
      <div style={{ fontSize: 11, color: slate, marginBottom: 10 }}>Source : {source}</div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Classement des indices ETCCDI</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={indices} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => typeof v === 'number' ? v.toFixed(2) : v} />
            <Bar dataKey="rho" radius={4}>
              {indices.map((d, i) => (
                <Cell key={i} fill={Math.abs(d.rho) > 0.5 ? teal : "#c9c7bd"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: slate, marginTop: 6 }}>Vert = |ρ| &gt; 0.5 · gris = en dessous</div>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Interprétation automatique</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <b>{indices[0]?.code}</b> ({indices[0]?.nom}) présente la corrélation la plus forte avec les débits
          (ρ = {indices[0]?.rho ? indices[0].rho.toFixed(2) : "0.00"}, sur {indices[0]?.n || 0} années communes).
        </div>
      </Card>
    </Shell>
  );
}

function Wavelet({ back }) {
  return (
    <Shell title="Réponse des débits · OS2" subtitle="Transformée en ondelettes continue" onBack={back}>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Scalogramme CWT (simulation)</div>
        <svg viewBox="0 0 300 140" width="100%" height="140">
          <defs>
            <linearGradient id="heat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={amber} stopOpacity="0.85" />
              <stop offset="100%" stopColor={teal} stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="280" height="110" rx="6" fill="url(#heat)" />
          <text x="10" y="132" fontSize="9" fill={slate}>2015</text>
          <text x="270" y="132" fontSize="9" fill={slate}>2023</text>
        </svg>
      </Card>
    </Shell>
  );
}

function OS3({ back }) {
  return (
    <Shell title="Relations temps-fréquence · OS3" subtitle="Ondelettes croisées (XWT) et cohérence (WTC)" onBack={back}>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Cohérence en ondelettes (WTC)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={coherence}>
            <CartesianGrid stroke="#eee" vertical={false} />
            <XAxis dataKey="echelle" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} width={28} />
            <Tooltip />
            <Bar dataKey="coh" radius={4}>
              {coherence.map((d, i) => (
                <Cell key={i} fill={d.coh > 0.6 ? teal : "#c9c7bd"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Shell>
  );
}

function Alerts({ back }) {
  return (
    <Shell title="Alertes hydroclimatiques" subtitle="Module 7" onBack={back}>
      {seuils.filter(s => s.statut === "dépassé").map((s, i) => (
        <Card key={i} style={{ background: "#fcebeb", border: "1px solid #f09595" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#791f1f" }}>{s.indice} — seuil dépassé</div>
          <div style={{ fontSize: 12, color: "#a32d2d", marginTop: 4 }}>Seuil : {s.seuil}</div>
        </Card>
      ))}
    </Shell>
  );
}

function DecisionGuide({ back }) {
  return (
    <Shell title="Guide de Décision" subtitle="Comprendre et anticiper les impacts" onBack={back}>
      <Card style={{ background: teal, color: "#fff" }}>
        <div style={{ fontSize: 13, color: "#e1f5ee" }}>
          Module de traduction des indices extrêmes en règles opérationnelles (Bonou).
        </div>
      </Card>
    </Shell>
  );
}

// --- COMPOSANT PRINCIPAL ---
const debitsParAnnee = Object.fromEntries(debits.map(d => [d.annee, d.debit]));

export default function App() {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const { indices, source } = useIndicesExcel(debitsParAnnee);

  if (screen === "login") {
    return (
      <Login
        onLogin={(r, p) => {
          setRole(r);
          setProfile(p);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "dashboard") {
    return <Dashboard role={role} go={(k) => setScreen(k)} indices={indices} />;
  }

  if (screen === "dataUpload") return <DataUploadView back={() => setScreen("dashboard")} />;
  if (screen === "predict") return <PredictionView back={() => setScreen("dashboard")} />;
  if (screen === "data") return <DataView back={() => setScreen("dashboard")} />;
  if (screen === "os1") return <OS1 back={() => setScreen("dashboard")} indices={indices} source={source} />;
  if (screen === "wavelet") return <Wavelet back={() => setScreen("dashboard")} />;
  if (screen === "os3") return <OS3 back={() => setScreen("dashboard")} />;
  if (screen === "alerts") return <Alerts back={() => setScreen("dashboard")} />;
  if (screen === "decision") return <DecisionGuide back={() => setScreen("dashboard")} indices={indices} />;
  if (screen === "users") return <Placeholder title="Gestion des utilisateurs" back={() => setScreen("dashboard")} />;
  if (screen === "settings") return <Placeholder title="Paramétrage" back={() => setScreen("dashboard")} />;

  return null;
}