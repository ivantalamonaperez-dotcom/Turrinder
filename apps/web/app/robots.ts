import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/profile", "/chat", "/discover", "/api/"] },
    ],
    sitemap: "https://www.turrinder.com/sitemap.xml",
  };
}