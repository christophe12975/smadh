import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error
from pathlib import Path
import pandas as pd

# Détermine automatiquement le dossier où se trouve script_rf.py (dossier backend)
BASE_DIR = Path(__file__).resolve().parent


# Importation
df_debit  = pd.read_excel(file_debit, parse_dates=['Date'])
df_precip = pd.read_excel(file_precip, parse_dates=['Date'])
df_tmin   = pd.read_excel(file_tmin, parse_dates=['Date'])
df_tmax   = pd.read_excel(file_tmax, parse_dates=['Date'])
# ==============================================================================
# 1. CHARGEMENT ET PREPARATION DES DONNEES
# ==============================================================================
file_debit  = BASE_DIR / 'debit_bonou.xlsx'
file_precip = BASE_DIR / 'Données_pluviometriques_1991_2020_finale.xlsx'
file_tmin   = BASE_DIR / 'Temperature_minimale_Ctn_Boh_Sav_Par_Version_finale.xlsx'
file_tmax   = BASE_DIR / 'Temperature_maximales_Ctn_Boh_Sav_Par_Version_finale.xlsx'

# Importation et conversion automatique des dates
df_debit  = pd.read_excel(file_debit, parse_dates=['Date'])
df_precip = pd.read_excel(file_precip, parse_dates=['Date'])
df_tmin   = pd.read_excel(file_tmin, parse_dates=['Date'])
df_tmax   = pd.read_excel(file_tmax, parse_dates=['Date'])

# Renommer la colonne débit de manière uniforme
df_debit.columns = ['Date', 'Q']

# Extraction des stations
stations_p = [col for col in df_precip.columns if col != 'Date']
stations_t = [col for col in df_tmin.columns if col != 'Date']

# Renommage des températures pour éviter les doublons lors de la fusion
df_tmin_renamed = df_tmin.rename(columns={col: f"{col}_tmin" for col in stations_t})
df_tmax_renamed = df_tmax.rename(columns={col: f"{col}_tmax" for col in stations_t})

# Fusion sur les dates communes (intersection)
df_all = df_debit.merge(df_precip, on='Date') \
                 .merge(df_tmin_renamed, on='Date') \
                 .merge(df_tmax_renamed, on='Date')

df_all = df_all.sort_values('Date').reset_index(drop=True)

# ==============================================================================
# 2. TRAITEMENT CLIMATIQUE & CALCULS DES VARIABLES
# ==============================================================================
# Pluie moyenne spatiale sur le bassin
P_mean = df_all[stations_p].mean(axis=1)

# Températures moyennes
tmin_cols = [f"{col}_tmin" for col in stations_t]
tmax_cols = [f"{col}_tmax" for col in stations_t]

Tmin_mean = df_all[tmin_cols].mean(axis=1)
Tmax_mean = df_all[tmax_cols].mean(axis=1)
Tmean     = (Tmin_mean + Tmax_mean) / 2.0

# Estimation de l'ETP journalière (Hargreaves)
Ra  = 15.0  # Radiation extraterrestre moyenne
ETP = 0.0023 * Ra * (Tmean + 17.8) * np.sqrt(np.maximum(0, Tmax_mean - Tmin_mean))

# ==============================================================================
# 3. CREATION DE LA MATRICE DE PREDICTEURS (FEATURES)
# ==============================================================================
X = pd.DataFrame(index=df_all.index)

# Lags et cumuls de pluie
X['P_t0']   = P_mean
X['P_t1']   = P_mean.shift(1)
X['P_t2']   = P_mean.shift(2)
X['P_t3']   = P_mean.shift(3)
X['P_cum3'] = P_mean.rolling(window=3).sum()
X['P_cum7'] = P_mean.rolling(window=7).sum()

# Températures et ETP
X['Tmean']  = Tmean
X['ETP_t0'] = ETP
X['ETP_t1'] = ETP.shift(1)

# Pluies individuelles par station
for station in stations_p:
    X[f"P_{station}"] = df_all[station]

y = df_all['Q']
dates = df_all['Date']

# Suppression des NaNs générés par les retardements (shifts)
valid_mask  = ~X.isna().any(axis=1) & ~y.isna()
X_clean     = X[valid_mask].reset_index(drop=True)
y_clean     = y[valid_mask].reset_index(drop=True)
dates_clean = dates[valid_mask].reset_index(drop=True)

# ==============================================================================
# 4. DIVISION TRAIN / TEST (Chronologique 75% / 25%)
# ==============================================================================
split_idx = int(len(X_clean) * 0.75)

X_train, X_test = X_clean.iloc[:split_idx], X_clean.iloc[split_idx:]
y_train, y_test = y_clean.iloc[:split_idx], y_clean.iloc[split_idx:]
dates_test      = dates_clean.iloc[split_idx:]

# ==============================================================================
# 5. ENTRAINEMENT DE LA RANDOM FOREST
# ==============================================================================
rf = RandomForestRegressor(n_estimators=200, min_samples_leaf=5, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

# Prédiction
y_pred = rf.predict(X_test)

# ==============================================================================
# 6. EVALUATION DES PERFORMANCES
# ==============================================================================
# Nash-Sutcliffe Efficiency (NSE)
nse = 1 - (np.sum((y_test - y_pred)**2) / np.sum((y_test - np.mean(y_test))**2))
r2   = r2_score(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"--- RÉSULTATS DE VALIDATION (TEST) ---")
print(f"NSE  : {nse:.3f}")
print(f"R²   : {r2:.3f}")
print(f"RMSE : {rmse:.3f} m³/s\n")

# ==============================================================================
# 7. VISUALISATION DES RESULTATS
# ==============================================================================
# Hydrogramme
plt.figure(figsize=(12, 5))
plt.plot(dates_test, y_test, label='Débit Observé', color='black', alpha=0.8)
plt.plot(dates_test, y_pred, label='Débit Prédit (RF)', color='red', linestyle='--', alpha=0.8)
plt.title(f"Hydrogramme de Validation - NSE: {nse:.2f} | R²: {r2:.2f}")
plt.xlabel('Date')
plt.ylabel('Débit (m³/s)')
plt.legend()
plt.grid(True, linestyle=':', alpha=0.6)
plt.tight_layout()
plt.show()

# Importance des variables (Top 15)
importances = rf.feature_importances_
indices = np.argsort(importances)[::-1][:15]

plt.figure(figsize=(10, 5))
plt.bar(range(len(indices)), importances[indices], color='steelblue', align='center')
plt.xticks(range(len(indices)), [X_clean.columns[i] for i in indices], rotation=45, ha='right')
plt.ylabel('Score d\'Importance (Feature Importance)')
plt.title('Top 15 des Variables Explicatives les Plus Importantes')
plt.grid(True, axis='y', linestyle=':', alpha=0.6)
plt.tight_layout()
plt.show()