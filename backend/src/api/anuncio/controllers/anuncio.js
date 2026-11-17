'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::anuncio.anuncio';

// administrador = perfil (role) com type "admin"; ele modera anúncios de qualquer usuário
function ehAdmin(usuario) {
  return usuario?.role?.type === 'admin';
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    const usuario = ctx.state.user;
    const meus = ctx.request.header['x-meus-anuncios'] === '1';

    if (meus) {
      if (!usuario) return ctx.unauthorized('É preciso estar logado.');

      const documentos = await strapi.documents(UID).findMany({
        filters: { usuario: { id: usuario.id } },
        populate: ['imovel', 'imagens'],
        sort: 'createdAt:desc',
      });

      const sanitized = await this.sanitizeOutput(documentos, ctx);
      return this.transformResponse(sanitized);
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const docId = ctx.params.id;
    const documento = await strapi.documents(UID).findOne({
      documentId: docId,
      populate: {
        imovel: true,
        imagens: true,
        usuario: {
          fields: ['username', 'telefone'],
        },
      },
    });

    if (!documento) return ctx.notFound();

    const sanitizado = await this.sanitizeOutput(documento, ctx);
    if (sanitizado && documento.usuario) {
      sanitizado.usuario = {
        id: documento.usuario.id,
        username: documento.usuario.username,
        telefone: documento.usuario.telefone,
      };
    }
    return this.transformResponse(sanitizado);
  },

  async create(ctx) {
    const usuario = ctx.state.user;
    if (!usuario) return ctx.unauthorized('É preciso estar logado.');

    const { data } = ctx.request.body;

    const document = await strapi.documents(UID).create({
      data: {
        ...data,
        usuario: usuario.documentId,
      },
      status: ctx.query.status === 'published' ? 'published' : 'draft',
    });

    const sanitized = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const usuario = ctx.state.user;
    if (!usuario) return ctx.unauthorized('É preciso estar logado.');

    const docId = ctx.params.id;
    const existente = await strapi.documents(UID).findOne({
      documentId: docId,
      populate: ['usuario'],
    });

    if (!existente) return ctx.notFound();
    if (!ehAdmin(usuario) && existente.usuario?.id !== usuario.id) {
      return ctx.forbidden('Você só pode editar seus próprios anúncios.');
    }

    const { data } = ctx.request.body;
    delete data.usuario;

    const document = await strapi.documents(UID).update({
      documentId: docId,
      data,
      status: ctx.query.status === 'published' ? 'published' : 'draft',
    });

    const sanitized = await this.sanitizeOutput(document, ctx);
    return this.transformResponse(sanitized);
  },

  async delete(ctx) {
    const usuario = ctx.state.user;
    if (!usuario) return ctx.unauthorized('É preciso estar logado.');

    const docId = ctx.params.id;
    const existente = await strapi.documents(UID).findOne({
      documentId: docId,
      populate: ['usuario', 'imovel'],
    });

    if (!existente) return ctx.notFound();
    if (!ehAdmin(usuario) && existente.usuario?.id !== usuario.id) {
      return ctx.forbidden('Você só pode excluir seus próprios anúncios.');
    }

    const imovelId = existente.imovel?.documentId;

    await strapi.documents(UID).delete({ documentId: docId });

    if (imovelId) {
      await strapi.documents('api::imovel.imovel').delete({ documentId: imovelId });
    }

    return this.transformResponse(existente);
  },
}));