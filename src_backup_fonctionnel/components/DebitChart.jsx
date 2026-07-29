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


  // On garde une valeur par année pour alléger le graphique
  const annuel = debit.filter((d) => {
    const date = new Date(d.Date);
    return date.getDate() === 1 && date.getMonth() === 0;
  });


  const donnees = annuel.map((d) => ({
    annee: new Date(d.Date).getFullYear(),
    debit: Number(d.Débit)
  }));


  return (
    <div style={{
      width: "100%",
      height: 350
    }}>

      <h3>
        Evolution du débit annuel - Bonou (1991-2020)
      </h3>


      <ResponsiveContainer>

        <LineChart data={donnees}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="annee" />

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