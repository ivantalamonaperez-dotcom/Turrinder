import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.turrinder.com", lastModified: new Date(), changeFrequency: "daily",   priority: 1 },
    { url: "https://www.turrinder.com/alternativa-omegle",          lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.turrinder.com/alternativa-ometv",           lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: "https://www.turrinder.com/chat-con-desconocidos",        lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.turrinder.com/pagina-de-citas",             lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://www.turrinder.com/videochat-aleatorio",         lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}