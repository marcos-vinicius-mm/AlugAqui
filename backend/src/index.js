
'use strict';

const ACOES_AUTENTICADO = [
  'api::imovel.imovel.create',
  'api::imovel.imovel.find',
  'api::imovel.imovel.findOne',
  'api::imovel.imovel.update',
  'api::imovel.imovel.delete',
  'api::anuncio.anuncio.create',
  'api::anuncio.anuncio.find',
  'api::anuncio.anuncio.findOne',
  'api::anuncio.anuncio.update',
  'api::anuncio.anuncio.delete',
  'api::comentario.comentario.find',
  'api::comentario.comentario.findOne',
  'api::comentario.comentario.create',
  'plugin::upload.content-api.upload',
];

const ACOES_PUBLICO = [
  'api::anuncio.anuncio.find',
  'api::anuncio.anuncio.findOne',
  'api::imovel.imovel.findOne',
  'api::comentario.comentario.find',
  'api::comentario.comentario.findOne',
];

// Perfil "admin" (role.type === "admin"): painel de moderação.
// Sem estas permissões o Strapi responde 403 antes mesmo de chegar ao controller.
const ACOES_ADMIN = [
  // usuários (lista, suspender/ativar e "quem sou eu")
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  'plugin::users-permissions.user.count',
  'plugin::users-permissions.user.update',
  'plugin::users-permissions.user.me',

  // anúncios (ocultar/reativar e remover os de terceiros)
  'api::anuncio.anuncio.find',
  'api::anuncio.anuncio.findOne',
  'api::anuncio.anuncio.update',
  'api::anuncio.anuncio.delete',

  // denúncias
  'api::denuncia.denuncia.find',
  'api::denuncia.denuncia.findOne',
  'api::denuncia.denuncia.update',

  // comentários
  'api::comentario.comentario.find',
  'api::comentario.comentario.findOne',
  'api::comentario.comentario.delete',

  // imóveis (o painel lê bairro e tipo junto com o anúncio)
  'api::imovel.imovel.find',
  'api::imovel.imovel.findOne',
];

async function garantirPermissoes(strapi, tipoRole, acoes) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: tipoRole },
  });
  if (!role) {
    strapi.log.warn(`[permissões] Perfil com type "${tipoRole}" não encontrado: nada foi liberado para ele.`);
    return;
  }

  const existentes = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });
  const jaTem = new Set(existentes.map((p) => p.action));

  let criadas = 0;
  for (const action of acoes) {
    if (jaTem.has(action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id },
    });
    criadas += 1;
  }

  strapi.log.info(`[permissões] Perfil ${tipoRole}: ${criadas} liberada(s), ${acoes.length - criadas} já existiam.`);
}

module.exports = {
  register(/* { strapi } */) {},

  async bootstrap({ strapi }) {
    try {
      await garantirPermissoes(strapi, 'authenticated', ACOES_AUTENTICADO);
      await garantirPermissoes(strapi, 'public', ACOES_PUBLICO);
      await garantirPermissoes(strapi, 'admin', ACOES_ADMIN);
    } catch (erro) {
      // um erro aqui não deve impedir o Strapi de subir
      strapi.log.error(`[permissões] Falha ao liberar permissões: ${erro.message}`);
    }
  },
};