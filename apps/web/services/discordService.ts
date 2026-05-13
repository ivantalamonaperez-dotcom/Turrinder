const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'http://localhost:3001';

export async function enviarFeedback(subtipo: string, mensaje: string, email?: string, userId?: string) {
  try {
    await fetch(`${BOT_URL}/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'feedback', datos: { subtipo, mensaje, email, userId } }),
    });
  } catch (e) {
    console.error('[Discord] Error enviando feedback:', e);
  }
}

export async function enviarPostulacion(datos: {
  nombre: string;
  usuario: string;
  email: string;
  categoria: string;
  plataforma: string;
  seguidores: string;
  frecuencia: string;
  link: string;
  bio: string;
  userId?: string;
}) {
  try {
    await fetch(`${BOT_URL}/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'postulacion', datos }),
    });
  } catch (e) {
    console.error('[Discord] Error enviando postulacion:', e);
  }
}

export async function enviarReporte(datos: {
  reportedId: string;
  reportedName: string;
  reportedAge?: number;
  reportedGender?: string;
  reportedBio?: string;
  reportedAvatar?: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  detail?: string;
  evidenceUrls: string[];
  totalReports: number;
  lastIp: string;
  lastLogin?: string;
  lastMethod?: string;
}) {
  try {
    await fetch(`${BOT_URL}/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'reporte', datos }),
    });
  } catch (e) {
    console.error('[Discord] Error enviando reporte:', e);
  }
}

export async function enviarLogLogin(datos: {
  userId: string;
  method: string;
  ip?: string;
}) {
  try {
    await fetch(`${BOT_URL}/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'log_login', datos }),
    });
  } catch (e) {
    console.error('[Discord] Error enviando log login:', e);
  }
}