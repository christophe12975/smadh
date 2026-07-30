from pathlib import Path
import os
import matplotlib

# Désactive l'ouverture des fenêtres graphiques pour éviter tout blocage
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error

# Dossier backend
BASE_DIR = Path(__file__).resolve().parent

def executer_script():
    print("🚀 Chargement des fichiers Excel et préparation des données (avec décalage temporel des indices)...")

    # ==============================================================================
    # 1. CHARGEMENT ET PREPARATION DES DONNEES
    # ==============================================================================
    file_debit = BASE_DIR / 'debit_bonou.xlsx'
    file_precip = BASE_DIR / 'Données_pluviometriques_1991_2020_finale.xlsx'
    file_tmin = BASE_DIR / 'Temperature_minimale_Ctn_Boh_Sav_Par_Version_finale.xlsx'
    file_tmax = BASE_DIR / 'Temperature_maximales_Ctn_Boh_Sav_Par_Version_finale.xlsx'
    file_indices = BASE_DIR / 'Bases_indices_climatiques_selectionnés.xlsx'

    # Importation des fichiers principaux avec 'Date'
    df_debit = pd.read_excel(file_debit, parse_dates=['Date'])
    df_precip = pd.read_excel(file_precip, parse_dates=['Date'])
    df_tmin = pd.read_excel(file_tmin, parse_dates=['Date'])
    df_tmax = pd.read_excel(file_tmax, parse_dates=['Date'])

    # Chargement du fichier des indices
    df_indices = pd.read_excel(file_indices)
    
    df_debit['Annee'] = df_debit['Date'].dt.year
    df_debit = df_debit.rename(columns={df_debit.columns[1]: 'Q'})

    # Extraction des stations
    stations_p = [col for col in df_precip.columns if col != 'Date']
    stations_t = [col for col in df_tmin.columns if col != 'Date']

    # Renommage des températures
    df_tmin_renamed = df_tmin.rename(columns={col: f"{col}_tmin" for col in stations_t})
    df_tmax_renamed = df_tmax.rename(columns={col: f"{col}_tmax" for col in stations_t})

    # Fusion journalière de base
    df_all = df_debit.merge(df_precip, on='Date') \
                     .merge(df_tmin_renamed, on='Date') \
                     .merge(df_tmax_renamed, on='Date')

    # CORRECTION METHODOLOGIQUE : 
    # Pour éviter d'utiliser les indices de l'année en cours (fuite du futur),
    # on associe les indices de l'année (N-1) à l'année N, ou on décale la référence.
    df_all['Annee_ref'] = df_all['Date'].dt.year - 1  # Utilise les indices de l'année précédente
    
    df_indices = df_indices.rename(columns={'Annee': 'Annee_ref'})

    # Fusion avec les indices climatiques décalés
    df_all = df_all.merge(df_indices, on='Annee_ref', how='left')

    df_all = df_all.sort_values('Date').reset_index(drop=True)

    # ==============================================================================
    # 2. TRAITEMENT CLIMATIQUE & VARIABLES HYDROLOGIQUES
    # ==============================================================================
    P_mean = df_all[stations_p].mean(axis=1)

    tmin_cols = [f"{col}_tmin" for col in stations_t]
    tmax_cols = [f"{col}_tmax" for col in stations_t]

    Tmin_mean = df_all[tmin_cols].mean(axis=1)
    Tmax_mean = df_all[tmax_cols].mean(axis=1)
    Tmean = (Tmin_mean + Tmax_mean) / 2.0

    # Estimation ETP (Hargreaves)
    Ra = 15.0  
    ETP = 0.0023 * Ra * (Tmean + 17.8) * np.sqrt(np.maximum(0, Tmax_mean - Tmin_mean))

    # ==============================================================================
    # 3. CREATION DE LA MATRICE DE PREDICTEURS
    # ==============================================================================
    X = pd.DataFrame(index=df_all.index)

    # A. SAISONNALITÉ
    X['Mois'] = df_all['Date'].dt.month
    X['Jour_Annee'] = df_all['Date'].dt.dayofyear

    # B. LAGS ET CUMULS DE PLUIE A COURT ET LONG TERME
    X['P_t0'] = P_mean
    X['P_t1'] = P_mean.shift(1)
    X['P_t2'] = P_mean.shift(2)
    X['P_t3'] = P_mean.shift(3)
    X['P_t5'] = P_mean.shift(5)
    X['P_t10'] = P_mean.shift(10)
    X['P_t15'] = P_mean.shift(15)

    X['P_cum3'] = P_mean.rolling(window=3).sum()
    X['P_cum7'] = P_mean.rolling(window=7).sum()
    X['P_cum15'] = P_mean.rolling(window=15).sum() 
    X['P_cum30'] = P_mean.rolling(window=30).sum() 
    X['P_cum60'] = P_mean.rolling(window=60).sum() 

    # C. LES INDICES CLIMATIQUES ANNUELS (Désormais décalés à N-1)
    X['PRCPTOT'] = df_all['PRCPTOT']
    X['Rx1day'] = df_all['Rx1day']
    X['Rx5day'] = df_all['Rx5day']
    X['CDD'] = df_all['CDD']
    X['TR'] = df_all['TR']
    X['CSDI'] = df_all['CSDI']

    # D. TEMPÉRATURES ET ETP
    X['Tmean'] = Tmean
    X['ETP_t0'] = ETP
    X['ETP_t1'] = ETP.shift(1)

    # E. PLUIES INDIVIDUELLES PAR STATION
    for station in stations_p:
        X[f"P_{station}"] = df_all[station]

    y = df_all['Q']
    dates = df_all['Date']

    # Nettoyage des NaNs générés par les retardements et la première année sans indices (1991)
    valid_mask = ~X.isna().any(axis=1) & ~y.isna()
    X_clean = X[valid_mask].reset_index(drop=True)
    y_clean = y[valid_mask].reset_index(drop=True)
    dates_clean = dates[valid_mask].reset_index(drop=True)

    # ==============================================================================
    # 4. DIVISION TRAIN / TEST (Chronologique 75% / 25%)
    # ==============================================================================
    split_idx = int(len(X_clean) * 0.75)

    X_train, X_test = X_clean.iloc[:split_idx], X_clean.iloc[split_idx:]
    y_train, y_test = y_clean.iloc[:split_idx], y_clean.iloc[split_idx:]
    dates_test = dates_clean.iloc[split_idx:]

    # ==============================================================================
    # 5. ENTRAINEMENT DE LA RANDOM FOREST OPTIMISÉE
    # ==============================================================================
    print("🌲 Entraînement de la Random Forest en cours...")
    rf = RandomForestRegressor(
        n_estimators=300, 
        max_depth=18,
        min_samples_leaf=3,
        max_features='sqrt',
        random_state=42, 
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # SAUVEGARDE AUTOMATIQUE DU MODÈLE
    modele_path = BASE_DIR / 'modele_debit_rf.pkl'
    joblib.dump(rf, modele_path)
    print(f"✅ Fichier modèle généré avec succès : {modele_path}")

    # Prédiction sur le jeu de test
    y_pred = rf.predict(X_test)

    # ==============================================================================
    # 6. ENREGISTREMENT AUTOMATIQUE DES PREDICTIONS DANS UN FICHIER EXCEL
    # ==============================================================================
    print("💾 Enregistrement des prédictions dans le fichier Excel...")
    df_historique = pd.DataFrame({
        'Date': dates_test.values,
        'Debit_Observe': y_test.values,
        'Debit_Predi': y_pred,
        'PRCPTOT': X_test['PRCPTOT'].values,
        'Rx1day': X_test['Rx1day'].values,
        'Rx5day': X_test['Rx5day'].values,
        'CDD': X_test['CDD'].values,
        'TR': X_test['TR'].values,
        'CSDI': X_test['CSDI'].values
    })
    
    excel_path = BASE_DIR / 'historique_predictions.xlsx'
    df_historique.to_excel(excel_path, index=False)
    print(f"✅ Fichier Excel des prédictions mis à jour : {excel_path}")

    # ==============================================================================
    # 7. EVALUATION DES PERFORMANCES (R² et RMSE)
    # ==============================================================================
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print(f"\n--- RÉSULTATS DE VALIDATION SUR BONOU (AVEC DÉCALAGE N-1) ---")
    print(f"R²  : {r2:.3f}")
    print(f"RMSE: {rmse:.3f} m³/s\n")

    # ==============================================================================
    # 8. VISUALISATION ET SAUVEGARDE SANS BLOCAGE
    # ==============================================================================
    print("📊 Sauvegarde des graphiques...")

    # 1. Hydrogramme
    plt.figure(figsize=(12, 5))
    plt.plot(dates_test, y_test, label='Débit Observé', color='black', alpha=0.8)
    plt.plot(dates_test, y_pred, label=f'Débit Prédit (RF) - R²: {r2:.2f}', color='red', linestyle='--', alpha=0.8)
    plt.title(f"Hydrogramme de Validation à Bonou (Décalé N-1) - R²: {r2:.2f}")
    plt.xlabel('Date')
    plt.ylabel('Débit (m³/s)')
    plt.legend()
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig(BASE_DIR / 'hydrogramme.png', dpi=300, bbox_inches='tight')
    plt.close()

    # 2. Importance des variables (Top 15)
    importances = rf.feature_importances_
    indices = np.argsort(importances)[::-1][:15]

    plt.figure(figsize=(10, 5))
    plt.bar(range(len(indices)), importances[indices], color='steelblue', align='center')
    plt.xticks(range(len(indices)), [X_clean.columns[i] for i in indices], rotation=45, ha='right')
    plt.ylabel('Score d\'Importance (Feature Importance)')
    plt.title('Top 15 des Variables Explicatives les Plus Importantes')
    plt.grid(True, axis='y', linestyle=':', alpha=0.6)
    plt.tight_layout()
    plt.savefig(BASE_DIR / 'importance_variables.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("🎉 Traitement terminé à 100% ! Les indices sont correctement décalés à N-1.")

if __name__ == '__main__':
    executer_script()