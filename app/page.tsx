export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>🎨 Thumbnail Creator V2</h1>
      <p style={{ fontSize: "1.1rem", color: "#666" }}>
        YouTube thumbnail generation engine powered by Google's Nano Banana API
      </p>

      <hr style={{ margin: "2rem 0" }} />

      <div style={{ textAlign: "center", margin: "2rem 0" }}>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            backgroundColor: "#0070f3",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          🚀 Open Dashboard
        </a>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      <h2>📊 System Status</h2>
      <div style={{ backgroundColor: "#f0f0f0", padding: "1rem", borderRadius: "8px" }}>
        <p>✅ <strong>Phase 1:</strong> Core generation engine (Complete)</p>
        <p>✅ <strong>Phase 2:</strong> Database & API routes (Complete)</p>
        <p>✅ <strong>Phase 3:</strong> Dashboard UI (Complete)</p>
      </div>

      <h2>🔌 Available API Endpoints</h2>
      <div style={{ backgroundColor: "#f9f9f9", padding: "1rem", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.9rem" }}>
        <p><strong>POST</strong> /api/generate - Generate thumbnail</p>
        <p><strong>GET</strong> /api/channels - List all channels</p>
        <p><strong>POST</strong> /api/channels - Create new channel</p>
        <p><strong>GET</strong> /api/archetypes?channelId=xxx - List archetypes</p>
        <p><strong>POST</strong> /api/archetypes - Create new archetype</p>
      </div>

      <h2>🧪 Testing</h2>
      <div style={{ backgroundColor: "#fff3cd", padding: "1rem", borderRadius: "8px" }}>
        <p><strong>Batch Generation:</strong> <code>npm run test:generate</code></p>
        <p><strong>API Testing:</strong> Use curl or Postman with endpoints above</p>
        <p><strong>Database Explorer:</strong> Prisma Studio running on <a href="http://localhost:5556" target="_blank">localhost:5556</a></p>
      </div>

      <h2>📚 Documentation</h2>
      <p>See <code>CLAUDE.md</code> for complete technical documentation, API examples, and troubleshooting guides.</p>
    </main>
  );
}
