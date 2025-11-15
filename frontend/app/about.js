
export default function About() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(90deg, #2a5fa1 0%, #4e8edc 100%)",
        color: "#fff",
        fontFamily: "Segoe UI, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 80px",
        }}
      >
        <section style={{ maxWidth: 600 }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 700, marginBottom: 16 }}>About Us</h1>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 24 }}>
            Preparedness made simple, safety made possible.
          </h2>
          <p style={{ fontSize: "1.1rem", marginBottom: 24, lineHeight: 1.7 }}>
            FLOWMAPS is a mobile application designed to enhance community safety and disaster preparedness during floods. It combines flood alerts, hazard mapping, safe rerouting, and evacuation center directories into one easy-to-use platform, giving residents clear and localized guidance in times of crisis.
          </p>
          <p style={{ fontSize: "1.1rem", marginBottom: 24, lineHeight: 1.7 }}>
            Powered by data from NOAH, LIDAR, and the Open Hazards PH Repository, the app ensures accurate mapping of flood-prone areas and safe evacuation routes. With offline access, text-to-speech, and multi-language support, FLOWMAPS remains reliable even during power or internet disruptions.
          </p>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.7 }}>
            Developed by Team Jabbacodeez for the Philippine Junior Data Science Challenge (PJDSC) 2025, FLOWMAPS reflects our mission to harness technology that saves lives, reduces risks, and builds stronger, more resilient communities.
          </p>
        </section>
        <aside style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="Flowmaps Cube"
            width={320}
            height={320}
            style={{ marginBottom: 24 }}
          />
          <div style={{ textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "1.2rem" }}>FLOWMAPS</span>
            <div style={{ marginTop: 8 }}>
              <a href="#" style={{ color: "#fff", marginRight: 12 }}>
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" style={{ color: "#fff" }}>
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}