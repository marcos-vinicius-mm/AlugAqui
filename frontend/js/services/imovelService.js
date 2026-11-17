import { request } from "../api.js";

export async function criarImovel(imovel) {
    const corpo = {
        tipo: imovel.tipo,
        bairro: imovel.bairro,
        rua: imovel.rua,
        qtd_quartos: Number(imovel.qtd_quartos),
        qtd_banheiros: Number(imovel.qtd_banheiros),
        aceita_pets: Boolean(imovel.aceita_pets),
        mobiliado: Boolean(imovel.mobiliado),
        cep: Number(imovel.cep),
    };

    if (imovel.numero) corpo.numero = imovel.numero;

    const resposta = await request("/imoveis", {
        method: "POST",
        body: { data: corpo },
        auth: true
    });

    return resposta.data;
}


export async function atualizarImovel(imovel, imovelId){
    const corpo = {
        tipo: imovel.tipo,
        bairro: imovel.bairro,
        qtd_quartos: Number(imovel.qtd_quartos),
        qtd_banheiros: Number(imovel.qtd_banheiros),
        aceita_pets: Boolean(imovel.aceita_pets),
        mobiliado: Boolean(imovel.mobiliado),
        rua: imovel.rua || null,
        numero: imovel.numero || null,
        cep: imovel.cep ? Number(imovel.cep) : null,
    };


    const resposta = await request(`/imoveis/${imovelId}`,{
        method: "PUT",
        body: { data:corpo },
        auth: true
    });

    return resposta.data;
}



export async function excluirImovel(imovelId) {
    await request(`/imoveis/${imovelId}`, {
        method: "DELETE",
        auth: true
    })
}