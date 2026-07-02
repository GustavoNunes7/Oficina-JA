const API = '/api';
let cPizzas   = []; // Armazena a lista de Serviços cadastrados (antigo cPizzas)
let cClientes = []; // Armazena a lista de Clientes
let cVeiculos = []; // NOVO: Armazena a lista de Veículos
let TOKEN          = localStorage.getItem('pz_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let mesaEmFechamento = null; // Mantido para compatibilidade estrutural interna do fluxo de encerramento

async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  erro.style.display = 'none';

  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('pz_token', TOKEN);
    localStorage.setItem('pz_usuario', JSON.stringify(data.usuario));
    
    aplicarPerfil(data.usuario);
    document.body.classList.add('logado');
  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}

function sair() {
  TOKEN = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('pz_token');
  localStorage.removeItem('pz_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

function abrir(id)  {
  document.getElementById(id).classList.add('open');
}

function fechar(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-bg').forEach(bg => 
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

// Emblemas de status unificados para Orçamentos e Ordens de Serviço (O.S.)
function badge(s) {
  const r = {
    // Status dos Orçamentos
    pendente:     '⏳ Pendente',
    aprovado:     '✔ Aprovado',
    recusado:     '❌ Recusado',
    // Status das Ordens de Serviço (O.S.)
    recebido:     '📥 Recebido',
    funilaria:    '🔨 Funilaria',
    preparacao:   '⏳ Preparação',
    pintura:      '🎨 Pintura',
    montagem:     '🔧 Montagem',
    polimento:    '✨ Polimento',
    finalizado:   '🏁 Finalizado',
    entregue:     '✅ Entregue',
    cancelado:    '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s.toUpperCase()}</span>`;
}

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + url, opts);
  const data = await res.json();

  if (res.status === 401) {
    sair();
    throw new Error('Sessão expirada');
  }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

function aplicarPerfil(usuario) {
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;
  
  const perfil  = usuario.perfil;
  const isAdmin = perfil === 'Administrador';
  const isAjudante = perfil === 'Ajudante';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }

  // Permissões do menu lateral (Sidebar)
  show('menu-usuarios', isAdmin, 'block');
  show('btn-usuarios',  isAdmin, 'flex');
  
  // Controle de restrições do perfil Ajudante (Acessa somente visualização de O.S. e status)
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    const onclickStr = btn.getAttribute('onclick') || '';
    if (isAjudante && !onclickStr.includes('ordens-servico')) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'flex';
    }
  });

  // Ajustes de textos dinâmicos do cabeçalho da tabela de Serviços (antigo Pizzas)
  const labelPizzas = document.getElementById('nav-pizzas-label');
  if (labelPizzas) labelPizzas.textContent = 'Serviços';

  const tituloPizzas = document.getElementById('pg-pizzas-titulo');
  const subPizzas    = document.getElementById('pg-pizzas-sub');
  if (tituloPizzas) tituloPizzas.textContent = 'Serviços';
  if (subPizzas)    subPizzas.textContent    = 'Gerencie a tabela de serviços da oficina';

  show('btn-nova-pizza', !isAjudante, 'inline-flex');
  show('stat-fat', !isAjudante, 'block');
  show('stat-cli', !isAjudante, 'block');

  if (isAjudante) {
    ir('ordens-servico', document.querySelector('[onclick*="ordens-servico"]'));
  } else {
    ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
  }
}

// Navegação do SPA (Single Page Application)
function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;
  
  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err');
    return;
  }
  if (perfil === 'Ajudante' && pg !== 'ordens-servico') {
    toast('Ajudantes possuem acesso exclusivo às Ordens de Serviço', 'err');
    return;
  }

  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  
  const targetSecao = document.getElementById('pg-' + pg);
  if (targetSecao) targetSecao.classList.add('ativa');
  if (btn) btn.classList.add('ativo');

  const loaders = {
    dashboard: carregarDashboard,
    pedidos:   carregarPedidos, // Mapeado para Orçamentos
    pizzas:    carregarPizzas,  // Mapeado para Serviços
    clientes:  carregarClientes,
    veiculos:  carregarVeiculos,
    'ordens-servico': carregarOrdensServico,
    financeiro: carregarFinanceiro
  };

  if (loaders[pg]) loaders[pg]();
}

