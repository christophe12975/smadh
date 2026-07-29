import { useEffect, useState } from "react";
import { loadExcel } from "../services/dataReader";

export function useSMADHData() {

  const [data, setData] = useState({
    debit: [],
    pluie: [],
    temperatureMax: [],
    temperatureMin: [],
    indicesClimatiques: [],
    indicesHydroClimatiques: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {

    async function loadAllData() {

      try {

        const [
          debit,
          pluie,
          temperatureMax,
          temperatureMin,
          indicesClimatiques,
          indicesHydroClimatiques
        ] = await Promise.all([

          loadExcel(
            "/DATA/debit_bonou.xlsx"
          ),

          loadExcel(
            "/DATA/Données_pluviometriques_1991_2020_finale.xlsx"
          ),

          loadExcel(
            "/DATA/Temperature_maximales_Ctn_Boh_Sav_Par_Version_finale.xlsx"
          ),

          loadExcel(
            "/DATA/Temperature_minimale_Ctn_Boh_Sav_Par_Version_finale.xlsx"
          ),

          loadExcel(
            "/DATA/Bases_indices_climatiques_selectionnés.xlsx"
          ),

          loadExcel(
            "/DATA/indices_hydrologiques_indices_climatiques.xlsx"
          )

        ]);


        setData({
          debit,
          pluie,
          temperatureMax,
          temperatureMin,
          indicesClimatiques,
          indicesHydroClimatiques
        });


      } catch (err) {

        console.error(
          "Erreur chargement données SMADH :",
          err
        );

        setError(err);

      } finally {

        setLoading(false);

      }

    }


    loadAllData();

  }, []);


  return {
    ...data,
    loading,
    error
  };
}