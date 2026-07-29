import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";


export default function DebitChart({ debit }) {

  if (!debit || debit.length === 0) {
    return <p>Aucune donnée de débit disponible</p>;
  }


  // Regroupement annuel des débits
  const parAnnee = {};

  debit.forEach((d) => {

    const date = new Date(d.Date);
    const annee = date.getFullYear();

    const valeur = Number(d.Débit);

    if (!isNaN(annee) && !isNaN(valeur)) {

      if (!parAnnee[annee]) {
        parAnnee[annee] = {
          somme: 0,
          nombre: 0
        };
      }

      parAnnee[annee].somme += valeur;
      parAnnee[annee].nombre += 1;
    }

  });


  const donnees = Object.keys(parAnnee)
    .sort()
    .map((annee) => ({
      annee,
      debit:
        (
          parAnnee[annee].somme /
          parAnnee[annee].nombre
        ).toFixed(2)
    }));


  return (

    <div
      style={{
        width: "100%",
        height: 400
      }}
    >

      <h3>
        Evolution du débit annuel - Bonou (1991-2020)
      </h3>


      <ResponsiveContainer width="100%" height="100%">

        <LineChart data={donnees}>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#555"
          />


          <XAxis
            dataKey="annee"
          />


          <YAxis
            label={{
              value: "Débit (m³/s)",
              angle: -90,
              position: "insideLeft"
            }}
          />


          <Tooltip />


          <Line
            type="monotone"
            dataKey="debit"
            stroke="#00b894"
            strokeWidth={3}
          />


        </LineChart>

      </ResponsiveContainer>


    </div>
  );
}