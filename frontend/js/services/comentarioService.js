import { request } from "../api.js";

export async function listarComentarios(anuncioId) {
    const params = new URLSearchParams();
    params.set("filters[anuncio][documentId][$eq]", anuncioId);
    params.set("sort", "createdAt:asc");
    params.set("pagination[pageSize]", "100");

    const res = await request(`/comentarios?${params}`, { auth: false });
    return res.data || [];
}

export async function criarComentario(texto, anuncioId, respostaId) {
    const data = {
        texto,
        anuncio: anuncioId,
    };
    if (respostaId) data.resposta = respostaId;

    const res = await request("/comentarios?status=published", {
        method: "POST",
        body: { data },
    });
    return res.data;
}