'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::comentario.comentario', ({ strapi }) => ({
  async find(ctx) {
    const anuncioId = ctx.query?.filters?.anuncio?.documentId?.$eq;
    if (!anuncioId) {
      return ctx.badRequest('Informe o anúncio para listar os comentários.');
    }

    const documentos = await strapi.documents('api::comentario.comentario').findMany({
      filters: { anuncio: { documentId: anuncioId } },
      populate: {
        usario: { fields: ['id', 'username'] },
        resposta: { fields: ['documentId'] },
      },
      sort: 'createdAt:asc',
      status: 'published',
    });

    const lista = documentos.map((doc) => ({
      ...doc,
      usario: doc.usario
        ? { id: doc.usario.id, username: doc.usario.username }
        : null,
      resposta: doc.resposta?.documentId
        ? { documentId: doc.resposta.documentId }
        : doc.resposta,
    }));

    return this.transformResponse(lista);
  },

  async create(ctx) {
    const usuario = ctx.state.user;
    if (!usuario) return ctx.unauthorized('É preciso estar logado para comentar.');

    const { data } = ctx.request.body;
    const texto = String(data?.texto || '').trim();
    if (!texto) return ctx.badRequest('Escreva um comentário.');

    const corpo = {
      texto,
      usario: usuario.documentId,
      anuncio: data.anuncio,
    };
    if (data.resposta) corpo.resposta = data.resposta;

    const documento = await strapi.documents('api::comentario.comentario').create({
      data: corpo,
      status: ctx.query.status === 'published' ? 'published' : 'draft',
      populate: {
        usario: { fields: ['id', 'username'] },
        resposta: { fields: ['documentId'] },
      },
    });

    return this.transformResponse(documento);
  },
}));