const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../lib/db");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios" });
        }
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Nome inválido" });
        }
        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "E-mail inválido" });
        }
        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
        }

        const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "E-mail já cadastrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'STUDENT')",
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        return res.status(201).json({
            message: "Usuário cadastrado com sucesso",
            user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() }
        });
    } catch (error) {
        console.error("Erro no cadastro:", error);
        return res.status(500).json({ message: "Erro ao cadastrar usuário" });
    }
});

// POST /auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "E-mail e senha são obrigatórios" });
        }

        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
        if (!rows.length) {
            return res.status(401).json({ message: "E-mail ou senha inválidos" });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "E-mail ou senha inválidos" });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Login realizado com sucesso",
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Erro no login:", error);
        return res.status(500).json({ message: "Erro ao realizar login" });
    }
});

// GET /auth/me
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
            [req.user.userId]
        );
        if (!rows.length) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Erro no /auth/me:", error);
        return res.status(500).json({ message: "Erro ao buscar usuário" });
    }
});

module.exports = router;
