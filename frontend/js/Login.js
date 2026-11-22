import { login } from "./auth.js";
import { obterUsuario } from "./auth.js";

try { sessionStorage.removeItem("usuario"); } catch {}

const form = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const msgErro = document.getElementById("msg-erro");
const botaoEntrar = form.querySelector('button[type="submit"]');
const textoBotao = botaoEntrar.innerHTML;

function mostrarErro(texto, campos) {
    msgErro.textContent = texto;
    msgErro.hidden = false;
    [campoEmail, campoSenha].forEach(c => c.classList.remove("invalido"));
    campos.forEach(c => c.classList.add("invalido"));
}

function limparErro() {
    msgErro.hidden = true;
    [campoEmail, campoSenha].forEach(c => c.classList.remove("invalido"));
}

// traduz as mensagens do Strapi
function traduzirErro(erro) {
    const msg = erro.message || "";
    if (/invalid identifier or password/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/blocked/i.test(msg)) return "Esta conta foi suspensa por um administrador.";
    if (/failed to fetch|networkerror|load failed/i.test(msg)) return "Não foi possível conectar ao servidor. Tente novamente.";
    return msg || "Não foi possível entrar.";
}

(function redirecionarSeLogado() {
    try {
        const usuario = obterUsuario();
        if (usuario) location.replace(usuario.role.type === "admin" ? "Admin.html" : "index.html");
    } catch { /* ignora inválidos */ }
})();

form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    limparErro();

    const email = campoEmail.value.trim().toLowerCase();
    const senha = campoSenha.value;

    if (!email || !senha) {
        mostrarErro("Preencha e-mail e senha.", [!email ? campoEmail : campoSenha]);
        return;
    }

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    try {
        const conta = await login(email, senha);
        location.href = conta.role.type === "admin" ? "Admin.html" : "index.html";
    } catch (erro) {
        mostrarErro(traduzirErro(erro), [campoEmail, campoSenha]);
        botaoEntrar.disabled = false;
        botaoEntrar.innerHTML = textoBotao;
    }
});

campoEmail.addEventListener("input", limparErro);
campoSenha.addEventListener("input", limparErro);
