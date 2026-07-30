import os
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from data import donnees

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("OPENAI_API_KEY")

# Initialisation conditionnelle du client
if api_key:
    client = OpenAI(api_key=api_key)
else:
    client = None
    print("⚠️  OPENAI_API_KEY non trouvée dans .env - Le chatbot sera désactivé mais la prédiction fonctionnera.")

def resume_donnees():
    try:
        debit = donnees["debit"].copy()
        indices = donnees.get("indices_climatiques", pd.DataFrame()).copy()

        col_debit = next((c for c in ['Débit', 'Debit', 'Q'] if c in debit.columns), debit.columns[0])
        debit["Q_num"] = pd.to_numeric(debit[col_debit], errors="coerce")
        debit_clean = debit.dropna(subset=["Q_num"])

        moyenne = debit_clean["Q_num"].mean()
        maximum = debit_clean["Q_num"].max()
        minimum = debit_clean["Q_num"].min()

        col_date = next((c for c in ['Date', 'date', 'DATE'] if c in debit_clean.columns), debit_clean.columns[0])
        annee = pd.to_datetime(debit_clean.loc[debit_clean["Q_num"].idxmax()][col_date]).year

        return f"""
Tu es l'assistant hydrologique SMADH.
Bassin versant de l'Ouémé à la station de Bonou (1991-2020).
- Observations débit : {len(debit_clean)}
- Débit moyen : {moyenne:.2f} m³/s
- Débit max ({annee}) : {maximum:.2f} m³/s
- Débit min : {minimum:.2f} m³/s
- Années d'indices climatiques : {len(indices)}
Réponds toujours en français.
"""
    except Exception:
        return "Tu es l'assistant hydrologique SMADH pour Bonou (Bénin). Réponds en français."

def demander_ia(message):
    if client is None:
        return "L'assistant IA n'est pas configuré (clé OPENAI_API_KEY manquante dans le fichier .env)."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": resume_donnees()},
                {"role": "user", "content": message}
            ],
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Erreur de connexion IA : {str(e)}"