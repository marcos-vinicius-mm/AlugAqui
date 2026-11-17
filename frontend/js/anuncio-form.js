import { obterUsuario } from "./auth.js";
import { urlMidia } from "./api.js";
import { criarImovel, atualizarImovel, excluirImovel } from "./services/imovelService.js";
import { buscarAnuncio, criarAnuncio, atualizarAnuncio, excluirAnuncio, enviarFotos } from "./services/anuncioService.js";


const usuario = obterUsuario();
if (!usuario) location.replace("login.html");

const params = new URLSearchParams(location.search);
const anuncioId = params.get("id");

const form = document.getElementById("form-anuncio");
const msg = document.getElementById("msg-form");
const preview = document.getElementById("preview-fotos");
const inputImagens = document.getElementById("imagens");
const ajudaFotos = document.getElementById("ajuda-fotos");
const tituloForm = document.getElementById("titulo-form");
const btnSalvar = document.getElementById("btn-salvar");
const acoesForm = document.getElementById("acoes-form");
const campoCep = document.getElementById("cep");

const MAX_FOTOS = 8;
const MAX_TAMANHO_MB = 5;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

let imagensExistentes = [];
let fotosNovas = [];
let urlsPreview = [];
let documentoImovel = null;
let formularioAlterado = false;

function mostrarMsg(texto, erro = true) {
  msg.textContent = texto;
  msg.hidden = false;
  msg.classList.toggle("erro", erro);
  msg.classList.toggle("sucesso", !erro);
}

function limparMsg() {
  msg.hidden = true;
}

function marcarInvalido(el) {
  if (!el) return;
  el.classList.add("is-invalid");
  el.focus();
}

function limparInvalidos() {
  for (const el of form.querySelectorAll(".is-invalid")) {
    el.classList.remove("is-invalid");
  }
}

function definirFormularioAtivo(ativo) {
  form.classList.toggle("form-desabilitado", !ativo);
  for (const el of form.elements) {
    if (el === btnSalvar) continue;
    el.disabled = !ativo;
  }
  btnSalvar.disabled = !ativo;
}

function campo(formulario, nome) {
  return formulario.elements.namedItem(nome);
}

function apenasDigitosCep(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 8);
  return digitos || undefined;
}

