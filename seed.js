require('dotenv').config();
const { ready, run } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await ready;
    console.log('🧹 Limpando banco da oficina...');

    // Limpa os dados das tabelas mantendo a estrutura original
    run('DELETE FROM itens_pedido');
    run('DELETE FROM pedidos');
    run('DELETE FROM pizzas');
    run('DELETE FROM clientes');
    run('DELETE FROM usuarios');

    try {
      run("DELETE FROM sqlite_sequence WHERE name IN ('itens_pedido','pedidos','pizzas','clientes','usuarios')");
    } catch(_) { }

    console.log('✅ Banco limpo');

    const hash = await bcrypt.hash('123456', 10);

    // Criação dos membros da equipe da JA Funilaria e Pintura
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador Master', 'admin@jafunilaria.com', hash, 'Administrador']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Ajudante Oficial 01', 'ajudante1@jafunilaria.com', hash, 'Ajudante']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Ajudante Oficial 02', 'ajudante2@jafunilaria.com', hash, 'Ajudante']);

    console.log('✅ 3 usuários da equipe criados');

    // Clientes adaptados: o campo 'endereco' (JSON) armazena os dados do Veículo (Placa, Modelo, Cor)
    const clientes = [
      ['Lucas Ferreira Santos',   '11991234501', {rua:'ABC-1234', numero:'Civic LXR', bairro:'Preto', cidade:'Honda', cep:'2018'}, 'Parachoque dianteiro ralado'],
      ['Camila Rodrigues Lima',   '11991234502', {rua:'KXP-9080', numero:'Onix LTZ', bairro:'Branco', cidade:'Chevrolet', cep:'2020'}, 'Martelinho de ouro na porta direita'],
      ['Rafael Oliveira Costa',   '11991234503', {rua:'DRE-5512', numero:'Compass Longitude', bairro:'Cinza', cidade:'Jeep', cep:'2021'}, 'Polimento cristalizado completo'],
      ['Isabela Martins Souza',   '11991234504', {rua:'FGT-3101', numero:'HB20 Comfort', bairro:'Prata', cidade:'Hyundai', cep:'2019'}, 'Pintura do paralama esquerdo'],
      ['Bruno Almeida Pereira',   '11991234505', {rua:'HTY-0780', numero:'Corolla XEI', bairro:'Preto', cidade:'Toyota', cep:'2017'}, 'Recuperação de capô'],
      ['Juliana Nascimento Dias', '11991234506', {rua:'MJU-2204', numero:'Renegade Sport', bairro:'Vermelho', cidade:'Jeep', cep:'2022'}, ''],
      ['Thiago Carvalho Mendes',  '11991234507', {rua:'NHE-4159', numero:'Golf GTI', bairro:'Cinza', cidade:'Volkswagen', cep:'2015'}, 'Cliente exigente - Retoque de parachoque'],
      ['Fernanda Gomes Ribeiro',  '11991234508', {rua:'OIP-8832', numero:'Sandero Stepway', bairro:'Areia', cidade:'Renault', cep:'2018'}, ''],
      ['Diego Barbosa Freitas',   '11991234509', {rua:'PLM-3051', numero:'Fox Pepper', bairro:'Vermelho', cidade:'Volkswagen', cep:'2016'}, 'Troca do retrovisor esquerdo'],
      ['Larissa Teixeira Moura',  '11991234510', {rua:'QAZ-6099', numero:'Creta Prestige', bairro:'Prata', cidade:'Hyundai', cep:'2021'}, ''],
      ['Matheus Cardoso Nunes',   '11991234511', {rua:'WSX-1200', numero:'Cruze Sedan', bairro:'Branco', cidade:'Chevrolet', cep:'2019'}, ''],
      ['Patrícia Rocha Vieira',   '11991234512', {rua:'EDC-2000', numero:'Fit EXL', bairro:'Cinza', cidade:'Honda', cep:'2015'}, 'Prefere pagamento via PIX'],
      ['Anderson Silva Campos',   '11991234513', {rua:'RFV-1755', numero:'T-Cross Highline', bairro:'Bronze', cidade:'Volkswagen', cep:'2020'}, ''],
      ['Natália Araújo Castro',   '11991234514', {rua:'TGB-5302', numero:'Mobi Trekking', bairro:'Branco', cidade:'Fiat', cep:'2022'}, 'Pequeno risco na lateral posterior'],
      ['Felipe Cunha Rezende',    '11991234515', {rua:'YHN-0072', numero:'Duster Oroch', bairro:'Verde', cidade:'Renault', cep:'2017'}, ''],
      ['Vanessa Lopes Guimarães', '11991234516', {rua:'UJM-4509', numero:'Ka SE 1.0', bairro:'Vermelho', cidade:'Ford', cep:'2019'}, ''],
      ['Gustavo Pires Andrade',   '11991234517', {rua:'IKL-1800', numero:'Polo Comfortline', bairro:'Preto', cidade:'Volkswagen', cep:'2021'}, ''],
      ['Aline Moreira Fonseca',   '11991234518', {rua:'OLP-0618', numero:'Argo Drive', bairro:'Cinza', cidade:'Fiat', cep:'2020'}, 'Frotista - Lavagem simples cortesia'],
      ['Rodrigo Tavares Monteiro','11991234519', {rua:'ZAQ-0286', numero:'Tracker Premier', bairro:'Azul', cidade:'Chevrolet', cep:'2022'}, ''],
      ['Carolina Batista Pinto',  '11991234520', {rua:'XSW-1100', numero:'EcoSport Titanium', bairro:'Prata', cidade:'Ford', cep:'2018'}, 'Prepara para venda'],
    ];

    for (const [nome, tel, end, obs] of clientes) {
      run('INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
        [nome, tel, JSON.stringify(end), obs]);
    }
    console.log('✅ 20 clientes/veículos criados');

    // Catálogo de Serviços Técnicos da Oficina (O preço unificado é inserido nas 3 chaves para manter retrocompatibilidade com o front)
    const servicos = [
      ['Pintura de Peça Inteira', 'Aplicação de primer, tinta automotiva basecoat e verniz alto sólidos', 'Mão de obra e insumos inclusos', {P:450, M:450, G:450}, 'pintura'],
      ['Retoque Localizado', 'Pintura restrita à área afetada com técnica de alongamento', 'Insumos de pintura', {P:300, M:300, G:300}, 'pintura'],
      ['Pintura de Parachoque', 'Remoção de riscos profundos e pintura completa da peça plástica', 'Promotor de aderência e tinta', {P:400, M:400, G:400}, 'pintura'],
      ['Funilaria de Parachoque', 'Recuperação e alinhamento de travas e deformações plásticas', 'Mão de obra de funilaria', {P:250, M:250, G:250}, 'funilaria'],
      ['Funilaria de Porta Lateral', 'Reparação de amassados e rebatimento de chapa automotiva', 'Mão de obra estrutural', {P:350, M:350, G:350}, 'funilaria'],
      ['Martelinho de Ouro (Por Amassado)', 'Técnica de desamassamento artesanal sem danificar a pintura original', 'Serviço artesanal', {P:150, M:150, G:150}, 'funilaria'],
      ['Funilaria de Capô / Teto', 'Recuperação de grandes áreas amassadas ou afetadas por granizo', 'Mão de obra pesada', {P:600, M:600, G:600}, 'funilaria'],
      ['Polimento Comercial', 'Eliminação de riscos superficiais e realce do brilho do verniz', 'Massa de polir e ceras protetoras', {P:250, M:250, G:250}, 'polimento'],
      ['Polimento Técnico Cristalizado', 'Correção detalhada de pintura com aplicação de selante acrílico protetor', 'Compostos importados e selante', {P:450, M:450, G:450}, 'polimento'],
      ['Vitrificação de Pintura', 'Aplicação de revestimento cerâmico de alta durabilidade (Proteção 9H)', 'Vitrificador cerâmico e panos de microfibra', {P:900, M:900, G:900}, 'polimento'],
      ['Revitalização de Faróis (Par)', 'Lixamento e aplicação de verniz ou polimento nas lentes amareladas', 'Lixas d\'água e massa de polir', {P:120, M:120, G:120}, 'polimento'],
      ['Higienização Interna Completa', 'Limpeza profunda de bancos, carpetes, teto e painel com extratora', 'Shampoo antibactericida', {P:300, M:300, G:300}, 'estetica'],
      ['Pintura de Roda (Unidade)', 'Reparação de ralados de guia e repintura da roda de liga leve', 'Tinta prata/grafite e verniz', {P:180, M:180, G:180}, 'pintura'],
      ['Alinhamento de Frente (Painel Frontal)', 'Cunhas e esticadores para alinhamento do painel e fixação de faróis', 'Mão de obra estrutural', {P:400, M:400, G:400}, 'funilaria'],
      ['Solda Plástica / Recuperação', 'Soldagem de suportes internos de faróis e grades quebras', 'Eletrodos plásticos e telas', {P:100, M:100, G:100}, 'funilaria'],
      ['Substituição de Peça Externa', 'Instalação e alinhamento de capô, porta ou paralama novo vindo do fornecedor', 'Mão de obra de montagem', {P:200, M:200, G:200}, 'funilaria'],
      ['Remoção de Emblemas e Cola', 'Retirada de colas de insulfilm ou emblemas antigos sem marcar o verniz', 'Removedores cítricos', {P:80, M:80, G:80}, 'estetica'],
      ['Retoque de Risco com Pincel', 'Preenchimento milimétrico com tinta original para proteção contra ferrugem', 'Tinta original da cor do veículo', {P:50, M:50, G:50}, 'pintura'],
      ['Checklist e Desmontagem Técnica', 'Desmontagem de forros de porta e maçanetas para pintura limpa', 'Mão de obra interna', {P:150, M:150, G:150}, 'funilaria'],
      ['Lavagem Técnica Detalhada + Cera', 'Lavagem de pátio com limpeza de caixas de roda e aplicação de cera rápida', 'Shampoo neutro e cera líquida', {P:90, M:90, G:90}, 'estetica'],
    ];

    for (const [nome, desc, ing, precos, cat] of servicos) {
      run('INSERT INTO pizzas (nome, descricao, ingredientes, precos, categoria) VALUES (?, ?, ?, ?, ?)',
        [nome, desc, ing, JSON.stringify(precos), cat]);
    }
    console.log('✅ 20 serviços criados no catálogo');

    console.log('======================================');
    console.log('🔥 SEED OPERACIONAL EXECUTADO COM SUCESSO!');
    console.log('======================================');
    console.log('Login: admin@jafunilaria.com | Senha: 123456');
    console.log('======================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO NO SEED:', err);
    process.exit(1);
  }
}

seed();