import express from "express";
import cors from "cors";
import routes from "../api/routes";
import { ENV } from "./env";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.listen(ENV.PORT, () => {
  console.log(`🚀 API running on http://localhost:${ENV.PORT}`);
});