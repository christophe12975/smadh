from pathlib import Path
import pandas as pd

# 1. Détermine le dossier absolu backend
BASE_DIR = Path(__file__).resolve().parent

# 2. Chemin vers le fichier Excel situé dans backend/
EXCEL_PATH = BASE_DIR / "indices_hydrologiques_indices_climatiques.xlsx"

# 3. Chargement sécurisé des feuilles du fichier Excel
try:
    excel_file = pd.ExcelFile(EXCEL_PATH)
    donnees = {}
    
    # Charge toutes les feuilles du fichier Excel
    for sheet in excel_file.sheet_names:
        donnees[sheet] = pd.read_excel(excel_file, sheet_name=sheet)
        
    # Garantit la présence de la clé 'debit' pour ai.py
    if "debit" not in donnees:
        premiere_feuille = excel_file.sheet_names[0]
        donnees["debit"] = donnees[premiere_feuille]
        
    if "indices_climatiques" not in donnees:
        donnees["indices_climatiques"] = donnees["debit"]

    print("✅ Données hydrologiques chargées avec succès dans data.py !")

except Exception as e:
    print(f"⚠️ Erreur de lecture du fichier Excel dans data.py : {e}")
    # Structure de secours si le fichier a un souci
    donnees = {
        "debit": pd.DataFrame(),
        "indices_climatiques": pd.DataFrame()
    }