async function carregarDashboard() {
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo operacional.`;

  try {
    const [servicos, clientes, orcamentos, ordens] = await Promise.all([
      api('GET', '/pizzas'), // Coleção reaproveitada de Serviços
      api('GET', '/clientes'),
      api('GET', '/pedidos'), // Coleção reaproveitada de Orçamentos
      api('GET', '/ordens')   // Suposta rota complementar de O.S.
    ]);

    cPizzas   = servicos;
    cClientes = clientes;

    document.getElementById('s-piz').textContent = servicos.length;
    document.getElementById('s-cli').textContent = clientes.length;
    document.getElementById('s-ped').textContent = orcamentos.filter(o => o.status === 'pendente').length;
    document.getElementById('s-ent').textContent = orcamentos.filter(o => ['funilaria','preparacao','pintura','montagem','polimento'].includes(o.status)).length;
    document.getElementById('s-fat').textContent = R$(orcamentos.reduce((acc, p) => acc + (p.total || 0), 0));

    const pend = orcamentos.filter(p => p.status === 'pendente').length;
    document.getElementById('s-ped-sub').textContent = `${pend} pendente(s)`;

    // Lista de O.S. Recentes / Orçamentos Recentes
    const elP = document.getElementById('dash-pedidos');
    elP.innerHTML = orcamentos.slice(0, 8).map(p => `
      <div class="mini-row">
        <div>
          <div class="mn">#${String(p.numeroPedido || '?').padStart(3,'0')} · ${p.cliente?.nome || '—'}</div>
          <div class="mc">${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
        </div>
        <div style="text-align:right">
          ${badge(p.status)}<br>
          <small style="color:var(--muted)">${R$(p.total)}</small>
        </div>
      </div>`).join('') || '<div class="empty"><span class="ei">📑</span>Nenhum registro recente</div>';

    // Lista de Serviços ativos na Oficina
    const elC = document.getElementById('dash-cardapio');
    elC.innerHTML = servicos.filter(s => s.disponivel).slice(0, 8).map(s => `
      <div class="mini-row">
        <span>🛠️ ${s.nome}</span>
        <small style="color:var(--muted)">${R$(s.precos?.M || s.precoBase)}</small>
      </div>`).join('') || '<div class="empty"><span class="ei">🛠</span>Nenhum serviço catalogado</div>';

  } catch (e) {
    toast('Erro ao carregar painel: ' + e.message, 'err');
  }
}

/* ==========================================
   GERENCIAMENTO DE SERVIÇOS (Antigo Pizzas)
   ========================================== */
async function carregarPizzas() {
  const el = document.getElementById('tbl-pizzas');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cPizzas = await api('GET', '/pizzas');
    if (!cPizzas.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🛠</span>Nenhum serviço cadastrado</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Serviço</th><th>Categoria</th><th>Descrição Curta</th><th>Preço Base</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${cPizzas.map(p => `
            <tr>
              <td><strong>${p.nome}</strong><br><small style="color:var(--muted)">${p.descricao || ''}</small></td>
              <td><span class="badge b-cat">${p.categoria || 'Funilaria'}</span></td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.ingredientes || '—'}</td>
              <td><strong style="color:var(--gold)">${R$(p.precos?.M)}</strong></td>
              <td><span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">${p.disponivel ? '✅ Ativo' : '❌ Inativo'}</span></td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarPizza('${p._id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarPizza('${p._id}','${p.nome}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirPizza() {
  document.getElementById('m-pizza-t').textContent = 'Novo Serviço';
  ['p-id','p-nome','p-ing','p-desc','p-pm'].forEach(id => {
    const field = document.getElementById(id);
    if(field) field.value = '';
  });
  document.getElementById('p-cat').value  = 'funilaria';
  document.getElementById('p-disp').value = 'true';
  abrir('m-pizza');
}