function cepParaCampo(valor) {
  const digitos = apenasDigitosCep(valor);
  if (!digitos) return "";
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5, 8)}`;
}

function totalFotos() {
  return imagensExistentes.length + fotosNovas.length;
}

function chaveArquivo(arquivo) {
  return `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`;
}

function arquivoValido(arquivo) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return `"${arquivo.name}" não é uma imagem válida. Use JPG, PNG, WEBP ou GIF.`;
  }
  if (arquivo.size > MAX_TAMANHO_MB * 1024 * 1024) {
    return `"${arquivo.name}" passa de ${MAX_TAMANHO_MB} MB.`;
  }
  return null;
}

function limparUrlsPreview() {
  for (const url of urlsPreview) URL.revokeObjectURL(url);
  urlsPreview = [];
}

function criarItemPreview(src, rotulo, aoRemover) {
  const item = document.createElement("div");
  item.className = "preview-item";

  const img = document.createElement("img");
  img.src = src;
  img.alt = rotulo;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-remover-foto";
  btn.setAttribute("aria-label", `Remover ${rotulo}`);
  const marca = document.createElement("span");
  marca.setAttribute("aria-hidden", "true");
  marca.textContent = "×";
  btn.appendChild(marca);
  btn.addEventListener("click", () => {
    formularioAlterado = true;
    limparMsg();
    aoRemover();
    atualizarPreview();
  });

  item.append(img, btn);
  return item;
}

function atualizarPreview() {
  limparUrlsPreview();
  preview.replaceChildren();

  imagensExistentes.forEach((img, i) => {
    preview.appendChild(
      criarItemPreview(urlMidia(img), `foto ${i + 1}`, () => {
        imagensExistentes = imagensExistentes.filter((item) => item !== img);
      }),
    );
  });

  fotosNovas.forEach((arquivo) => {
    const url = URL.createObjectURL(arquivo);
    urlsPreview.push(url);
    preview.appendChild(
      criarItemPreview(url, arquivo.name, () => {
        fotosNovas = fotosNovas.filter((item) => item !== arquivo);
      }),
    );
  });
}

function adicionarArquivos(lista) {
  const jaTem = new Set(fotosNovas.map(chaveArquivo));
  let recusou = null;

  for (const arquivo of lista) {
    if (totalFotos() >= MAX_FOTOS) {
      recusou = `Pode enviar no máximo ${MAX_FOTOS} fotos.`;
      break;
    }
    const erro = arquivoValido(arquivo);
    if (erro) {
      recusou = erro;
      continue;
    }
    if (jaTem.has(chaveArquivo(arquivo))) continue;
    fotosNovas.push(arquivo);
    jaTem.add(chaveArquivo(arquivo));
  }

  inputImagens.value = "";
  atualizarPreview();
  if (recusou) mostrarMsg(recusou);
}

function lerDados(formulario) {
  const titulo = campo(formulario, "titulo");
  const tipo = campo(formulario, "tipo");
  const bairro = campo(formulario, "bairro");
  const preco = campo(formulario, "preco");

  return {
    titulo: titulo?.value?.trim() ?? "",
    descricao: campo(formulario, "descricao")?.value?.trim() ?? "",
    preco: Number(preco?.value),
    tipo: tipo?.value ?? "",
    bairro: bairro?.value?.trim() ?? "",
    rua: campo(formulario, "rua")?.value?.trim() ?? "",
    numero: campo(formulario, "numero")?.value?.trim() || undefined,
    cep: apenasDigitosCep(campo(formulario, "cep")?.value),
    qtd_quartos: Number(campo(formulario, "qtd_quartos")?.value),
    qtd_banheiros: Number(campo(formulario, "qtd_banheiros")?.value),
    aceita_pets: campo(formulario, "aceita_pets")?.checked ?? false,
    mobiliado: campo(formulario, "mobiliado")?.checked ?? false,
    arquivosNovos: [...fotosNovas],
  };
}

function validar(dados) {
  if (dados.titulo.length < 3) {
    return { texto: "O título precisa ter pelo menos 3 caracteres.", campo: campo(form, "titulo") };
  }
  if (!dados.tipo) {
    return { texto: "Selecione o tipo do imóvel.", campo: campo(form, "tipo") };
  }
  if (!dados.bairro) {
    return { texto: "Informe o bairro.", campo: campo(form, "bairro") };
  }
  if (!dados.rua) {
    return { texto: "Informe a rua.", campo: campo(form, "rua") };
  }
  if (!dados.cep || dados.cep.length !== 8) {
    return { texto: "Informe o CEP completo, no formato 63900-000.", campo: campo(form, "cep") };
  }
  if (!Number.isInteger(dados.preco) || dados.preco < 1) {
    return { texto: "Informe um preço mensal válido, sem centavos.", campo: campo(form, "preco") };
  }
  if (!Number.isInteger(dados.qtd_quartos) || dados.qtd_quartos < 0 || dados.qtd_quartos > 20) {
    return { texto: "Informe a quantidade de quartos (0 a 20).", campo: campo(form, "qtd_quartos") };
  }
  if (!Number.isInteger(dados.qtd_banheiros) || dados.qtd_banheiros < 0 || dados.qtd_banheiros > 20) {
    return { texto: "Informe a quantidade de banheiros (0 a 20).", campo: campo(form, "qtd_banheiros") };
  }
  if (totalFotos() === 0) {
    return { texto: "Adicione pelo menos uma foto.", campo: inputImagens };
  }
  return null;
}

campoCep.addEventListener("input", () => {
  campoCep.value = cepParaCampo(campoCep.value);
});

inputImagens.addEventListener("change", () => {
  limparMsg();
  formularioAlterado = true;
  if (inputImagens.files.length) adicionarArquivos([...inputImagens.files]);
});

form.addEventListener("input", (evento) => {
  formularioAlterado = true;
  evento.target.classList?.remove("is-invalid");
});

const linkCancelar = document.getElementById("link-cancelar");
if (linkCancelar) {
  linkCancelar.addEventListener("click", (evento) => {
    if (!formularioAlterado) return;
    const sair = confirm("Descartar as alterações?");
    if (!sair) evento.preventDefault();
  });
}

async function excluirAnuncioAtual() {
  const ok = confirm("Excluir este anúncio? Essa ação não pode ser desfeita.");
  if (!ok) return;

  definirFormularioAtivo(false);
  try {
    await excluirAnuncio(anuncioId);
    await excluirImovel(documentoImovel).catch(() => {});
    location.href = "meus-anuncios.html";
  } catch (erro) {
    definirFormularioAtivo(true);
    mostrarMsg(erro.message || "Não foi possível excluir.");
  }
}

function adicionarBotaoExcluir() {
  if (document.getElementById("btn-excluir-anuncio")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btn-excluir-anuncio";
  btn.className = "btn btn-outline-danger me-auto";
  btn.textContent = "Excluir anúncio";
  btn.addEventListener("click", excluirAnuncioAtual);

  acoesForm.prepend(btn);
  acoesForm.classList.add("acoes-com-excluir");
}

async function carregarEdicao() {
  definirFormularioAtivo(false);
  tituloForm.textContent = "Editar anúncio";
  btnSalvar.textContent = "Salvar alterações";
  if (ajudaFotos) {
    ajudaFotos.textContent = "Envie novas fotos só se quiser trocar as atuais.";
  }

  try {
    const item = await buscarAnuncio(anuncioId);

    const imovel = item.imovel;
    if (!imovel?.documentId) throw new Error("Imóvel deste anúncio não foi encontrado.");

    documentoImovel = imovel.documentId;
    campo(form, "titulo").value = item.titulo || "";
    campo(form, "descricao").value = item.descricao || "";
    campo(form, "preco").value = item.preco ?? "";
    campo(form, "tipo").value = imovel.tipo || "";
    campo(form, "bairro").value = imovel.bairro || "";
    campo(form, "rua").value = imovel.rua || "";
    campo(form, "numero").value = imovel.numero || "";
    campo(form, "cep").value = cepParaCampo(imovel.cep);
    campo(form, "qtd_quartos").value = imovel.qtd_quartos ?? 1;
    campo(form, "qtd_banheiros").value = imovel.qtd_banheiros ?? 1;
    campo(form, "aceita_pets").checked = !!imovel.aceita_pets;
    campo(form, "mobiliado").checked = !!imovel.mobiliado;

    imagensExistentes = item.imagens || [];
    fotosNovas = [];
    atualizarPreview();
    adicionarBotaoExcluir();
    formularioAlterado = false;
  } finally {
    definirFormularioAtivo(true);
  }
}

async function salvar(evento) {
  evento.preventDefault();
  limparMsg();
  limparInvalidos();

  if (!form.checkValidity()) {
    form.reportValidity();
    const primeiroInvalido = form.querySelector(":invalid");
    if (primeiroInvalido) primeiroInvalido.classList.add("is-invalid");
    return;
  }

  const dados = lerDados(form);
  const erroValidacao = validar(dados);
  if (erroValidacao) {
    mostrarMsg(erroValidacao.texto);
    marcarInvalido(erroValidacao.campo);
    return;
  }

  definirFormularioAtivo(false);
  btnSalvar.textContent = "Salvando…";

  let imovelCriado = null;

  try {
    const idsNovas = dados.arquivosNovos.length ? await enviarFotos(dados.arquivosNovos) : [];
    const idsImagens = [...imagensExistentes.map((img) => img.id), ...idsNovas];

    if (anuncioId) {
      await atualizarImovel(dados, documentoImovel);
      await atualizarAnuncio(anuncioId, dados, idsImagens);
    } else {
      imovelCriado = await criarImovel(dados);
      await criarAnuncio(dados, idsImagens, imovelCriado.documentId, usuario.id);
    }

    mostrarMsg(anuncioId ? "Alterações salvas!" : "Anúncio publicado!", false);
    formularioAlterado = false;
    setTimeout(() => {
      location.href = "meus-anuncios.html?salvo=1";
    }, 600);
  } catch (erro) {
    if (imovelCriado) {
      await excluirImovel(imovelCriado.documentId).catch(() => {});
    }
    mostrarMsg(erro.message || "Não foi possível salvar.");
    definirFormularioAtivo(true);
    btnSalvar.textContent = anuncioId ? "Salvar alterações" : "Publicar anúncio";
  }
}

form.addEventListener("submit", salvar);

if (anuncioId) {
  carregarEdicao().catch((erro) => mostrarMsg(erro.message));
}
