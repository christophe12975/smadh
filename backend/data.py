import pandas as pd
import os


BASE = "../public/DATA"


def charger():

    donnees = {}


    donnees["debit"] = pd.read_excel(
        os.path.join(
            BASE,
            "debit_bonou.xlsx"
        )
    )


    donnees["pluie"] = pd.read_excel(
        os.path.join(
            BASE,
            "Données_pluviometriques_1991_2020_finale.xlsx"
        )
    )


    donnees["temperature_max"] = pd.read_excel(
        os.path.join(
            BASE,
            "Temperature_maximales_Ctn_Boh_Sav_Par_Version_finale.xlsx"
        )
    )


    donnees["temperature_min"] = pd.read_excel(
        os.path.join(
            BASE,
            "Temperature_minimale_Ctn_Boh_Sav_Par_Version_finale.xlsx"
        )
    )


    donnees["indices_climatiques"] = pd.read_excel(
        os.path.join(
            BASE,
            "Bases_indices_climatiques_selectionnés.xlsx"
        )
    )


    donnees["indices_hydro"] = pd.read_excel(
        os.path.join(
            BASE,
            "indices_hydrologiques_indices_climatiques.xlsx"
        )
    )


    return donnees



donnees = charger()



print(
    "Données SMADH chargées :"
)

for cle, valeur in donnees.items():

    print(
        cle,
        valeur.shape
    )