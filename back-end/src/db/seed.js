require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../lib/db");

async function seed() {
    console.log("Iniciando seed...");

    // Create admin user
    const adminHash = await bcrypt.hash("Admin@123", 10);
    await db.query(`
        INSERT IGNORE INTO users (name, email, password, role)
        VALUES (?, ?, ?, 'ADMIN')
    `, ["Administrador Lumos", "admin@lumos.com", adminHash]);

    // Create student user
    const studentHash = await bcrypt.hash("Student@123", 10);
    await db.query(`
        INSERT IGNORE INTO users (name, email, password, role)
        VALUES (?, ?, ?, 'STUDENT')
    `, ["Estudante Teste", "estudante@lumos.com", studentHash]);

    const [[admin]] = await db.query("SELECT id FROM users WHERE email = 'admin@lumos.com'");

    // Sample quiz activity
    await db.query(`
        INSERT INTO activities (title, description, subject, activity_type, created_by, is_published)
        VALUES (?, ?, ?, 'QUIZ', ?, 1)
    `, ["Quiz de Matemática Básica", "Teste seus conhecimentos em operações básicas", "Matemática", admin.id]);

    const [[quiz]] = await db.query("SELECT LAST_INSERT_ID() as id");
    const quizId = quiz.id;

    // Questions for quiz
    await db.query(`
        INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`)
        VALUES
        (?, 'Quanto é 15 + 27?', 'MULTIPLE_CHOICE', '15 + 27 = 42', 0),
        (?, 'O número π (pi) é maior que 3?', 'TRUE_FALSE', 'Pi ≈ 3,14159...', 1),
        (?, 'Quanto é 8 × 9?', 'MULTIPLE_CHOICE', '8 × 9 = 72', 2)
    `, [quizId, quizId, quizId]);

    const [questions] = await db.query("SELECT id, question_text FROM activity_questions WHERE activity_id = ?", [quizId]);

    for (const q of questions) {
        if (q.question_text.includes("15 + 27")) {
            await db.query(`INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?),(?,?,?,?)`,
                [q.id, "40", 0, 0, q.id, "42", 1, 1, q.id, "44", 0, 2, q.id, "38", 0, 3]);
        } else if (q.question_text.includes("π")) {
            await db.query(`INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?),(?,?,?,?)`,
                [q.id, "Verdadeiro", 1, 0, q.id, "Falso", 0, 1]);
        } else if (q.question_text.includes("8 × 9")) {
            await db.query(`INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?),(?,?,?,?)`,
                [q.id, "63", 0, 0, q.id, "72", 1, 1, q.id, "81", 0, 2, q.id, "64", 0, 3]);
        }
    }

    // Sample flashcard activity
    await db.query(`
        INSERT INTO activities (title, description, subject, activity_type, created_by, is_published)
        VALUES (?, ?, ?, 'FLASHCARD', ?, 1)
    `, ["Vocabulário de Inglês", "Flashcards com palavras e traduções em inglês", "Inglês", admin.id]);

    const [[flashcard]] = await db.query("SELECT LAST_INSERT_ID() as id");
    const flashcardId = flashcard.id;

    await db.query(`
        INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`)
        VALUES
        (?, 'Apple', 'FLASHCARD', 'Maçã - Uma fruta comum', 0),
        (?, 'Book', 'FLASHCARD', 'Livro - Objeto de leitura', 1),
        (?, 'School', 'FLASHCARD', 'Escola - Local de aprendizado', 2),
        (?, 'Computer', 'FLASHCARD', 'Computador - Dispositivo eletrônico', 3)
    `, [flashcardId, flashcardId, flashcardId, flashcardId]);

    // Sample standard activity
    await db.query(`
        INSERT INTO activities (title, description, subject, activity_type, created_by, is_published)
        VALUES (?, ?, ?, 'STANDARD', ?, 1)
    `, ["Leitura: Ecossistemas", "Leia o texto e responda as questões sobre ecossistemas", "Ciências", admin.id]);

    const [[standard]] = await db.query("SELECT LAST_INSERT_ID() as id");
    const standardId = standard.id;

    await db.query(`
        INSERT INTO activity_contents (activity_id, content_type, title, content, \`order\`)
        VALUES (?, 'TEXT', 'O que são ecossistemas?', ?, 0)
    `, [standardId, "Um ecossistema é um sistema formado pela interação entre comunidades de seres vivos e o ambiente físico em que vivem. Inclui todos os organismos (bióticos) e componentes não vivos (abióticos) como água, ar e solo. Os ecossistemas podem ser terrestres, como florestas e desertos, ou aquáticos, como oceanos e lagos."]);

    // Matching activity
    await db.query(`
        INSERT INTO activities (title, description, subject, activity_type, created_by, is_published)
        VALUES (?, ?, ?, 'MATCHING', ?, 1)
    `, ["Associação: Capitais do Brasil", "Associe os estados às suas capitais", "Geografia", admin.id]);

    const [[matching]] = await db.query("SELECT LAST_INSERT_ID() as id");
    const matchingId = matching.id;

    await db.query(`
        INSERT INTO activity_questions (activity_id, question_text, question_type, explanation, \`order\`)
        VALUES
        (?, 'São Paulo', 'MATCHING', 'São Paulo é a capital do estado de São Paulo', 0),
        (?, 'Rio de Janeiro', 'MATCHING', 'Rio de Janeiro é a capital do estado do Rio de Janeiro', 1),
        (?, 'Minas Gerais', 'MATCHING', 'Belo Horizonte é a capital de Minas Gerais', 2),
        (?, 'Bahia', 'MATCHING', 'Salvador é a capital da Bahia', 3)
    `, [matchingId, matchingId, matchingId, matchingId]);

    const [matchQuestions] = await db.query("SELECT id, question_text FROM activity_questions WHERE activity_id = ?", [matchingId]);
    for (const q of matchQuestions) {
        let capital;
        if (q.question_text === "São Paulo") capital = "São Paulo";
        else if (q.question_text === "Rio de Janeiro") capital = "Rio de Janeiro";
        else if (q.question_text === "Minas Gerais") capital = "Belo Horizonte";
        else capital = "Salvador";
        await db.query(`INSERT INTO question_options (question_id, option_text, is_correct, \`order\`) VALUES (?,?,1,0)`, [q.id, capital]);
    }

    console.log("✅ Seed concluído!");
    console.log("   Admin: admin@lumos.com / Admin@123");
    console.log("   Estudante: estudante@lumos.com / Student@123");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
});
