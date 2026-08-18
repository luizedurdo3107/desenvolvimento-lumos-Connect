const db = require("../lib/db");

async function adminMiddleware(req, res, next) {
    try {
        const [rows] = await db.query(
            "SELECT id, role FROM users WHERE id = ?",
            [req.user.userId]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        if (rows[0].role !== "ADMIN") {
            return res.status(403).json({ message: "Você não tem permissão para realizar esta ação" });
        }

        next();
    } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        return res.status(500).json({ message: "Erro ao verificar permissões" });
    }
}

module.exports = adminMiddleware;
