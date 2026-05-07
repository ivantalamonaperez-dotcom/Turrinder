// ✅ Así debería quedar
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const ENV = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "", // sin fallback inseguro
};