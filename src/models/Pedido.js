// ============================================================
// Pedido.js — Model de Orçamentos e Ordens de Serviço (sql.js)
// Sistema: JA Funilaria e Pintura
// ============================================================

const { ready, query, run, get } = require('../database/sqlite');

const SELECT_PEDIDO = `
  SELECT
    p.*,
    c.nome     AS cliente_nome,
    c.telefone AS cliente_telefone
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id
`;

function formatarPedido(row, itens = []) {
  if (!row) return null;
  return {
    _id:           row.id,
    id:            row.id,
    numeroPedido:  row.numero_pedido, // Mapeia o número do Orçamento ou O.S.
    cliente: {
      _id:      row.cliente_id,
      id:       row.cliente_id,
      nome:     row.cliente_nome,
      telefone: row.cliente_telefone,
    },
    itens: itens.map(it => ({
      _id:           it.id,
      pizza:         it.pizza_id,       // ID do serviço técnico no catálogo
      nomePizza:     it.nome_pizza,     // Nome descritivo do serviço prestado
      tamanho:       it.tamanho,        // Mantido 'M' por retrocompatibilidade estrutural
      quantidade:    it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal:      it.subtotal,
    })),
    subtotal:       row.subtotal,        // Mão de obra bruta
    taxaEntrega:    row.taxa_entrega,    // Reaproveitado para Custo de Insumos / Peças
    total:          row.total,           // Valor global consolidado
    formaPagamento: row.forma_pagamento,
    troco:          row.troco,
    status:         row.status,          // Fases: pendente, aprovado, funilaria, pintura, polimento, entregue...
    observacoes:    row.observacoes,     // Detalhes de avarias / prazos
    mesa:           row.mesa,            // Identificador do veículo / vaga no pátio
    origem:         row.origem,          // Origem do atendimento ('oficina')
    garcom:         row.garcom_id,       // Técnico/Ajudante alocado na execução
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

const Pedido = {

  async findAll({ garcomId } = {}) {
    await ready;
    let rows;
    if (garcomId) {
      // Lista as O.S. vinculadas a um Ajudante/Técnico específico
      rows = query(`${SELECT_PEDIDO} WHERE p.garcom_id = ? ORDER BY p.created_at DESC`, [garcomId]);
    } else {
      rows = query(`${SELECT_PEDIDO} ORDER BY p.created_at DESC`);
    }
    return rows.map(row => {
      const itens = query('SELECT * FROM itens_pedido WHERE pedido_id = ?', [row.id]);
      return formatarPedido(row, itens);
    });
  },

  async findById(id) {
    await ready;
    const row = get(`${SELECT_PEDIDO} WHERE p.id = ?`, [id]);
    if (!row) return null;
    const itens = query('SELECT * FROM itens_pedido WHERE pedido_id = ?', [id]);
    return formatarPedido(row, itens);
  },

  async create({ clienteId, itens, taxaEntrega = 0, formaPagamento, troco = 0, observacoes = '', mesa = null, origem = 'oficina', garcomId = null, status = 'pendente' }) {
    await ready;

    // Carrega o model correspondente de Serviços (Atrelado ao arquivo Pizza.js para manter as rotas)
    const Pizza = require('./Pizza');
    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const pizza = await Pizza.findById(item.pizza);
      if (!pizza) throw new Error(`Serviço ID ${item.pizza} não localizado no catálogo`);

      // Extrai o preço do serviço técnico (garantindo fallback no valor unificado 'M')
      const preco   = pizza.precos[item.tamanho] || pizza.precos['M'] || 0;
      const subItem = preco * item.quantidade;
      subtotal     += subItem;

      itensProcessados.push({
        pizzaId:       pizza.id,
        nomePizza:     pizza.nome,
        tamanho:       item.tamanho,
        quantidade:    item.quantidade,
        precoUnitario: preco,
        subtotal:      subItem,
      });
    }

    // Soma o custo dos serviços com a taxa estendida de insumos/peças adicionais
    const total        = subtotal + (taxaEntrega || 0);
    const contagem     = get('SELECT COUNT(*) as total FROM pedidos');
    const numeroPedido = (contagem?.total || 0) + 1;

    const infoPedido = run(`
      INSERT INTO pedidos
        (numero_pedido, cliente_id, subtotal, taxa_entrega, total,
         forma_pagamento, troco, status, observacoes, mesa, origem, garcom_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numeroPedido, clienteId, subtotal, taxaEntrega || 0, total,
        formaPagamento, troco || 0, status, observacoes, mesa, origem, garcomId]);

    const pedidoId = infoPedido.lastInsertRowid;

    for (const it of itensProcessados) {
      run(`
        INSERT INTO itens_pedido
          (pedido_id, pizza_id, nome_pizza, tamanho, quantidade, preco_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [pedidoId, it.pizzaId, it.nomePizza, it.tamanho, it.quantidade, it.precoUnitario, it.subtotal]);
    }

    return this.findById(pedidoId);
  },

  async updateStatus(id, status) {
    await ready;
    const info = run(
      "UPDATE pedidos SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  async delete(id) {
    await ready;
    // Remove os itens vinculados ao orçamento primeiro (Simula restrição de integridade referencial)
    run('DELETE FROM itens_pedido WHERE pedido_id = ?', [id]);
    const info = run('DELETE FROM pedidos WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Pedido;