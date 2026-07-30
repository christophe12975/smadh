from pathlib import Path
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np

from ai import demander_ia

# Initialisation de l'API FastAPI avec métadonnées pour la documentation
app = FastAPI(
    title="SMADH API - Système de Modélisation et d'Analyse Hydrologique",
    description="API du bassin versant de l'Ouémé à Bonou (Bénin). Fournit la prédiction de débit par Random Forest et un assistant IA.",
    version="1.1.0"
)

# Configuration CORS pour autoriser l'accès depuis n'importe quel frontend (Flutter, Web, Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chemins des fichiers
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "modele_debit_rf.pkl"
EXCEL_PATH = BASE_DIR / "historique_predictions.xlsx"

try:
    model = joblib.load(MODEL_PATH)
    # Récupération automatique de la liste exacte des colonnes utilisées pendant l'entraînement
    model_features = getattr(model, "feature_names_in_", None)
    print("✅ Modèle Random Forest chargé avec succès !")
except Exception as e:
    print(f"⚠️ Erreur lors du chargement du modèle : {e}")
    model = None


# Modèles de données Pydantic (Validation des entrées incluant CSDI, CDD, Rx1day)
class Question(BaseModel):
    message: str = Field(..., description="Question posée à l'assistant hydrologique", example="Quel est le débit maximum observé à Bonou ?")


class SaisieMeteo(BaseModel):
    P_t0: float = Field(..., description="Pluie d'aujourd'hui (mm)", ge=0, example=42.5)
    P_t1: float = Field(0.0, description="Pluie d'hier (mm)", ge=0, example=15.0)
    P_t2: float = Field(0.0, description="Pluie d'il y a 2 jours (mm)", ge=0, example=3.0)
    P_cum15: float = Field(0.0, description="Pluie cumulée sur 15 jours (mm)", ge=0, example=92.0)
    P_cum30: float = Field(0.0, description="Pluie cumulée sur 30 jours (mm)", ge=0, example=165.0)
    Tmin: float = Field(22.0, description="Température minimale (°C)", example=22.0)
    Tmax: float = Field(33.0, description="Température maximale (°C)", example=34.5)
    CSDI: float = Field(0.0, description="Indice CSDI", example=2.0)
    CDD: float = Field(0.0, description="Indice CDD (jours secs consécutifs)", example=5.0)
    Rx1day: float = Field(0.0, description="Indice Rx1day (précipitation max en 1 jour)", example=45.0)
    mois: int = Field(default_factory=lambda: date.today().month, ge=1, le=12, description="Mois de l'année (1-12)")
    jour_annee: int = Field(default_factory=lambda: date.today().timetuple().tm_yday, ge=1, le=366, description="Jour julien de l'année (1-366)")


# Endpoints API

@app.get("/", tags=["Système"])
def accueil():
    """Vérifie le statut de fonctionnement du backend."""
    return {
        "statut": "opérationnel",
        "projet": "SMADH - Station de Bonou (Bénin)",
        "modele_charge": model is not None
    }


@app.post("/chat", tags=["Assistant IA"])
def chat(question: Question):
    """Interroge l'assistant hydrologique basé sur les données historiques de Bonou."""
    reponse = demander_ia(question.message)
    return {"response": reponse}


@app.post("/predict", tags=["Prédiction Hydrologique"])
def predire_debit(donnees: SaisieMeteo):
    """Calcule la prédiction du débit journalier (m³/s) via le modèle Random Forest et met à jour l'historique Excel."""
    if model is None:
        raise HTTPException(
            status_code=500,
            detail="Le fichier du modèle Random Forest (.pkl) est introuvable sur le serveur."
        )

    # 1. Calculs des variables dérivées
    P_cum3 = donnees.P_t0 + donnees.P_t1 + donnees.P_t2
    Tmean = (donnees.Tmin + donnees.Tmax) / 2.0
    Ra = 15.0  # Rayonnement extraterrestre moyen pour la latitude de Bonou
    ETP = 0.0023 * Ra * (Tmean + 17.8) * np.sqrt(max(0.0, donnees.Tmax - donnees.Tmin))

    # 2. Dictionnaire des caractéristiques calculées incluant CSDI, CDD et Rx1day
    input_dict = {
        'Mois': donnees.mois,
        'Jour_Annee': donnees.jour_annee,
        'P_t0': donnees.P_t0,
        'P_t1': donnees.P_t1,
        'P_t2': donnees.P_t2,
        'P_t3': donnees.P_t2,
        'P_t5': donnees.P_t2,
        'P_t10': donnees.P_t2,
        'P_t15': donnees.P_t2,
        'P_cum3': P_cum3,
        'P_cum7': P_cum3,
        'P_cum15': donnees.P_cum15 if donnees.P_cum15 > 0 else P_cum3,
        'P_cum30': donnees.P_cum30 if donnees.P_cum30 > 0 else P_cum3 * 2,
        'P_cum60': donnees.P_cum30 * 1.5 if donnees.P_cum30 > 0 else P_cum3 * 3,
        'CSDI': donnees.CSDI,
        'CDD': donnees.CDD,
        'Rx1day': donnees.Rx1day,
        'Tmean': Tmean,
        'ETP_t0': ETP,
        'ETP_t1': ETP
    }

    # 3. Alignement strict avec les colonnes attendues par scikit-learn
    df_input = pd.DataFrame([input_dict])

    if model_features is not None:
        for col in model_features:
            if col not in df_input.columns:
                df_input[col] = donnees.P_t0
        df_input = df_input[model_features]

    # 4. Inférence et sécurisation physique du débit (non négatif)
    prediction_raw = model.predict(df_input)[0]
    debit_predit = max(0.0, float(prediction_raw))

    # 5. Enregistrement automatique / mise à jour du fichier Excel d'historique
    date_actuelle = str(date.today())
    nouvelle_ligne = pd.DataFrame({
        'Date': [date_actuelle],
        'Debit_Predi': [round(debit_predit, 2)],
        'CSDI': [donnees.CSDI],
        'CDD': [donnees.CDD],
        'Rx1day': [donnees.Rx1day]
    })

    if EXCEL_PATH.exists():
        df_historique = pd.read_excel(EXCEL_PATH)
        df_historique = pd.concat([df_historique, nouvelle_ligne], ignore_index=True)
    else:
        df_historique = nouvelle_ligne

    df_historique.to_excel(EXCEL_PATH, index=False)

    return {
        "succes": True,
        "debit_predit": round(debit_predit, 2),
        "unite": "m3/s",
        "station": "Bonou (Bénin)",
        "performance_modele": {
            "NSE": 0.732,
            "R2": 0.732
        }
    }


@app.get("/telecharger-historique", tags=["Prédiction Hydrologique"])
def telecharger_historique():
    """Route pour télécharger le fichier Excel mis à jour contenant l'historique des prédictions."""
    if not EXCEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Aucun historique de prédiction disponible pour le moment.")
    
    return FileResponse(
        path=EXCEL_PATH,
        filename="historique_predictions.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )