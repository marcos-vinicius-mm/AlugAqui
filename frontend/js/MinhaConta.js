// Minha Conta: meus anúncios, favoritos e perfil.
// Usa o mesmo api.js / auth.js das outras páginas (token e usuário na sessionStorage).

import { obterUsuario } from "./auth.js";
import { request, urlMidia } from "./api.js";

let usuario = obterUsuario();
let meusAnuncios = [];

/* ========================= utilidades ========================= */

// Monta elementos com textContent: texto de usuário nunca vira HTML.
function criar(tag, classes, texto) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (texto !== undefined && texto !== null) el.textContent = texto;
    return el;
}

function icone(classes) {
    const i = criar("i", `bi ${classes}`);
    i.setAttribute("aria-hidden", "true");
    return i;
}

function formatarPreco(valor) {
    return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function somenteDigitos(texto) {
    return texto.replace(/\D/g, "");
}

// (88) 99999-9999 ou (88) 9999-9999
function formatarTelefone(texto) {
    const d = somenteDigitos(texto).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const STATUS = {
    ativo:   { classe: "status-ativo",   icone: "bi-check-circle-fill", texto: "Ativo" },
    alugado: { classe: "status-alugado", icone: "bi-key-fill",          texto: "Alugado" },
    pausado: { classe: "status-pausado", icone: "bi-pause-circle-fill", texto: "Pausado" },
};

function infoStatus(status) {
    return STATUS[String(status || "ativo").toLowerCase()] || STATUS.ativo;
}

function estadoVazio(iconeClasse, titulo, texto) {
    const caixa = criar("div", "estado-vazio");
    caixa.append(icone(iconeClasse), criar("h4", "", titulo), criar("p", "", texto));
    return caixa;
}

function botaoCard(texto, perigo, acao) {
    const b = criar("button", `btn-card${perigo ? " btn-card-perigo" : ""}`, texto);
    b.type = "button";
    b.addEventListener("click", acao);
    return b;
}

function linkCard(texto, href) {
    const a = criar("a", "btn-card", texto);
    a.href = href;
    return a;
}

// card usado nos anúncios e nos favoritos
function criarCard({ titulo, local, preco, imagem, iconePadrao, pill, acoes }) {
    const card = criar("article", "card-imovel-conta");

    const topo = criar("div", "card-imovel-topo");
    if (pill) {
        const p = criar("span", `status-pill ${pill.classe}`);
        p.append(icone(pill.icone), ` ${pill.texto}`);
        topo.appendChild(p);
    }
    if (imagem) {
        const img = criar("img");
        img.src = imagem;
        img.alt = titulo;
        topo.appendChild(img);
    } else {
        topo.appendChild(icone(iconePadrao));
    }

    const corpo = criar("div", "card-imovel-corpo");
    const lugar = criar("p", "card-imovel-local");
    lugar.append(icone("bi-geo-alt me-1"), local);

    const valor = criar("div", "card-imovel-preco", formatarPreco(preco));
    valor.append(" ", criar("small", "text-muted fw-normal fs-6", "/mês"));

    const caixaAcoes = criar("div", "card-imovel-acoes");
    caixaAcoes.append(...acoes);

    corpo.append(criar("h4", "", titulo), lugar, valor, caixaAcoes);
    card.append(topo, corpo);
    return card;
}

/* ========================= meus anúncios ========================= */

function renderizarAnuncios() {
    const container = document.getElementById("lista-meus-anuncios");
    const filtro = document.getElementById("filtro-status-anuncio").value;
    document.getElementById("contador-anuncios").textContent = meusAnuncios.length;

    const visiveis = meusAnuncios.filter(a =>
        filtro === "todos" || String(a.status_anuncio || "ativo").toLowerCase() === filtro
    );

    if (!visiveis.length) {
        container.replaceChildren(estadoVazio(
            "bi-house-slash",
            "Nenhum anúncio encontrado",
            meusAnuncios.length
                ? "Você não possui anúncios nesta categoria."
                : "Você ainda não publicou nenhum imóvel."
        ));
        return;
    }

    container.replaceChildren(...visiveis.map(a => criarCard({
        titulo: a.titulo || "Imóvel sem título",
        local: a.imovel?.bairro || "Localização não informada",
        preco: a.preco,
        imagem: a.imagens?.[0] ? urlMidia(a.imagens[0]) : null,
        iconePadrao: "bi-house-door",
        pill: infoStatus(a.status_anuncio),
        acoes: [
            linkCard("Ver", `detalhes.html?id=${encodeURIComponent(a.documentId)}`),
            linkCard("Editar", `novo-anuncio.html?id=${encodeURIComponent(a.documentId)}`),
            botaoCard("Excluir", true, () => excluirAnuncio(a)),
        ],
    })));
}

async function carregarMeusAnuncios() {
    const container = document.getElementById("lista-meus-anuncios");
    container.replaceChildren(estadoVazio("bi-hourglass-split", "Carregando...", "Buscando seus anúncios."));

    try {
        // o cabeçalho pede ao servidor só os anúncios do usuário logado (com imóvel e fotos)
        const resposta = await request("/anuncios", { headersExtra: { "X-Meus-Anuncios": "1" } });
        meusAnuncios = resposta.data || [];
    } catch (erro) {
        meusAnuncios = [];
        document.getElementById("contador-anuncios").textContent = "0";
        container.replaceChildren(estadoVazio("bi-exclamation-triangle", "Não foi possível carregar", erro.message));
        return;
    }

    renderizarAnuncios();
}

async function excluirAnuncio(anuncio) {
    if (!confirm(`Excluir "${anuncio.titulo || "este anúncio"}"? Essa ação não pode ser desfeita.`)) return;

    try {
        await request(`/anuncios/${anuncio.documentId}`, { method: "DELETE" });
    } catch (erro) {
        alert(erro.message || "Não foi possível excluir o anúncio.");
        return;
    }

    meusAnuncios = meusAnuncios.filter(a => a.documentId !== anuncio.documentId);
    renderizarAnuncios();
}

/* ========================= favoritos =========================
   Ainda não existe favoritos no servidor: ficam neste navegador (localStorage), por usuário.
   Formato de cada item, para quem for criar o botão de favoritar:
   { id: <documentId do anúncio>, titulo, preco, bairro, imagem: <url> }                      */

function chaveFavoritos() {
    return `favoritos_${usuario.id}`;
}

function obterFavoritos() {
    try {
        const lista = JSON.parse(localStorage.getItem(chaveFavoritos()));
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}

function renderizarFavoritos() {
    const favoritos = obterFavoritos();
    const container = document.getElementById("lista-favoritos");
    document.getElementById("contador-favoritos").textContent = favoritos.length;

    if (!favoritos.length) {
        container.replaceChildren(estadoVazio(
            "bi-heart",
            "Nenhum favorito salvo",
            "Explore os imóveis na página inicial e salve os que mais gostar."
        ));
        return;
    }

    container.replaceChildren(...favoritos.map(f => criarCard({
        titulo: f.titulo || "Imóvel favoritado",
        local: f.bairro || "Localização não informada",
        preco: f.preco,
        imagem: f.imagem || null,
        iconePadrao: "bi-house-heart",
        acoes: [
            linkCard("Ver detalhes", `detalhes.html?id=${encodeURIComponent(f.id)}`),
            botaoCard("Remover", true, () => removerFavorito(f.id)),
        ],
    })));
}

function removerFavorito(id) {
    const restantes = obterFavoritos().filter(f => String(f.id) !== String(id));
    try {
        localStorage.setItem(chaveFavoritos(), JSON.stringify(restantes));
    } catch { /* armazenamento indisponível */ }
    renderizarFavoritos();
}

/* ========================= perfil ========================= */

function mostrarMensagemPerfil(texto, erro = false) {
    const msg = document.getElementById("msg-perfil");
    msg.textContent = texto;
    msg.className = `msg-feedback ${erro ? "erro" : "sucesso"}`;
    msg.hidden = false;
}

function carregarPerfil() {
    const nome = usuario.username || "Usuário";
    document.getElementById("perfil-avatar").textContent = nome.charAt(0).toUpperCase();
    document.getElementById("perfil-cabecalho-nome").textContent = nome;
    document.getElementById("perfil-badge-tipo").textContent =
        usuario.role?.type === "admin" ? "Administrador" : "Conta Comum";

    document.getElementById("perfil-nome").value = usuario.username || "";
    document.getElementById("perfil-email").value = usuario.email || "";
    document.getElementById("perfil-telefone").value = usuario.telefone || "";
    document.getElementById("perfil-cidade").value = usuario.cidade || "";
}

function traduzirErroPerfil(erro) {
    const msg = erro.message || "";
    if (/already taken/i.test(msg)) return "Este e-mail ou nome de usuário já está em uso.";
    if (/failed to fetch|networkerror|load failed/i.test(msg)) return "Não foi possível conectar ao servidor.";
    return msg || "Não foi possível salvar o perfil.";
}

async function salvarPerfil(evento) {
    evento.preventDefault();
    document.getElementById("msg-perfil").hidden = true;

    const dados = {
        username: document.getElementById("perfil-nome").value.trim(),
        email: document.getElementById("perfil-email").value.trim().toLowerCase(),
        telefone: document.getElementById("perfil-telefone").value.trim(),
        cidade: document.getElementById("perfil-cidade").value.trim(),
    };

    if (dados.username.length < 3 || !/^[\w.-]+$/.test(dados.username)) {
        return mostrarMensagemPerfil("Nome de usuário: mínimo de 3 caracteres, só letras, números, ponto, hífen ou sublinhado.", true);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
        return mostrarMensagemPerfil("Informe um e-mail válido.", true);
    }
    if (dados.telefone && ![10, 11].includes(somenteDigitos(dados.telefone).length)) {
        return mostrarMensagemPerfil("Telefone inválido. Informe o DDD e o número.", true);
    }

    const botao = document.querySelector(".btn-salvar-perfil");
    botao.disabled = true;

    try {
        await request("/users/me", { method: "PUT", body: dados });

        // atualiza a sessão com os dados que o servidor guardou (e o papel do usuário)
        usuario = await request("/users/me?populate=role");
        sessionStorage.setItem("usuario", JSON.stringify(usuario));

        carregarPerfil();
        mostrarMensagemPerfil("Dados do perfil atualizados com sucesso!");
    } catch (erro) {
        mostrarMensagemPerfil(traduzirErroPerfil(erro), true);
    } finally {
        botao.disabled = false;
    }
}

/* ========================= início ========================= */

function abrirAbaDaUrl() {
    const aba = new URLSearchParams(location.search).get("aba");
    const botao = aba && document.getElementById(`tab-${aba}-btn`);
    if (botao) window.bootstrap.Tab.getOrCreateInstance(botao).show();
}

function iniciar() {
    if (!usuario) {
        location.replace("login.html");
        return;
    }

    carregarPerfil();
    renderizarFavoritos();
    carregarMeusAnuncios();
    abrirAbaDaUrl();

    const telefone = document.getElementById("perfil-telefone");
    telefone.addEventListener("input", () => { telefone.value = formatarTelefone(telefone.value); });

    document.getElementById("form-perfil").addEventListener("submit", salvarPerfil);
    document.getElementById("filtro-status-anuncio").addEventListener("change", renderizarAnuncios);
}

iniciar();
