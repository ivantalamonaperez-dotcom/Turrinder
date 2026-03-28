"use client";

export default function ProfilePage() {
  return (
    <div style={styles.container}>
      <h2>Perfil</h2>
      <input placeholder="Nombre" />
      <textarea placeholder="Bio" />
      <button>Guardar</button>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
};