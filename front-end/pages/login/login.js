lucide.createIcons();

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const togglePasswordBtn = document.getElementById("togglePassword");

togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePasswordBtn.innerHTML = isPassword
        ? '<i data-lucide="eye-off"></i>'
        : '<i data-lucide="eye"></i>';
    lucide.createIcons();
    togglePasswordBtn.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
});

emailInput.addEventListener("input", () => { emailError.textContent = ""; });
passwordInput.addEventListener("input", () => { passwordError.textContent = ""; });

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    emailError.textContent = "";
    passwordError.textContent = "";
    let valid = true;

    if (!email) { emailError.textContent = "Digite seu e-mail."; valid = false; }
    if (!password) { passwordError.textContent = "Digite sua senha."; valid = false; }
    if (!valid) return;

    const loginButton = loginForm.querySelector(".login-button");
    const originalContent = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";

    try {
        const data = await login(email, password);
        localStorage.setItem("lumos_token", data.token);
        localStorage.setItem("lumos_user", JSON.stringify(data.user));

        // Admin vai para o painel admin, estudante vai para início
        if (data.user && data.user.role === "ADMIN") {
    window.location.href = "../admin/admin.html";
} else {
    window.location.href = "../inicio/inicio.html";
}
    } catch (error) {
        passwordError.textContent = error.message || "E-mail ou senha incorretos.";
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = originalContent;
        lucide.createIcons();
    }
});
