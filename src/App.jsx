import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { loadExcel } from "./services/dataReader";

console.log("SMADH APP CHARGE");
console.log("APP.JSX EST BIEN CHARGE");

// --- PALETTE DE COULEURS & CONSTANTES ---
const ink = "#12242b";
const teal = "#0f6e56";
const tealLight = "#9fe1cb";
const slate = "#5f5e5a";
const amber = "#ba7517";
const bg = "#f3f6f5";

const stations = ["Bagré", "Kompienga", "Léré", "Nakambé"];

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
      .catch(() => {});
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

// --- VUES / ÉCRANS ---
function Login({ onLogin }) {
  const [role, setRole] = useState("scientifique");
  return (
    <Shell title="Connexion" subtitle="Analyse hydroclimatique">
      <Card>
        <div style={{ fontSize: 13, color: slate, marginBottom: 6 }}>Identifiant</div>
        <div style={{ border: "1px solid #d3d1c7", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 14 }}>a.kabore</div>
        <div style={{ fontSize: 13, color: slate, marginBottom: 6 }}>Mot de passe</div>
        <div style={{ border: "1px solid #d3d1c7", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 14 }}>••••••••</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["scientifique", "administrateur"].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: role === r ? `1.5px solid ${teal}` : "1px solid #d3d1c7",
              background: role === r ? "#e1f5ee" : "#fff", color: role === r ? teal : slate,
              fontWeight: role === r ? 600 : 400
            }}>{r}</button>
          ))}
        </div>
        <button onClick={() => onLogin(role)} style={{
          width: "100%", padding: "12px 0", background: teal, color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer"
        }}>Se connecter</button>
      </Card>
      <div style={{ fontSize: 12, color: slate, textAlign: "center" }}>Rôle simulé — sans backend réel</div>
    </Shell>
  );
}

