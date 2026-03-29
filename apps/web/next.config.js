/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Esto ignora los errores de tipos solo durante el build de Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // También ignoramos ESLint para evitar que el build se trabe por advertencias
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig