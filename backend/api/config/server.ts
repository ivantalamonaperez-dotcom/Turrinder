import express from "express";
import cors from "cors";
import routes from "../routes/index";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});