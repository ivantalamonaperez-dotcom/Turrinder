"use client";

export default function MatchPage() {
  return (
    <div style={styles.container}>
      <h1>¡MATCH!</h1>
      <p>Ambos se dieron like 🔥</p>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
  },
};