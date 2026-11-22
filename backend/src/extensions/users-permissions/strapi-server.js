'use strict';

/**
 * Extensão do plugin users-permissions.
 *
 * Adiciona PUT /api/users/me: o usuário logado edita o PRÓPRIO perfil
 * (nome de usuário, e-mail, telefone e cidade).
 *
 * Por que não usar PUT /api/users/:id? Essa rota deixa quem tem a permissão alterar
 * QUALQUER usuário (inclusive o papel/role e o bloqueio), então ela fica só para o admin.
 * Aqui só os campos abaixo são aceitos e o id vem do token, nunca da requisição.
 */

const CAMPOS_PERFIL = ['username', 'email', 'telefone', 'cidade'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_VALIDO = /^[\w.-]+$/;

module.exports = (plugin) => {
  plugin.controllers.user.updateMe = async (ctx) => {
    const logado = ctx.state.user;
    if (!logado) return ctx.unauthorized();

    const corpo = ctx.request.body || {};
    const data = {};

    for (const campo of CAMPOS_PERFIL) {
      if (corpo[campo] === undefined) continue;
      const valor = corpo[campo] === null ? '' : String(corpo[campo]).trim();
      data[campo] = valor;
    }

    if (data.username !== undefined) {
      if (data.username.length < 3 || data.username.length > 30 || !USUARIO_VALIDO.test(data.username)) {
        return ctx.badRequest('Nome de usuário inválido.');
      }
    }

    if (data.email !== undefined) {
      data.email = data.email.toLowerCase();
      if (!EMAIL_VALIDO.test(data.email)) return ctx.badRequest('E-mail inválido.');
    }

    if (data.telefone) {
      const digitos = data.telefone.replace(/\D/g, '').length;
      if (digitos !== 10 && digitos !== 11) return ctx.badRequest('Telefone inválido.');
    }

    // campos opcionais vazios viram null
    for (const campo of ['telefone', 'cidade']) {
      if (data[campo] === '') data[campo] = null;
    }

    const consulta = strapi.db.query('plugin::users-permissions.user');

    // nome de usuário e e-mail não podem ser de outra conta
    for (const campo of ['username', 'email']) {
      if (data[campo] === undefined) continue;
      const outro = await consulta.findOne({
        where: { [campo]: data[campo], id: { $ne: logado.id } },
        select: ['id'],
      });
      if (outro) return ctx.badRequest('Email or Username are already taken');
    }

    if (Object.keys(data).length) {
      await consulta.update({ where: { id: logado.id }, data });
    }

    const atual = await consulta.findOne({ where: { id: logado.id } });
    ctx.body = {
      id: atual.id,
      username: atual.username,
      email: atual.email,
      telefone: atual.telefone,
      cidade: atual.cidade,
    };
  };

  // precisa vir ANTES de PUT /users/:id, senão "me" seria lido como um id
  plugin.routes['content-api'].routes.unshift({
    method: 'PUT',
    path: '/users/me',
    handler: 'user.updateMe',
    config: { prefix: '' },
  });

  return plugin;
};
