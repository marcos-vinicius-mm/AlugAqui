function criar(tag, classes, texto) {
  const el = document.createElement(tag);
  if (classes) el.className = classes;
  if (texto) el.textContent = texto;
  return el;
}

function criarControle(direcao, rotulo, id) {
  const btn = criar("button", `carousel-control-${direcao}`);
  btn.type = "button";
  btn.dataset.bsTarget = `#${id}`;
  btn.dataset.bsSlide = direcao;

  const icone = criar("span", `carousel-control-${direcao}-icon`);
  icone.setAttribute("aria-hidden", "true");
  const sr = criar("span", "visually-hidden", rotulo);
  btn.append(icone, sr);
  return btn;
}

export function montarCarrossel(container, slides, opcoes = {}) {
  const {
    id = "carrossel-fotos",
    indiceAtivo = 0,
    className = "",
  } = opcoes;

  container.replaceChildren();
  if (!slides.length) return;

  const ativo = Math.min(Math.max(indiceAtivo, 0), slides.length - 1);
  const varios = slides.length > 1;

  const carousel = criar("div", `carousel slide carrossel-fotos ${className}`.trim());
  carousel.id = id;
  carousel.setAttribute("data-bs-ride", "carousel");
  carousel.setAttribute("aria-label", "Fotos do anúncio");

  if (varios) {
    const indicadores = criar("div", "carousel-indicators");
    slides.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.bsTarget = `#${id}`;
      btn.dataset.bsSlideTo = String(i);
      btn.setAttribute("aria-label", `Foto ${i + 1}`);
      if (i === ativo) {
        btn.className = "active";
        btn.setAttribute("aria-current", "true");
      }
      indicadores.appendChild(btn);
    });
    carousel.appendChild(indicadores);
  }

  const inner = criar("div", "carousel-inner");
  slides.forEach((slide, i) => {
    const item = criar("div", `carousel-item${i === ativo ? " active" : ""}`);
    const slideEl = criar("div", "carrossel-slide");

    const img = criar("img", "d-block w-100");
    img.src = slide.src;
    img.alt = slide.alt || `Foto ${i + 1}`;
    slideEl.appendChild(img);

    item.appendChild(slideEl);
    inner.appendChild(item);
  });
  carousel.appendChild(inner);

  if (varios) {
    carousel.append(
      criarControle("prev", "Anterior", id),
      criarControle("next", "Próxima", id),
    );
  }

  container.appendChild(carousel);
}