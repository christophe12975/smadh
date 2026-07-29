import os
from dotenv import load_dotenv
from openai import OpenAI

from data import donnees
import pandas as pd


load_dotenv()


client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)



def resume_donnees():

    debit = donnees["debit"].copy()
    indices = donnees["indices_climatiques"].copy()


    debit["Débit"] = pd.to_numeric(
        debit["Débit"],
        errors="coerce"
    )

    debit = debit.dropna(
        subset=["Débit"]
    )


    moyenne = debit["Débit"].mean()

    maximum = debit["Débit"].max()

    minimum = debit["Débit"].min()


    ligne_max = debit.loc[
        debit["Débit"].idxmax()
    ]


    annee = pd.to_datetime(
        ligne_max["Date"]
    ).year



    contexte = f"""

Tu es l'assistant hydrologique SMADH.

Tu analyses les données de Bonou (Bénin)
sur la période 1991-2020.

Informations disponibles :

- Nombre d'observations débit : {len(debit)}
- Débit moyen : {moyenne:.2f} m³/s
- Débit maximum : {maximum:.2f} m³/s
- Année du débit maximum : {annee}
- Débit minimum : {minimum:.2f} m³/s
- Nombre d'années d'indices climatiques : {len(indices)}

Réponds toujours en français.
Explique clairement comme un expert hydrologue.
"""

    return contexte





def demander_ia(message):


    contexte = resume_donnees()


    try:


        response = client.chat.completions.create(

            model="gpt-4.1-mini",

            messages=[

                {
                    "role":"system",
                    "content":contexte
                },

                {
                    "role":"user",
                    "content":message
                }

            ],

            temperature=0.3

        )


        return response.choices[0].message.content



    except Exception as e:


        return (
            "Erreur de connexion avec l'intelligence artificielle : "
            + str(e)
        )