function editarPizza(id) {
  const p = cPizzas.find(x => String(x._id) === String(id));
  if (!p) return;
  document.getElementById('m-pizza-t').textContent = 'Editar Serviço';
  document.getElementById('p-id').value   = p._id;
  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-ing').value  = p.ingredientes || '';
  document.getElementById('p-desc').value = p.descricao || '';
  document.getElementById('p-pm').value   = p.precos?.M || '';
  document.getElementById('p-cat').value  = p.categoria || 'funilaria';
  document.getElementById('p-disp').value = String(p.disponivel);
  abrir('m-pizza');
}

async function salvarPizza() {
  const id   = document.getElementById('p-id').value;
  const nome = document.getElementById('p-nome').value.trim();
  const descCurta = document.getElementById('p-ing').value.trim();

  if (!nome) {
    toast('O nome do serviço é obrigatório', 'err');
    return;
  }

  const pBase = parseFloat(document.getElementById('p-pm').value) || 0;

  const d = {
    nome,
    ingredientes: descCurta, // Vinculado ao campo persistente de banco para descrição curta
    descricao:    document.getElementById('p-desc').value.trim(),
    precos: {
      P: pBase, // Unifica os tamanhos legados no mesmo valor base para blindar o back-end
      M: pBase,
      G: pBase
    },
    categoria:  document.getElementById('p-cat').value,
    disponivel: document.getElementById('p-disp').value === 'true',
  };

  try {
    id ? await api('PUT', '/pizzas/' + id, d) : await api('POST', '/pizzas', d);
    toast(id ? 'Serviço atualizado!' : 'Serviço adicionado com sucesso!');
    fechar('m-pizza');
    carregarPizzas();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

async function deletarPizza(id, nome) {
  if (!confirm(`Excluir o serviço "${nome}"?`)) return;
  try {
    await api('DELETE', '/pizzas/' + id);
    toast('Serviço removido!');
    carregarPizzas();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

/* ==========================================
   GERENCIAMENTO DE CLIENTES
   ========================================== */
async function carregarClientes(busca = '') {
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);
    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👥</span>Nenhum cliente cadastrado</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Telefone</th><th>CPF</th><th>Observações</th><th>Ações</th></tr></thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">${c.endereco?.rua || '—'}</td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" title="Editar" onclick="editarCliente('${c._id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" title="Excluir" onclick="deletarCliente('${c._id}','${c.nome}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

let _t;
function buscarCli(v) {
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-obs'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.value = '';
  });
  abrir('m-cliente');
}

function editarCliente(id) {
  const c = cClientes.find(x => String(x._id) === String(id));
  if (!c) return;
  document.getElementById('m-cli-t').textContent = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua || ''; // Mapeado para o CPF
  document.getElementById('c-num').value    = c.endereco?.numero || ''; // Mapeado para RG/CNH
  document.getElementById('c-obs').value    = c.observacoes || '';
  abrir('m-cliente');
}

async function salvarCliente() {
  const id   = document.getElementById('c-id').value;
  const nome = document.getElementById('c-nome').value.trim();
  const tel  = document.getElementById('c-tel').value.trim();
  const cpf  = document.getElementById('c-rua').value.trim();

  if (!nome || !tel || !cpf) {
    toast('Nome, Telefone e CPF são obrigatórios', 'err');
    return;
  }

  const d = {
    nome,
    telefone: tel,
    endereco: {
      rua:         cpf, // Mapeamento transparente de persistência
      numero:      document.getElementById('c-num').value.trim(),
      bairro:      'Oficina',
      cidade:      'Geral',
      cep:         '00000-000',
      complemento: ''
    },
    observacoes: document.getElementById('c-obs').value.trim(),
  };

  try {
    id ? await api('PUT', '/clientes/' + id, d) : await api('POST', '/clientes', d);
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado com sucesso!');
    fechar('m-cliente');
    carregarClientes();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

async function deletarCliente(id, nome) {
  if (!confirm(`Remover o cadastro de "${nome}"?`)) return;
  try {
    await api('DELETE', '/clientes/' + id);
    toast('Cliente deletado!');
    carregarClientes();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

/* ==========================================
   MÓDULO NOVO: CRUD DE VEÍCULOS
   ========================================== */
async function carregarVeiculos() {
  const el = document.getElementById('tbl-veiculos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cVeiculos = await api('GET', '/veiculos').catch(() => []); // Fallback de segurança se rota nativa não existir
    if (!cVeiculos.length) {
      // Mock inicial de renderização baseado nos clientes se não houver tabela dedicada em banco
      el.innerHTML = '<div class="empty"><span class="ei">🚗</span>Nenhum veículo registrado. Utilize o botão acima para cadastrar.</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Veículo</th><th>Placa</th><th>Ano / Cor</th><th>KM</th><th>Dono</th><th>Ações</th></tr></thead>
        <tbody>
          ${cVeiculos.map(v => `
            <tr>
              <td><strong>${v.marca} ${v.modelo}</strong></td>
              <td><span class="badge b-cat">${v.placa}</span></td>
              <td>${v.ano} · ${v.cor}</td>
              <td>${v.quilometragem || '0'} KM</td>
              <td>${v.clienteNome || '—'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="toast('Ação direta indisponível')">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

/* ==========================================
   GERENCIAMENTO DE ORÇAMENTOS (Antigo Pedidos)
   ========================================== */
async function carregarPedidos() {
  const el = document.getElementById('tbl-pedidos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const orcamentos = await api('GET', '/pedidos');
    if (!orcamentos.length) {
      el.innerHTML = '<div class="empty"><span class="ei">📑</span>Nenhum orçamento cadastrado</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Nº Orçamento</th><th>Cliente</th><th>Mão de Obra / Serviços</th><th>Insumos</th><th>Total</th><th>Situação</th><th>Data</th><th>Ações</th>
        </thead>
        <tbody>
          ${orcamentos.map(p => `
            <tr>
              <td><strong style="color:var(--red)">#${String(p.numeroPedido||'?').padStart(3,'0')}</strong></td>
              <td><strong>${p.cliente?.nome || '—'}</strong><br><small style="color:var(--muted)">${p.cliente?.telefone || ''}</small></td>
              <td style="font-size:.76rem">${p.itens.map(it => `• ${it.nomePizza || 'Serviço Geral'}`).join('<br>')}</td>
              <td>${R$(p.taxaEntrega)}</td> 
              <td><strong style="color:var(--gold)">${R$(p.total)}</strong></td>
              <td>${badge(p.status)}</td>
              <td style="font-size:.7rem;color:var(--muted)">${new Date(p.createdAt).toLocaleString('pt-BR')}</td>
              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-blue btn-sm" title="Mudar Status / Fase" onclick="abrirStatus('${p._id}','${p.status}')">📝</button>
                  <button class="btn btn-danger btn-sm" title="Excluir" onclick="deletarPedido('${p._id}')">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function abrirPedido() {
  try {
    if (!cPizzas.length)   cPizzas   = await api('GET', '/pizzas');
    if (!cClientes.length) cClientes = await api('GET', '/clientes');
  } catch (e) {
    toast('Erro ao carregar os dados de apoio', 'err');
    return;
  }
  
  document.getElementById('ped-cli').innerHTML = '<option value="">— Selecione o cliente —</option>' + 
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');
  
  document.getElementById('itens-lista').innerHTML = '';
  document.getElementById('ped-taxa').value  = '0';
  document.getElementById('ped-obs').value   = '';
  document.getElementById('ped-pag').value   = 'pix';
  document.getElementById('ped-sub').textContent = 'R$ 0,00';
  document.getElementById('ped-tot').textContent = 'R$ 0,00';
  document.getElementById('wrap-troco').style.display = 'none';
  
  addItem();
  abrir('m-pedido');
}

function addItem() {
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cPizzas
    .filter(s => s.disponivel)
    .map(s => `<option value="${s._id}" data-p="${s.precos?.M || 0}" data-m="${s.precos?.M || 0}" data-g="${s.precos?.M || 0}">${s.nome}</option>`).join('');
  
  d.innerHTML = `
    <select class="ip" onchange="recalc()"><option value="">Selecione o serviço...</option>${opts}</select>
    <select class="it" onchange="recalc()" style="display:none;"><option value="M" selected>Base</option></select>
    <input class="iq" type="number" value="1" min="1" oninput="recalc()" style="width:55px;">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove(); recalc()">×</button>`;
  document.getElementById('itens-lista').appendChild(d);
}

function recalc() {
  let sub = 0;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const tam = row.querySelector('.it').value.toLowerCase();
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const opt = sel.options[sel.selectedIndex];
    const pc  = parseFloat(opt?.dataset?.[tam] || 0);
    const s   = pc * qtd;
    sub += s;
    row.querySelector('.is').textContent = R$(s);
  });
  const taxa = parseFloat(document.getElementById('ped-taxa').value) || 0;
  document.getElementById('ped-sub').textContent = R$(sub);
  document.getElementById('ped-tot').textContent = R$(sub + taxa);
}

function toggleTroco() {
  const pag = document.getElementById('ped-pag').value;
  document.getElementById('wrap-troco').style.display = pag === 'dinheiro' ? 'block' : 'none';
}

async function salvarPedido() {
  const cliId = document.getElementById('ped-cli').value;
  if (!cliId) {
    toast('Selecione um cliente para vincular', 'err');
    return;
  }

  const itens = [];
  let valido = true;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) {
      valido = false;
      return;
    }
    itens.push({
      pizza:      pid, // Persistido na chave correspondente interna
      tamanho:    row.querySelector('.it').value,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) {
    toast('Insira pelo menos um serviço técnico', 'err');
    return;
  }

  const statusFluxo = document.getElementById('orc-status-fluxo').value;

  try {
    await api('POST', '/pedidos', {
      cliente:        cliId,
      itens,
      taxaEntrega:    parseFloat(document.getElementById('ped-taxa').value) || 0,
      formaPagamento: document.getElementById('ped-pag').value,
      troco:          parseFloat(document.getElementById('ped-troco')?.value) || 0,
      observacoes:    document.getElementById('ped-obs').value,
      status:         statusFluxo
    });

    if (statusFluxo === 'aprovado') {
      toast('Orçamento Aprovado! Ordem de Serviço gerada.');
    } else {
      toast('Orçamento salvo com sucesso!');
    }

    fechar('m-pedido');
    carregarPedidos();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

function abrirStatus(id, status) {
  document.getElementById('st-id').value  = id;
  document.getElementById('st-val').value = status;
  abrir('m-status');
}

async function salvarStatus() {
  const id     = document.getElementById('st-id').value;
  const status = document.getElementById('st-val').value;
  try {
    await api('PATCH', '/pedidos/' + id + '/status', { status });
    toast('Ordem de Serviço / Status atualizado!');
    fechar('m-status');
    
    // Atualiza a tela atual ativa do usuário
    const secaoAtiva = document.querySelector('.secao.ativa')?.id;
    if (secaoAtiva === 'pg-pedidos') carregarPedidos();
    else if (secaoAtiva === 'pg-ordens-servico') carregarOrdensServico();
    else carregarDashboard();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

async function deletarPedido(id) {
  if (!confirm('Remover permanentemente este registro?')) return;
  try {
    await api('DELETE', '/pedidos/' + id);
    toast('Registro excluído!');
    carregarPedidos();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

/* ==========================================
   MÓDULOS DE FLUXO EXCLUSIVOS DA OFICINA
   ========================================== */
async function carregarOrdensServico() {
  const el = document.getElementById('tbl-ordens-servico');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const ordens = await api('GET', '/pedidos');
    // Filtra para exibir apenas orçamentos aprovados/em execução que viraram O.S.
    const osAtivas = ordens.filter(o => o.status !== 'pendente' && o.status !== 'recusado');
    
    if (!osAtivas.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔧</span>Nenhuma O.S. em andamento no pátio</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr><th>O.S. Nº</th><th>Cliente</th><th>Serviços Solicitados</th><th>Fase Atual</th><th>Entrada</th><th>Ações</th></tr></thead>
        <tbody>
          ${osAtivas.map(o => `
            <tr>
              <td><strong style="color:var(--red)">#OS-${String(o.numeroPedido||'?').padStart(3,'0')}</strong></td>
              <td><strong>${o.cliente?.nome || '—'}</strong></td>
              <td>${o.itens.map(i => i.nomePizza || 'Serviço').join(', ')}</td>
              <td>${badge(o.status)}</td>
              <td style="font-size:.73rem;">${new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
              <td><button class="btn btn-blue btn-sm" onclick="abrirStatus('${o._id}','${o.status}')">Mudar Fase</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function carregarFinanceiro() {
  try {
    const dados = await api('GET', '/pedidos');
    const faturamentoTotal = dados.reduce((acc, o) => acc + (o.total || 0), 0);
    const pendentes = dados.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').reduce((acc, o) => acc + (o.total || 0), 0);
    
    document.getElementById('fin-receita').textContent = R$(faturamentoTotal);
    document.getElementById('fin-pendente').textContent = R$(pendentes);

    const el = document.getElementById('tbl-financeiro');
    el.innerHTML = `
      <table>
        <thead><tr><th>Ref</th><th>Cliente</th><th>Forma Pagamento</th><th>Valor Total</th><th>Situação</th></tr></thead>
        <tbody>
          ${dados.slice(0,15).map(o => `
            <tr>
              <td>#${o.numeroPedido}</td>
              <td>${o.cliente?.nome || '—'}</td>
              <td><span class="tag">${o.formaPagamento.toUpperCase()}</span></td>
              <td><strong>${R$(o.total)}</strong></td>
              <td>${o.status === 'entregue' ? '✅ Liquidado' : '⏳ Aguardando Liberação'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    console.log('Painel financeiro simplificado carregado.');
  }
}

/* ==========================================
   GERENCIAMENTO DE USUÁRIOS
   ========================================== */
async function carregarUsuarios() {
  const el = document.getElementById('tbl-usuarios');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const us = await api('GET', '/usuarios');
    if (!us.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👤</span>Nenhum usuário no sistema</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil de Acesso</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>
          ${us.map(u => `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${u.perfil === 'Administrador' ? 'b-admin' : 'b-atend'}">${u.perfil === 'Garcom' ? 'Ajudante' : u.perfil}</span></td>
              <td><span class="badge ${u.ativo ? 'b-on' : 'b-off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td style="font-size:.73rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome}')">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirUsuario() {
  ['u-nome','u-email','u-senha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-perfil').value = 'Ajudante';
  abrir('m-usuario');
}

async function salvarUsuario() {
  const nome  = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;

  if (!nome || !email || !senha) {
    toast('Preencha todos os campos obrigatórios', 'err');
    return;
  }

  try {
    await api('POST', '/usuarios', {
      nome,
      email,
      senha,
      perfil: document.getElementById('u-perfil').value,
    });
    toast('Novo usuário cadastrado com sucesso!');
    fechar('m-usuario');
    carregarUsuarios();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

async function deletarUsuario(id, nome) {
  if (!confirm(`Excluir conta de acesso de "${nome}"?`)) return;
  try {
    await api('DELETE', '/usuarios/' + id);
    toast('Usuário removido do sistema.');
    carregarUsuarios();
  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}