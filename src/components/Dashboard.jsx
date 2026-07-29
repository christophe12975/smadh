import React from 'react';
import IndicatorsCard from './IndicatorsCard';

export default function Dashboard() {
  
  // Fonction pour déclencher l'impression / sauvegarde en PDF
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Zone de contenu principal */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        
        {/* En-tête du Tableau de Bord */}
        <header style={{ 
          marginBottom: '32px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>
              Tableau décisionnel
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Analyse hydro-climatique, suivi des extrêmes et guide d'anticipation
            </p>
          </div>

          {/* Bouton d'exportation PDF */}
          <button 
            onClick={handlePrintPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#0f6e56',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            📄 Exporter la fiche en PDF
          </button>
        </header>

        {/* 1. Cartes d'indicateurs */}
        <section style={{ marginBottom: '24px' }}>
          <IndicatorsCard />
        </section>

        {/* 2. Zone réservée au graphique */}
        <section style={{ marginBottom: '24px' }}>
          <div style={{
            background: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            📊 Le graphique de suivi des débits (`ClimateChart`) s'affichera ici dès qu'il sera complété.
          </div>
        </section>

        {/* 3. GUIDE DE DÉCISION & SYNTHÈSE D'ANTICIPATION */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Titre de section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>
              🎯 Guide de Décision & Anticipation des Impacts
            </h2>
          </div>

          {/* Cartes de Stratégies de Prévention */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '16px' 
          }}>
            
            {/* Règle 1 : Crue à Bonou */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: '5px solid #d97706',
              borderTop: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Alerte Pluies Intenses (Rx5day)
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginTop: '6px' }}>
                Prévention des Crues à Bonou
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                En cas de pluies intenses répétées sur 5 jours (<b>Rx5day</b>), déclencher immédiatement le <b>niveau de pré-alerte crue</b> à la station de Bonou.
              </p>
            </div>

            {/* Règle 2 : Sécheresse & Etiage */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: '5px solid #dc2626',
              borderTop: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Alerte Sécheresse (CDD &gt; 70j)
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginTop: '6px' }}>
                Soutien des Débits d'Étiage
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                En période de sécheresse prolongée (<b>CDD &gt; 70 jours</b>), restreindre préventivement les prélèvements d'eau pour protéger les débits bas (<b>Q95</b>).
              </p>
            </div>

          </div>

          {/* Tableau Récapitulatif Cause ➔ Effet */}
          <div style={{
            background: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '16px' }}>
              📋 Tableau Récapitulatif : Cause ➔ Effet ➔ Recommandation
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 8px' }}>Indice / Event (Cause)</th>
                    <th style={{ padding: '12px 8px' }}>Impact Attendu (Effet)</th>
                    <th style={{ padding: '12px 8px' }}>Action Recommandée</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-main)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                      Pluies de 5 jours (Rx5day)
                    </td>
                    <td style={{ padding: '12px 8px', color: '#d97706', fontWeight: '500' }}>
                      Crue à Bonou (Réponse rapide du bassin)
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      Suivi pluviométrique strict & pré-alerte
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                      Sécheresses longues (CDD &gt; 70j)
                    </td>
                    <td style={{ padding: '12px 8px', color: '#dc2626', fontWeight: '500' }}>
                      Baisse des réserves & chute du débit d'étiage
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      Mise en place du plan de soutien d'étiage
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}