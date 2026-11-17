import { obterUsuario } from "../auth.js";
import { listarComentarios, criarComentario } from "../services/comentarioService.js";

const params = new URLSearchParams(location.search);
const anuncioId = params.get("id");

const tituloComentarios = document.getElementById("titulo-comentarios");
const msgComentarios = document.getElementById("msg-comentarios");
const formComentario = document.getElementById("form-comentario");
const campoComentario = document.getElementById("texto-comentario");
const avisoLoginComentario = document.getElementById("aviso-login-comentario");
const listaComentarios = document.getElementById("lista-comentarios");

const usuarioLogado = obterUsuario();
let idAnunciante = null;
let usernameAnunciante = null;

export function definirAnunciante(usuario) {
  idAnunciante = usuario?.id ?? null;
  usernameAnunciante = usuario?.username ?? null;
}

function formatarData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mostrarMsgComentarios(texto, erro = false) {
  msgComentarios.textContent = texto;
  msgComentarios.classList.toggle("erro", erro);
  msgComentarios.hidden = !texto;
}

function idDoComentario(comentario) {
  if (comentario.documentId) return String(comentario.documentId);
  if (comentario.id != null) return String(comentario.id);
  return "";
}

function comentarioEhDoAnunciante(comentario) {
  const autorId = comentario.usario?.id;
  if (idAnunciante != null && autorId != null) {
    return Number(autorId) === Number(idAnunciante);
  }
  const autor = comentario.usario?.username;
  return Boolean(autor && usernameAnunciante && autor === usernameAnunciante);
}

function idDaResposta(comentario) {
  const pai = comentario.resposta;
  if (!pai) return null;
  if (typeof pai === "object") {
    if (pai.documentId) return String(pai.documentId);
    if (pai.id != null) return String(pai.id);
    return null;
  }
  return String(pai);
}

function montarCabecalhoComentario(comentario) {
  const cabecalho = document.createElement("div");
  cabecalho.className = "cabecalho-comentario";

  const nome = document.createElement("p");
  nome.className = "nome-comentario";
  nome.textContent = comentario.usario?.username || "Usuário";
  cabecalho.appendChild(nome);

  if (comentarioEhDoAnunciante(comentario)) {
    const selo = document.createElement("span");
    selo.className = "selo-anunciante";
    selo.textContent = "Anunciante";
    cabecalho.appendChild(selo);
  }

  const data = document.createElement("p");
  data.className = "data-comentario";
  data.textContent = formatarData(comentario.createdAt);
  cabecalho.appendChild(data);

  return cabecalho;
}

function montarFormResposta(idPai) {
  const form = document.createElement("form");
  form.className = "form-resposta";
  form.hidden = true;

  const grupo = document.createElement("div");
  grupo.className = "input-group";

  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "form-control";
  campo.maxLength = 255;
  campo.placeholder = "Escreva uma resposta...";
  campo.required = true;

  const botao = document.createElement("button");
  botao.type = "submit";
  botao.className = "btn btn-primary";
  botao.textContent = "Responder";

  grupo.append(campo, botao);
  form.appendChild(grupo);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    try {
      await criarComentario(texto, anuncioId, idPai);
      campo.value = "";
      form.hidden = true;
      mostrarMsgComentarios("");
      await carregarComentarios();
    } catch (erro) {
      mostrarMsgComentarios(erro.message || "Não foi possível responder.", true);
    }
  });

  return form;
}

function montarItemComentario(comentario, respostas) {
  const item = document.createElement("article");
  item.className = "item-comentario";
  item.appendChild(montarCabecalhoComentario(comentario));

  const texto = document.createElement("p");
  texto.className = "texto-comentario";
  texto.textContent = comentario.texto || "";
  item.appendChild(texto);

  if (usuarioLogado) {
    const formResposta = montarFormResposta(idDoComentario(comentario));
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-responder";
    botao.textContent = "Responder";
    botao.addEventListener("click", () => {
      formResposta.hidden = !formResposta.hidden;
    });
    item.append(botao, formResposta);
  }

  if (respostas.length) {
    const lista = document.createElement("div");
    lista.className = "lista-respostas";
    for (const resposta of respostas) {
      const card = document.createElement("div");
      card.className = "item-resposta";
      card.appendChild(montarCabecalhoComentario(resposta));
      const textoResposta = document.createElement("p");
      textoResposta.className = "texto-comentario";
      textoResposta.textContent = resposta.texto || "";
      card.appendChild(textoResposta);
      lista.appendChild(card);
    }
    item.appendChild(lista);
  }

  return item;
}

export function prepararFormularioComentario() {
  if (usuarioLogado) {
    formComentario.hidden = false;
    avisoLoginComentario.hidden = true;
  } else {
    formComentario.hidden = true;
    avisoLoginComentario.hidden = false;
  }
}

export async function carregarComentarios() {
  if (!anuncioId) return;

  try {
    const todos = await listarComentarios(anuncioId);
    const respostasPorPai = {};
    const principais = [];

    for (const comentario of todos) {
      const idPai = idDaResposta(comentario);
      if (idPai) {
        if (!respostasPorPai[idPai]) respostasPorPai[idPai] = [];
        respostasPorPai[idPai].push(comentario);
        continue;
      }
      principais.push(comentario);
    }

    tituloComentarios.textContent = `Comentários (${todos.length})`;
    listaComentarios.replaceChildren();

    if (!principais.length) {
      const vazio = document.createElement("p");
      vazio.className = "text-muted mb-0";
      vazio.textContent = "Nenhum comentário ainda.";
      listaComentarios.appendChild(vazio);
      return;
    }

    for (const comentario of principais) {
      const chavePai = idDoComentario(comentario);
      const respostas = chavePai ? respostasPorPai[chavePai] || [] : [];
      listaComentarios.appendChild(montarItemComentario(comentario, respostas));
    }
  } catch (erro) {
    mostrarMsgComentarios(erro.message || "Não foi possível carregar os comentários.", true);
  }
}

formComentario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const texto = campoComentario.value.trim();
  if (!texto) {
    campoComentario.focus();
    return;
  }
  try {
    await criarComentario(texto, anuncioId, null);
    campoComentario.value = "";
    mostrarMsgComentarios("");
    await carregarComentarios();
  } catch (erro) {
    mostrarMsgComentarios(erro.message || "Não foi possível publicar o comentário.", true);
  }
});