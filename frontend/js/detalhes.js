import { urlMidia } from "./api.js";
import { obterUsuario } from "./auth.js";
import { buscarAnuncio } from "./services/anuncioService.js";
import {
  carregarComentarios,
  definirAnunciante,
  prepararFormularioComentario,
} from "./components/detalhesComentarios.js";
import { montarCarrossel } from "./components/carrosselFotos.js";

const params = new URLSearchParams(location.search);
const anuncioId = params.get("id");

const msg = document.getElementById("msg-detalhes");
const conteudo = document.getElementById("conteudo-detalhes");
const carrossel = document.getElementById("carrossel-anuncio");
const badgeTipo = document.getElementById("badge-tipo");
const titulo = document.getElementById("titulo-anuncio");
const textoEndereco = document.getElementById("texto-endereco");
const preco = document.getElementById("preco-anuncio");
const atributos = document.getElementById("atributos-imovel");
const nomeAnunciante = document.getElementById("nome-anunciante");
const btnContato = document.getElementById("btn-contato");
const avisoLoginContato = document.getElementById("aviso-login-contato");
const sobre = document.getElementById("sobre-imovel");
const descricao = document.getElementById("descricao-anuncio");

const usuarioLogado = obterUsuario();

const TIPOS = {
  casa: "Casa",
  apartamento: "Apartamento",
  kitnet: "Kitnet",
  comercial: "Comercial",
};

function mostrarErro(texto) {
  msg.textContent = texto;
  msg.hidden = false;
  conteudo.hidden = true;

  const voltar = document.createElement("a");
  voltar.className = "btn btn-outline-secondary mt-2";
  voltar.href = "index.html";
  voltar.textContent = "Voltar";
  if (!msg.nextElementSibling || msg.nextElementSibling.tagName !== "A") {
    msg.insertAdjacentElement("afterend", voltar);
  }
}

function formatarPreco(valor) {
  return `${Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /mês`;
}

function montarEndereco(imovel) {
  const partes = [];
  const rua = String(imovel.rua ?? "").trim();
  const numero = String(imovel.numero ?? "").trim();
  const bairro = String(imovel.bairro ?? "").trim();

  if (rua && numero) partes.push(`${rua}, ${numero}`);
  else if (rua) partes.push(rua);
  if (bairro) partes.push(bairro);

  textoEndereco.textContent = partes.join(" · ") || "Endereço não informado";
}

function criarAtributo(icone, rotulo, valor) {
  const item = document.createElement("li");

  const i = document.createElement("i");
  i.className = `bi ${icone}`;
  i.setAttribute("aria-hidden", "true");

  const texto = document.createElement("span");
  const extra = document.createElement("span");
  extra.className = "atributo-rotulo";
  extra.textContent = rotulo;

  texto.append(valor ? `${valor} ` : "", extra);
  item.append(i, texto);
  atributos.appendChild(item);
}

function montarAtributos(imovel) {
  atributos.replaceChildren();

  const quartos = Number(imovel.qtd_quartos);
  const banheiros = Number(imovel.qtd_banheiros);
  const nQuartos = Number.isFinite(quartos) ? quartos : 0;
  const nBanheiros = Number.isFinite(banheiros) ? banheiros : 0;

  criarAtributo("bi-door-open", nQuartos === 1 ? "Quarto" : "Quartos", String(nQuartos));
  criarAtributo("bi-droplet", nBanheiros === 1 ? "Banheiro" : "Banheiros", String(nBanheiros));
  criarAtributo("bi-lamp", imovel.mobiliado ? "Mobiliado" : "Não mobiliado", "");

  const pets = document.createElement("li");
  const pegadas = document.createElement("span");
  pegadas.className = "icone-pets";
  pegadas.setAttribute("aria-hidden", "true");
  pegadas.textContent = "🐾";
  const textoPets = document.createElement("span");
  textoPets.textContent = imovel.aceita_pets ? "Aceita pets" : "Não aceita pets";
  pets.append(pegadas, textoPets);
  atributos.appendChild(pets);
}

function digitosTelefone(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function montarContato(anunciante) {
  nomeAnunciante.hidden = true;
  btnContato.hidden = true;
  avisoLoginContato.hidden = true;

  if (!usuarioLogado) {
    avisoLoginContato.hidden = false;
    return;
  }

  if (anunciante?.username) {
    nomeAnunciante.textContent = `Anunciante: ${anunciante.username}`;
    nomeAnunciante.hidden = false;
  }

  const telefone = digitosTelefone(anunciante?.telefone);
  if (!telefone) return;

  const comPais = telefone.startsWith("55") ? telefone : `55${telefone}`;
  const mensagem = encodeURIComponent("Olá! Vi seu anúncio no AlugAqui.");
  btnContato.href = `https://wa.me/${comPais}?text=${mensagem}`;
  btnContato.hidden = false;
}

function montarFotos(imagens, tituloAnuncio) {
  const slides = (imagens || [])
    .map((img, i) => {
      const src = urlMidia(img);
      if (!src) return null;
      return { src, alt: `${tituloAnuncio || "Imóvel"} — foto ${i + 1}` };
    })
    .filter(Boolean);

  if (!slides.length) {
    carrossel.replaceChildren();
    const vazio = document.createElement("div");
    vazio.className = "carrossel-fotos carrossel-detalhe d-flex align-items-center justify-content-center text-muted";
    vazio.textContent = "Sem foto";
    carrossel.appendChild(vazio);
    return;
  }

  montarCarrossel(carrossel, slides, {
    id: "carrossel-anuncio-slides",
    className: "carrossel-detalhe",
  });
}

async function carregar() {
  if (!anuncioId) {
    mostrarErro("Anúncio não informado.");
    return;
  }

  try {
    const anuncio = await buscarAnuncio(anuncioId);
    const imovel = anuncio.imovel || {};
    const tipo = TIPOS[imovel.tipo] || imovel.tipo || "Imóvel";

    document.title = `AlugAqui - ${anuncio.titulo || "Detalhes do anúncio"}`;
    badgeTipo.textContent = tipo;
    titulo.textContent = anuncio.titulo || "Sem título";
    preco.textContent = formatarPreco(anuncio.preco);
    montarEndereco(imovel);
    montarAtributos(imovel);
    montarContato(anuncio.usuario);

    if (anuncio.descricao) {
      descricao.textContent = anuncio.descricao;
      sobre.hidden = false;
    } else {
      sobre.hidden = true;
    }

    montarFotos(anuncio.imagens, anuncio.titulo);
    definirAnunciante(anuncio.usuario);
    prepararFormularioComentario();
    conteudo.hidden = false;
    await carregarComentarios();
  } catch (erro) {
    mostrarErro(erro.message || "Não foi possível carregar o anúncio.");
  }
}

carregar();