lucide.createIcons();

const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const termsInput = document.getElementById("terms");

function togglePasswordVisibility(input, button) {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    button.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    lucide.createIcons();
    button.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
}

document.getElementById("togglePassword").addEventListener("click", function () {
    togglePasswordVisibility(passwordInput, this);
});
document.getElementById("toggleConfirmPassword").addEventListener("click", function () {
    togglePasswordVisibility(confirmPasswordInput, this);
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    document.querySelectorAll(".error-message").forEach(e => { e.textContent = ""; });
    let valid = true;

    if (!nameInput.value.trim()) {
        document.getElementById("nameError").textContent = "Digite seu nome completo.";
        valid = false;
    }
    if (!emailInput.value.trim()) {
        document.getElementById("emailError").textContent = "Digite seu e-mail.";
        valid = false;
    } else if (!validateEmail(emailInput.value.trim())) {
        document.getElementById("emailError").textContent = "Digite um e-mail válido.";
        valid = false;
    }
    if (!passwordInput.value) {
        document.getElementById("passwordError").textContent = "Digite uma senha.";
        valid = false;
    } else if (passwordInput.value.length < 6) {
        document.getElementById("passwordError").textContent = "A senha deve ter pelo menos 6 caracteres.";
        valid = false;
    }
    if (!confirmPasswordInput.value) {
        document.getElementById("confirmPasswordError").textContent = "Confirme sua senha.";
        valid = false;
    } else if (confirmPasswordInput.value !== passwordInput.value) {
        document.getElementById("confirmPasswordError").textContent = "As senhas não coincidem.";
        valid = false;
    }
    if (termsInput && !termsInput.checked) {
        document.getElementById("termsError").textContent = "Aceite os termos para continuar.";
        valid = false;
    }
    if (!valid) return;

    const btn = registerForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Criando conta...";

    try {
        await register(nameInput.value.trim(), emailInput.value.trim(), passwordInput.value);
        // Auto-login after register
        const data = await login(emailInput.value.trim(), passwordInput.value);
        localStorage.setItem("lumos_token", data.token);
        localStorage.setItem("lumos_user", JSON.stringify(data.user));
        window.location.href = "/lumos-connect/front-end/pages/inicio/inicio.html";
    } catch (error) {
        document.getElementById("emailError").textContent = error.message || "Erro ao criar conta.";
        btn.disabled = false;
        btn.textContent = "Criar conta";
        lucide.createIcons();
    }
});
