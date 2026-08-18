const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoutes");
const agendaRoutes = require("./routes/agendaRoutes");
const studySessionRoutes = require("./routes/studySessionRoutes");
const progressRoutes = require("./routes/progressRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    res.json({ message: "Lumos Connect API v2.0 funcionando!", db: "MySQL" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/profile", profileRoutes);
app.use("/activities", activityRoutes);
app.use("/agenda", agendaRoutes);
app.use("/study-sessions", studySessionRoutes);
app.use("/progress", progressRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
    console.error("Erro não tratado:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumos Connect API rodando na porta ${PORT}`);
    console.log(`Banco de dados: MySQL (${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3000}/${process.env.DB_NAME || "lumos_connect"})`);
});
