export default function Navbar({ page, setPage }) {

  const menus = [
    { id: "accueil", label: "Accueil" },
    { id: "dashboard", label: "Dashboard" },
    { id: "stations", label: "Stations" },
    { id: "alertes", label: "Alertes" },
    { id: "import", label: "Import" }
  ];

  return (
    <nav style={{
      display:"flex",
      gap:"10px",
      padding:"15px",
      background:"#123",
      flexWrap:"wrap"
    }}>

      {menus.map((m)=>(
        <button
          key={m.id}
          onClick={()=>setPage(m.id)}
          style={{
            padding:"8px 15px",
            borderRadius:"8px",
            border:"none",
            cursor:"pointer",
            background: page===m.id ? "#00b894" : "#345",
            color:"white"
          }}
        >
          {m.label}
        </button>
      ))}

    </nav>
  );
}