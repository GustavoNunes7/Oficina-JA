// ============================================================
// Pizza.js — Model de Serviços Técnicos (sql.js)
// Sistema: JA Funilaria e Pintura
// ============================================================

const { ready, query, run, get } = require('../database/sqlite');

function formatarPizza(row) {
  if (!row) return null;
  return {
    _id:          row.id,
    id:           row.id,
    nome:         row.nome,         // Nome do serviço (ex: Pintura Parachoque)
    descricao:    row.descricao,    // Detalhamento estendido do processo
    ingredientes: row.ingredientes, // Reaproveitado como descrição técnica curta/insumos
    // Garante compatibilidade com o front unificando o preço base nas três chaves legadas
    precos:       JSON.parse(row.precos || '{"P":0,"M":0,"G":0}'),
    disponivel:   row.disponivel === 1,
    categoria:    row.categoria,    // funilaria, pintura, polimento, etc.
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

const Pizza = {

  async findAll() {
    await ready;
    return query('SELECT * FROM pizzas ORDER BY categoria, nome').map(formatarPizza);
  },

  async findById(id) {
    await ready;
    return formatarPizza(get('SELECT * FROM pizzas WHERE id = ?', [id]));
  },

  async create({ nome, descricao = '', ingredientes, precos = {}, disponivel = true, categoria = 'funilaria' }) {
    await ready;
    
    // Captura o preço enviado (prioriza M, caso contrário P ou G) e replica para evitar quebras de esquema
    const precoBase = precos.M || precos.P || precos.G || 0;
    const objetoPreco = { P: precoBase, M: precoBase, G: precoBase };

    const info = run(
      'INSERT INTO pizzas (nome, descricao, ingredientes, precos, disponivel, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [
        nome.trim(), 
        descricao.trim(), 
        ingredientes ? ingredientes.trim() : '', 
        JSON.stringify(objetoPreco),
        disponivel ? 1 : 0, 
        categoria
      ]
    );
    return this.findById(info.lastInsertRowid);
  },

  async update(id, { nome, descricao, ingredientes, precos, disponivel, categoria }) {
    await ready;
    const atual = get('SELECT * FROM pizzas WHERE id = ?', [id]);
    if (!atual) return null;

    const precosAtuais = JSON.parse(atual.precos || '{"P":0,"M":0,"G":0}');
    
    let precosFinal;
    if (precos) {
      // Se houver alteração de preço, replica o valor base em todas as chaves
      const novoPrecoBase = precos.M ?? precos.P ?? precos.G ?? precosAtuais.M;
      precosFinal = { P: novoPrecoBase, M: novoPrecoBase, G: novoPrecoBase };
    } else {
      precosFinal = precosAtuais;
    }

    run(`
      UPDATE pizzas SET
        nome         = ?,
        descricao    = ?,
        ingredientes = ?,
        precos       = ?,
        disponivel   = ?,
        categoria    = ?,
        updated_at   = datetime('now')
      WHERE id = ?
    `, [
      nome         ?? atual.nome,
      descricao    ?? atual.descricao,
      ingredientes ?? atual.ingredientes,
      JSON.stringify(precosFinal),
      disponivel   !== undefined ? (disponivel ? 1 : 0) : atual.disponivel,
      categoria    ?? atual.categoria,
      id
    ]);

    return this.findById(id);
  },

  async delete(id) {
    await ready;
    const info = run('DELETE FROM pizzas WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Pizza;