function Dashboard({ role, go, indices }) {
  const nbAlertes = seuils.filter(s => s.statut === "dépassé").length;
  const items = [
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
      const data = await response.json();
      setResultat(data);

      const nouvelleLigne = {
        Date: new Date().toLocaleString(),
        PRCPTOT: form.PRCPTOT,
        Rx5day: form.Rx5day,
        TR: form.TR,
        CSDI: form.CSDI,
        CDD: form.CDD,
        Rx1day: form.Rx1day,
        Q5: data.Q5 ?? data.q5 ?? "",
        Q50: data.Q50 ?? data.q50 ?? "",
        Q95: data.Q95 ?? data.q95 ?? ""
      };
      setHistorique(prev => [...prev, nouvelleLigne]);

    } catch (err) {
      console.error("Erreur lors de la prédiction", err);
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
          
          {champsConfig.map((champ) => (
            <div key={champ.name} className="form-group">
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

          <button type="submit" style={{ marginTop: 10, padding: "12px", background: teal, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Calcul en cours..." : "Prédiction"}
          </button>
        </form>
      </Card>

      {resultat && (
        <Card style={{ background: "#e1f5ee", border: `1px solid ${tealLight}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: teal, marginBottom: 6 }}>RÉSULTATS ESTIMÉS (BONOU) :</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            • Débit d'étiage ($Q_5$) : <b>{resultat.Q5 ?? resultat.q5 ?? "—"} m³/s</b><br />
            • Débit médian ($Q_{50}$) : <b>{resultat.Q50 ?? resultat.q50 ?? "—"} m³/s</b><br />
            • Débit de crue extrême ($Q_{95}$) : <b>{resultat.Q95 ?? resultat.q95 ?? "—"} m³/s</b>
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
        <div style={{ fontSize: 11, color: slate, marginTop: 6 }}>Vert = |ρ| &gt; 0.5 (seuil indicatif) · gris = en dessous</div>
      </Card>
      <Card style={{ background: "#fceeda", border: "1px solid #f0c98c" }}>
        <div style={{ fontSize: 12, color: "#633806" }}>
          Le seuil de couleur ci-dessus n'est pas un test de significativité statistique formel — juste un repère visuel.
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Interprétation automatique</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <b>{indices[0]?.code}</b> ({indices[0]?.nom}) présente la corrélation la plus forte avec les débits
          (ρ = {indices[0]?.rho ? indices[0].rho.toFixed(2) : "0.00"}, sur {indices[0]?.n || 0} années communes).
        </div>
        <div style={{ fontSize: 11, color: amber, marginTop: 8 }}>Généré par règles expertes — pas de LLM sur les résultats numériques</div>
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
          <text x="4" y="18" fontSize="9" fill={slate} transform="rotate(-90 4 18)">périodes courtes</text>
        </svg>
        <div style={{ fontSize: 11, color: slate, marginTop: 6 }}>Zone chaude = forte énergie spectrale (périodes 2018–2020)</div>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Résumé automatique</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Une réponse marquée des débits est détectée sur l'échelle 2–4 ans entre 2018 et 2020,
          coïncidant avec une hausse des précipitations extrêmes.
        </div>
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
        <div style={{ fontSize: 11, color: slate, marginTop: 6 }}>Vert = forte cohérence (&gt; 0.6)</div>
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Relation de phase (XWT)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 20, color: teal }}>→</span>
          <span>Indices et débits en phase sur l'échelle 2–4 ans (flèche horizontale droite)</span>
        </div>
      </Card>
    </Shell>
  );
}

function Alerts({ back }) {
  return (
    <Shell title="Alertes hydroclimatiques" subtitle="Module 7" onBack={back}>
      {seuils.filter(s => s.statut === "dépassé").map((s, i) => (
        <Card key={i} style={{ background: "#fcebeb", border: "1px solid #f09595" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#791f1f" }}>{s.indice} — seuil dépassé</div>
            <div style={{ fontSize: 11, color: "#791f1f" }}>{s.date}</div>
          </div>
          <div style={{ fontSize: 12, color: "#a32d2d", marginTop: 4 }}>Seuil configuré : {s.seuil}</div>
        </Card>
      ))}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Historique des seuils</div>
        {seuils.map((s, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "8px 0",
            borderBottom: i < seuils.length - 1 ? "1px solid #eee" : "none", fontSize: 13
          }}>
            <span>{s.indice} <span style={{ color: slate, fontSize: 12 }}>({s.seuil})</span></span>
            <span style={{ color: s.statut === "dépassé" ? "#a32d2d" : teal, fontWeight: 600, fontSize: 12 }}>{s.statut}</span>
          </div>
        ))}
      </Card>
    </Shell>
  );
}

function DecisionGuide({ back, indices }) {
  // Fonction d'export / impression PDF native du navigateur
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <Shell title="Guide de Décision" subtitle="Comprendre et anticiper les impacts" onBack={back}>
      {/* Conteneur avec espacement en bas pour ne pas cacher le contenu sous le bouton fixe */}
      <div style={{ paddingBottom: 70 }}>
        <Card style={{ background: teal, color: "#fff" }}>
          <div style={{ fontSize: 11, color: tealLight, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Synthèse d'Anticipation · Bonou
          </div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5, color: "#e1f5ee" }}>
            Ce module traduit les indices de météo extrême (ETCCDI) en règles opérationnelles pour la gestion des risques hydrologiques.
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 12 }}>
            🛡️ Stratégies de Prévention
          </div>

          <div style={{
            background: "#e1f5ee", padding: "12px", borderRadius: 8, marginBottom: 10,
            borderLeft: `4px solid ${teal}`
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: teal }}>
              Pluies intenses répétées (Rx5day)
            </div>
            <div style={{ fontSize: 12, color: ink, marginTop: 4, lineHeight: 1.4 }}>
              En cas de cumul élevé sur 5 jours, <b>déclencher immédiatement le niveau de pré-alerte crue à la station de Bonou</b>.
            </div>
          </div>

          <div style={{
            background: "#fcebeb", padding: "12px", borderRadius: 8,
            borderLeft: "4px solid #a32d2d"
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#791f1f" }}>
              Sécheresse prolongée (CDD &gt; 70 jours)
            </div>
            <div style={{ fontSize: 12, color: ink, marginTop: 4, lineHeight: 1.4 }}>
              En période de jours secs consécutifs élevés, <b>restreindre préventivement les prélèvements d'eau</b> pour préserver le débit d'étiage ($Q_{95}$).
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 10 }}>
            📊 Tableau Récapitulatif Cause ➔ Effet
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: bg, textAlign: "left", color: slate }}>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid #d3d1c7" }}>Cause (Indice)</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid #d3d1c7" }}>Effet Attendu</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid #d3d1c7" }}>Recommandation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Pluies 5 jours (Rx5day)</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", color: "#a32d2d" }}>Crue à Bonou (réponse rapide)</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee" }}>Suivi pluviométrique strict</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Sécheresses longues (CDD)</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", color: amber }}>Baisse des réserves & étiage</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee" }}>Plan de soutien d'étiage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Bouton fixe en bas de l'écran */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "12px 20px",
        background: "#fff",
        boxShadow: "0 -4px 10px rgba(0,0,0,0.1)",
        zIndex: 100,
        maxWidth: 420,
        margin: "0 auto"
      }}>
        <button
          onClick={handleExportPDF}
          style={{
            width: "100%", padding: "12px 0", background: ink, color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          📄 Imprimer / Télécharger la Fiche Décisionnelle (PDF)
        </button>
      </div>
    </Shell>
  );
}

// --- COMPOSANT PRINCIPAL ---
const debitsParAnnee = Object.fromEntries(debits.map(d => [d.annee, d.debit]));

export default function App() {
  console.log("APP SMADH CHARGE");
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("scientifique");
  const { indices, source } = useIndicesExcel(debitsParAnnee);

  useEffect(() => {
    async function testLecture() {
      try {
        if (typeof loadExcel === 'function') {
          const debit = await loadExcel("/DATA/debit_bonou.xlsx");
          console.log("Données débit :", debit);
        }
      } catch (error) {
        console.error("Erreur lecture Excel :", error);
      }
    }
    testLecture();
  }, []);

  if (screen === "login") {
    return <Login onLogin={(r) => { setRole(r); setScreen("dashboard"); }} />;
  }

  if (screen === "dashboard") {
    return <Dashboard role={role} go={(k) => setScreen(k)} indices={indices} />;
  }

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