import { obterUsuario } from "../auth.js";

const itensMenu = [
    { id: "home",       texto: "Home",            href: "index.html",         icone: "bi-house",       perfis: ["authenticated", "admin"] },
    { id: "anunciar",   texto: "Anunciar imóvel", href: "novo-anuncio.html",  icone: "bi-plus-circle", perfis: ["authenticated", "admin"] },
    { id: "anuncios",   texto: "Meus anúncios",   href: "meus-anuncios.html", icone: "bi-building",    perfis: ["authenticated", "admin"] },
    { id: "favoritos",  texto: "Favoritos",       href: "MinhaConta.html?aba=favoritos", icone: "bi-heart", perfis: ["authenticated", "admin"] },
    { id: "perfil",     texto: "Meu perfil",      href: "MinhaConta.html?aba=perfil", icone: "bi-person", perfis: ["authenticated", "admin"] },
    { id: "admin",      texto: "Painel admin",    href: "Admin.html",         icone: "bi-gear",        perfis: ["admin"] },
];

// Função auxiliar para a criação dos elementos html
function criar(tag, classes, texto) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (texto) el.textContent = texto;
    return el;
}

function arquivoPagina() {
    const arquivo = location.pathname.split("/").pop();
    return arquivo && arquivo.endsWith(".html") ? arquivo : "index.html";
}

// Função que define quais itens do menu aparecem com base nas permissões do tipo de usuário
function filtrarItens(usuario, idsOcultos) {
    return itensMenu.filter(item =>
        item.perfis.includes(usuario.role.type) &&
        !idsOcultos.includes(item.id)
    );
}

function criarLink(item, pagina) {
    const li = criar("li", "nav-item");
    const a = criar("a", "nav-link d-flex align-items-center gap-2");
    a.href = item.href;
    // links com "?aba=..." só ficam ativos na aba correspondente
    if (item.href === pagina || item.href === pagina + location.search) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
    }

    a.appendChild(criar("i", `bi ${item.icone}`));
    a.appendChild(criar("span", "", item.texto));
    li.appendChild(a);
    return li;
}

function criarBotao() {
    const nav = criar("nav", "navbar");
    nav.dataset.bsTheme = "dark";

    const btn = criar("button", "btn-menu navbar-toggler");
    btn.type = "button";
    btn.dataset.bsToggle = "offcanvas";
    btn.dataset.bsTarget = "#menuLateral";
    btn.setAttribute("aria-controls", "menuLateral");
    btn.setAttribute("aria-label", "Abrir menu");
    btn.appendChild(criar("i", "bi bi-list"));

    nav.appendChild(btn);
    return nav;
}

function criarMenuLateral(usuario, itens, pagina) {
    const menu = criar("div", "offcanvas offcanvas-end");
    menu.id = "menuLateral";
    menu.tabIndex = -1;
    menu.setAttribute("aria-labelledby", "menuLateralLabel");

    const header = criar("div", "offcanvas-header");
    const titulo = criar("h5", "offcanvas-title", `Olá, ${usuario.username}`);
    titulo.id = "menuLateralLabel";
    const fechar = criar("button", "btn-close");
    fechar.type = "button";
    fechar.dataset.bsDismiss = "offcanvas";
    fechar.setAttribute("aria-label", "Fechar");
    header.append(titulo, fechar);

    const body = criar("div", "offcanvas-body d-flex flex-column");
    const ul = criar("ul", "navbar-nav");
    itens.forEach(item => ul.appendChild(criarLink(item, pagina)));
    body.appendChild(ul);

    const sair = criar("button", "btn btn-cinza-sair rounded-pill mt-auto align-self-center", "Sair");
    sair.type = "button";
    sair.addEventListener("click", () => {
        sessionStorage.removeItem("usuario");
        sessionStorage.removeItem("token");
        location.href = "login.html";
    });
    body.appendChild(sair);

    menu.append(header, body);
    return menu;
}

function renderNavbar() {
    const container = document.getElementById("navbar");
    if (!container) return;

    const usuario = obterUsuario();
    if (!usuario) return;   // só aparece para usuário logado

    // lê o atributo data-ocultar da página: "anunciar,favoritos" -> ["anunciar", "favoritos"]
    const idsOcultos = (container.dataset.ocultar || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    const pagina = arquivoPagina();
    const itens = filtrarItens(usuario, idsOcultos);

    container.replaceChildren(criarBotao());

    if (!document.getElementById("menuLateral")) {
        document.body.appendChild(criarMenuLateral(usuario, itens, pagina));
    }
}

renderNavbar();