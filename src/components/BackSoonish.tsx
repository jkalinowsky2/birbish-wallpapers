// src/components/BackSoonish.tsx
export function UnderConstruction() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0b0f",
        color: "white",
        padding: 24,
        textAlign: "center",
        borderRadius: 16,
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.8 }}>
          GENERATIONAL MERCH WILL BE
        </div>
        <h1 style={{ fontSize: 44, margin: "14px 0 10px" }}>BACK SOON(ish)</h1>
      </div>
    </div>
  );
}