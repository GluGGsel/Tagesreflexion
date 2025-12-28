export default function Home() {
  return (
    <main className="container">
      <div className="header">
        <h1 className="title">Tagesreflexion</h1>
        <p className="date">Bitte wähle:</p>
      </div>

      <div className="row">
        <a className="btn" href="/mann">Mann</a>
        <a className="btn" href="/frau">Frau</a>
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        Hinweis: Diese App ist für den Heimserver gedacht. Bitte keine Portweiterleitung ins Internet, wenn du keine Auth willst.
      </p>
    </main>
  );
}
