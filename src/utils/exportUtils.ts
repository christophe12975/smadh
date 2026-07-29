import { Station } from './BasinMap';

// Export CSV des indices calculés
export const exportStationsToCSV = (stations: Station[]) => {
  const headers = ['ID', 'Station', 'Latitude', 'Longitude', 'Statut', 'Rx5day (mm)', 'CDD (jours)', 'Completude (%)'];
  
  const rows = stations.map(s => [
    s.id,
    `"${s.name}"`,
    s.lat,
    s.lng,
    s.status,
    s.rx5day,
    s.cdd,
    s.completeness
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `HydroClim_Oueme_Export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Imprime/Exporte un Bulletin d'Alerte Synthétique au format PDF
export const printHydroAlertBulletin = (stations: Station[]) => {
  const dangerStations = stations.filter(s => s.status === 'danger');
  const alertCount = dangerStations.length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bulletin d'Alerte Hydro-Climatique - Ouémé à Bonou</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .title { font-size: 22px; font-weight: bold; color: #0284c7; }
          .subtitle { font-size: 12px; color: #64748b; }
          .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin-bottom: 20px; color: #991b1b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background: #f1f5f9; }
          .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">HYDROCLIM ANALYZER</div>
            <div class="subtitle">Bulletin de Synthèse Décisionnelle & Alertes</div>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <strong>Bassin :</strong> Ouémé à Bonou<br/>
            <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        <div class="alert-box">
          <strong>Niveau de Vigilance Global :</strong> ${alertCount > 0 ? 'ALERTE CRUE DÉTECTÉE' : 'SITUATION NORMALE'}<br/>
          Nombre de stations au-delà du seuil critique (Rx5day) : <strong>${alertCount} / ${stations.length}</strong>
        </div>

        <h3>Stations en situation d'Alerte ou Vigilance</h3>
        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th>Statut</th>
              <th>Cumul 5j (Rx5day)</th>
              <th>Jours Secs (CDD)</th>
            </tr>
          </thead>
          <tbody>
            ${stations.filter(s => s.status !== 'normal').map(s => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.status.toUpperCase()}</td>
                <td>${s.rx5day} mm</td>
                <td>${s.cdd} jours</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Généré automatiquement par HydroClim Analyzer • Données climatiques du bassin de l'Ouémé à Bonou (1991–2020)
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};