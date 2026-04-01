"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }

      setEmail(me.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, age, bio")
        .eq("id", me.user.id)
        .single();

      if (profile) {
        setName(profile.name || "");
        setAge(profile.age?.toString() || "");
        setBio(profile.bio || "");
      }

      setLoading(false);
    };

    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;

    await supabase
      .from("profiles")
      .update({ name, age: parseInt(age) || 20, bio })
      .eq("id", me.user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .profile-root {
          min-height: 100vh;
          background: #080810;
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 100px;
        }

        .profile-header {
          padding: 56px 24px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .profile-avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,45,107,0.2), rgba(255,107,53,0.2));
          border: 2px solid rgba(255,45,107,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          position: relative;
        }

        .profile-name {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .profile-email {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }

        .profile-body {
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: -8px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.5px;
        }

        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 15px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s ease;
          resize: none;
        }

        .field-input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .field-input:focus {
          border-color: rgba(255,45,107,0.4);
          background: rgba(255,45,107,0.04);
        }

        .row {
          display: flex;
          gap: 12px;
        }

        .row .field-group {
          flex: 1;
        }

        .btn-save {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          border: none;
          border-radius: 14px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 4px;
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(255,45,107,0.4);
        }

        .btn-save:disabled {
          opacity: 0.6;
          transform: none;
        }

        .btn-save.saved {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
        }

        .btn-logout {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(255,77,77,0.2);
          border-radius: 14px;
          color: rgba(255,77,77,0.7);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-logout:hover {
          background: rgba(255,77,77,0.08);
          border-color: rgba(255,77,77,0.4);
          color: #ff4d4d;
        }

        .skeleton-field {
          height: 48px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="profile-root">
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <div className="profile-name">{name || "Tu perfil"}</div>
          <div className="profile-email">{email}</div>
        </div>

        <div className="profile-body">
          <span className="section-label">Información</span>

          {loading ? (
            <>
              <div className="skeleton-field" />
              <div className="skeleton-field" />
              <div className="skeleton-field" style={{ height: 100 }} />
            </>
          ) : (
            <>
              <div className="row">
                <div className="field-group">
                  <label className="field-label">Nombre</label>
                  <input
                    className="field-input"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field-group" style={{ maxWidth: 90 }}>
                  <label className="field-label">Edad</label>
                  <input
                    className="field-input"
                    placeholder="20"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Bio</label>
                <textarea
                  className="field-input"
                  placeholder="Contá algo sobre vos..."
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <button
                className={`btn-save ${saved ? "saved" : ""}`}
                onClick={save}
                disabled={saving}
              >
                {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <div className="divider" />

              <button className="btn-logout" onClick={logout}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}