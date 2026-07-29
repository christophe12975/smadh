import { useSMADHData } from "./hooks/useSMADHData";
import Dashboard from "./components/Dashboard";


export default function App() {

  const {
    debit,
    pluie,
    temperatureMax,
    temperatureMin,
    indicesClimatiques,
    indicesHydroClimatiques,
    loading,
    error
  } = useSMADHData();


  if (loading) {
    return (
      <div>
        Chargement des données SMADH...
      </div>
    );
  }


  if (error) {
    return (
      <div>
        Erreur de chargement des données
      </div>
    );
  }


  return (
    <Dashboard
      debit={debit}
      indicesClimatiques={indicesClimatiques}
    />
  );
}