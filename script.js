class SistemaEstoque {
    constructor() {
        this.produtos = JSON.parse(localStorage.getItem('produtos')) || {};
        this.produtosCadastrados = JSON.parse(localStorage.getItem('produtosCadastrados')) || {};
        this.historico = JSON.parse(localStorage.getItem('historico')) || [];
        this.logAtividades = JSON.parse(localStorage.getItem('logAtividades')) || [];
        this.usuarios = JSON.parse(localStorage.getItem('usuarios')) || this.criarUsuariosPadrao();
        this.usuarioAtual = localStorage.getItem('usuarioAtual') || null;
        this.usuarioLogado = localStorage.getItem('usuarioLogado') === 'true';
        this.temaEscuro = localStorage.getItem('temaEscuro') === 'true';
        this.aprovacoes = JSON.parse(localStorage.getItem('aprovacoes')) || [];
        this.aprovacaoAtual = null;
        this.inicializar();
    }

    criarUsuariosPadrao() {
        const usuariosPadrao = {
            'admin': { 
                nome: 'Administrador', 
                senha: this.hashPassword('almoxarifado'), 
                permissoes: { 
                    entrada: true, 
                    saida: true, 
                    estoque: true, 
                    relatorios: true, 
                    usuarios: true, 
                    cadastrarProduto: true 
                },
                perfil: {
                    email: '',
                    telefone: '',
                    cargo: 'Administrador do Sistema',
                    departamento: 'TI',
                    dataNascimento: '',
                    foto: null
                }
            },
            'operacao': { 
                nome: 'Operador', 
                senha: this.hashPassword('123'), 
                permissoes: { 
                    entrada: false, 
                    saida: false, 
                    estoque: true, 
                    relatorios: false, 
                    usuarios: false, 
                    cadastrarProduto: false 
                },
                perfil: {
                    email: '',
                    telefone: '',
                    cargo: 'Operador de Estoque',
                    departamento: 'Almoxarifado',
                    dataNascimento: '',
                    foto: null
                }
            }
        };
        localStorage.setItem('usuarios', JSON.stringify(usuariosPadrao));
        return usuariosPadrao;
    }

    hashPassword(senha) {
        return btoa(senha);
    }

    verificarPassword(senhaHash, senha) {
        return senhaHash === btoa(senha);
    }

    inicializar() {
        this.aplicarTema();
        this.configurarEventListeners();
        this.atualizarHorario();
        
        if (this.usuarioLogado && this.usuarioAtual) {
            this.mostrarSistema();
        } else {
            this.mostrarTelaLogin();
        }
    }

    configurarEventListeners() {
        // Login
        document.getElementById('form-login').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => {
            this.logout();
        });

        // Navegação
        document.getElementById('btn-dashboard').addEventListener('click', () => this.mostrarSecao('dashboard'));
        document.getElementById('btn-produtos').addEventListener('click', () => this.mostrarSecao('produtos'));
        document.getElementById('btn-entrada').addEventListener('click', () => this.mostrarSecao('entrada'));
        document.getElementById('btn-saida').addEventListener('click', () => this.mostrarSecao('saida'));
        document.getElementById('btn-estoque').addEventListener('click', () => this.mostrarSecao('estoque'));
        document.getElementById('btn-relatorios').addEventListener('click', () => this.mostrarSecao('relatorios'));
        document.getElementById('btn-usuarios').addEventListener('click', () => this.mostrarSecao('usuarios'));
        document.getElementById('btn-aprovacoes').addEventListener('click', () => this.mostrarSecao('aprovacoes'));
        document.getElementById('btn-perfil').addEventListener('click', () => this.mostrarSecao('perfil'));

        // Tema
        document.getElementById('btn-alternar-tema').addEventListener('click', () => {
            this.alternarTema();
        });

        // Formulários
        document.getElementById('form-cadastro-produto').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarProduto();
        });

        document.getElementById('form-entrada').addEventListener('submit', (e) => {
            e.preventDefault();
            this.entradaProduto();
        });

        document.getElementById('form-saida').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saidaProduto();
        });

        document.getElementById('form-usuario').addEventListener('submit', (e) => {
            e.preventDefault();
            this.criarUsuario();
        });

        // Perfil
        document.getElementById('form-perfil').addEventListener('submit', (e) => {
            e.preventDefault();
            this.atualizarPerfil();
        });

        document.getElementById('form-alterar-senha').addEventListener('submit', (e) => {
            e.preventDefault();
            this.alterarSenha();
        });

        document.getElementById('btn-trocar-foto').addEventListener('click', () => {
            document.getElementById('upload-foto').click();
        });

        document.getElementById('upload-foto').addEventListener('change', (e) => {
            this.processarUploadFoto(e);
        });

        document.getElementById('btn-remover-foto').addEventListener('click', () => {
            this.removerFoto();
        });

        // Aprovações - usar try/catch para evitar erros se os elementos não existirem
        try {
            document.getElementById('btn-aplicar-filtro')?.addEventListener('click', () => {
                this.filtrarAprovacoes();
            });

            // Modal de aprovação
            document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
                this.fecharModalAprovacao();
            });

            document.getElementById('btn-cancelar-modal')?.addEventListener('click', () => {
                this.fecharModalAprovacao();
            });

            document.getElementById('btn-aprovar')?.addEventListener('click', () => {
                console.log('Botão aprovar clicado');
                this.processarAprovacao('aprovado');
            });

            document.getElementById('btn-aprovar-modificacao')?.addEventListener('click', () => {
                console.log('Botão aprovar modificação clicado');
                this.processarAprovacao('aprovado_com_modificacao');
            });

            document.getElementById('btn-rejeitar')?.addEventListener('click', () => {
                console.log('Botão rejeitar clicado');
                this.processarAprovacao('rejeitado');
            });
        } catch (error) {
            console.warn('Erro ao configurar event listeners de aprovação:', error);
        }
    }

    // Função para excluir usuário
    excluirUsuario(username) {
        if (username === 'admin') {
            this.mostrarNotificacao('Não é possível excluir o usuário administrador', 'error');
            return;
        }

        if (username === this.usuarioAtual) {
            this.mostrarNotificacao('Não é possível excluir seu próprio usuário', 'error');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o usuário "${this.usuarios[username].nome}"?`)) {
            delete this.usuarios[username];
            this.salvarDados();
            this.atualizarTabelaUsuarios();
            this.mostrarNotificacao('Usuário excluído com sucesso!', 'success');
        }
    }

    login() {
        const username = document.getElementById('usuario').value;
        const password = document.getElementById('senha').value;
        const usuario = this.usuarios[username];

        if (usuario && this.verificarPassword(usuario.senha, password)) {
            this.usuarioAtual = username;
            this.usuarioLogado = true;
            localStorage.setItem('usuarioAtual', username);
            localStorage.setItem('usuarioLogado', 'true');
            this.mostrarNotificacao(`Bem-vindo, ${usuario.nome}!`, 'success');
            this.mostrarSistema();
            document.getElementById('form-login').reset();
        } else {
            this.mostrarNotificacao('Usuário ou senha inválidos', 'error');
        }
    }

    logout() {
        this.usuarioLogado = false;
        this.usuarioAtual = null;
        localStorage.removeItem('usuarioAtual');
        localStorage.setItem('usuarioLogado', 'false');
        this.mostrarTelaLogin();
        this.mostrarNotificacao('Você foi desconectado.', 'info');
    }

    mostrarTelaLogin() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('sistema-principal').style.display = 'none';
    }

    mostrarSistema() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('sistema-principal').style.display = 'flex';
        this.atualizarInfoUsuario();
        this.atualizarDashboard();
        this.atualizarSelectsProdutos();
        this.atualizarTabelaProdutos();
        this.atualizarTabelaEstoque();
        this.atualizarTabelaUsuarios();
        this.verificarPermissoes();
        this.carregarPerfil();
        this.atualizarContadorAprovacoes();
    }

    mostrarSecao(secao) {
        // Remover classe active de todos os botões e seções
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('section').forEach(section => section.classList.remove('active'));

        // Adicionar classe active ao botão e seção correspondentes
        document.getElementById(`btn-${secao}`).classList.add('active');
        document.getElementById(secao).classList.add('active');

        // Atualizar dados específicos da seção
        if (secao === 'dashboard') {
            this.atualizarDashboard();
        } else if (secao === 'estoque') {
            this.atualizarTabelaEstoque();
        } else if (secao === 'entrada' || secao === 'saida') {
            this.atualizarSelectsProdutos();
        } else if (secao === 'perfil') {
            this.carregarPerfil();
        } else if (secao === 'aprovacoes') {
            this.carregarAprovacoes();
        }
    }

    verificarPermissoes() {
        const usuario = this.usuarios[this.usuarioAtual];
        if (!usuario) return;

        const permissoes = usuario.permissoes;

        // Controlar visibilidade dos botões de navegação
        document.getElementById('btn-entrada').style.display = permissoes.entrada ? 'flex' : 'none';
        document.getElementById('btn-saida').style.display = permissoes.saida ? 'flex' : 'none';
        document.getElementById('btn-estoque').style.display = permissoes.estoque ? 'flex' : 'none';
        document.getElementById('btn-relatorios').style.display = permissoes.relatorios ? 'flex' : 'none';
        document.getElementById('btn-usuarios').style.display = permissoes.usuarios ? 'flex' : 'none';
        document.getElementById('btn-produtos').style.display = permissoes.cadastrarProduto ? 'flex' : 'none';
        
        // Controlar visibilidade de aprovações
        const isAdmin = this.usuarioAtual === 'admin';
        document.getElementById('btn-aprovacoes').style.display = isAdmin ? 'flex' : 'none';
    }

    cadastrarProduto() {
        const nome = document.getElementById('nome-produto').value;
        const codigo = document.getElementById('codigo-produto').value || `AUTO-${Date.now()}`;
        const categoria = document.getElementById('categoria-produto').value;
        const estoqueMinimo = parseInt(document.getElementById('estoque-minimo').value);
        const valorUnitario = parseFloat(document.getElementById('valor-unitario').value) || 0;

        if (!nome || !categoria) {
            this.mostrarNotificacao('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Verificar se já existe produto com mesmo nome
        if (this.produtosCadastrados[nome]) {
            this.mostrarNotificacao('Já existe um produto com este nome', 'error');
            return;
        }

        // Verificar se precisa de aprovação (valor acima de R$ 2.000)
        if (valorUnitario > 2000) {
            this.criarSolicitacaoAprovacao({
                tipo: 'produto',
                usuario: this.usuarioAtual,
                descricao: `Cadastro de produto: ${nome}`,
                dados: {
                    nome,
                    codigo,
                    categoria,
                    estoqueMinimo,
                    valorUnitario
                },
                valorTotal: valorUnitario
            });
            this.mostrarNotificacao('Produto enviado para aprovação devido ao valor alto (acima de R$ 2.000)', 'info');
            document.getElementById('form-cadastro-produto').reset();
            return;
        }

        this.produtosCadastrados[nome] = {
            codigo,
            categoria,
            estoqueMinimo,
            valorUnitario,
            dataCadastro: new Date().toLocaleDateString()
        };

        // Inicializar estoque com zero
        this.produtos[nome] = 0;

        this.salvarDados();
        this.mostrarNotificacao('Produto cadastrado com sucesso!', 'success');
        this.atualizarTabelaProdutos();
        this.atualizarSelectsProdutos();
        this.atualizarDashboard();
        document.getElementById('form-cadastro-produto').reset();
    }

    entradaProduto() {
        const produto = document.getElementById('produto-entrada').value;
        const quantidade = parseInt(document.getElementById('quantidade-entrada').value);

        if (!produto || !quantidade || quantidade <= 0) {
            this.mostrarNotificacao('Selecione um produto e quantidade válida', 'error');
            return;
        }

        this.produtos[produto] = (this.produtos[produto] || 0) + quantidade;

        // Registrar no histórico
        this.historico.unshift({
            data: new Date().toLocaleDateString(),
            produto,
            quantidade: `+${quantidade}`,
            usuario: this.usuarios[this.usuarioAtual].nome,
            tipo: 'entrada'
        });

        this.salvarDados();
        this.mostrarNotificacao(`${quantidade} unidades de ${produto} adicionadas ao estoque`, 'success');
        this.atualizarDashboard();
        this.atualizarTabelaEstoque();
        document.getElementById('form-entrada').reset();
    }

    saidaProduto() {
        const produto = document.getElementById('produto-saida').value;
        const quantidade = parseInt(document.getElementById('quantidade-saida').value);

        if (!produto || !quantidade || quantidade <= 0) {
            this.mostrarNotificacao('Selecione um produto e quantidade válida', 'error');
            return;
        }

        const estoqueAtual = this.produtos[produto] || 0;
        if (quantidade > estoqueAtual) {
            this.mostrarNotificacao('Quantidade solicitada maior que o estoque disponível', 'error');
            return;
        }

        this.produtos[produto] = estoqueAtual - quantidade;

        // Registrar no histórico
        this.historico.unshift({
            data: new Date().toLocaleDateString(),
            produto,
            quantidade: `-${quantidade}`,
            usuario: this.usuarios[this.usuarioAtual].nome,
            tipo: 'saida'
        });

        this.salvarDados();
        this.mostrarNotificacao(`${quantidade} unidades de ${produto} retiradas do estoque`, 'success');
        this.atualizarDashboard();
        this.atualizarTabelaEstoque();
        document.getElementById('form-saida').reset();
    }

    criarUsuario() {
        const username = document.getElementById('username-usuario').value;
        const nome = document.getElementById('nome-usuario').value;
        const senha = document.getElementById('password-usuario').value;
        const permissoesText = document.getElementById('permissoes-usuario').value;

        if (!username || !nome || !senha) {
            this.mostrarNotificacao('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (this.usuarios[username]) {
            this.mostrarNotificacao('Usuário já existe', 'error');
            return;
        }

        // Processar permissões
        const permissoesArray = permissoesText.split(',').map(p => p.trim());
        const permissoes = {
            entrada: permissoesArray.includes('entrada'),
            saida: permissoesArray.includes('saida'),
            estoque: permissoesArray.includes('estoque'),
            relatorios: permissoesArray.includes('relatorios'),
            usuarios: permissoesArray.includes('usuarios'),
            cadastrarProduto: permissoesArray.includes('produtos')
        };

        this.usuarios[username] = {
            nome,
            senha: this.hashPassword(senha),
            permissoes,
            perfil: {
                email: '',
                telefone: '',
                cargo: '',
                departamento: '',
                dataNascimento: '',
                foto: null
            }
        };

        this.salvarDados();
        this.mostrarNotificacao('Usuário criado com sucesso!', 'success');
        this.atualizarTabelaUsuarios();
        document.getElementById('form-usuario').reset();
    }

    editarEstoqueMinimo(nomeProduto) {
        const produto = this.produtosCadastrados[nomeProduto];
        const novoEstoqueMinimo = prompt(`Digite o novo estoque mínimo para "${nomeProduto}":`, produto.estoqueMinimo);
        
        if (novoEstoqueMinimo !== null) {
            const valor = parseInt(novoEstoqueMinimo);
            if (isNaN(valor) || valor < 0) {
                this.mostrarNotificacao('Por favor, digite um número válido maior ou igual a zero', 'error');
                return;
            }
            
            this.produtosCadastrados[nomeProduto].estoqueMinimo = valor;
            this.salvarDados();
            this.mostrarNotificacao(`Estoque mínimo de "${nomeProduto}" atualizado para ${valor}`, 'success');
            this.atualizarTabelaProdutos();
            this.atualizarTabelaEstoque();
            this.atualizarDashboard();
        }
    }

    excluirProduto(nome) {
        if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
            delete this.produtosCadastrados[nome];
            delete this.produtos[nome];
            this.salvarDados();
            this.mostrarNotificacao('Produto excluído com sucesso!', 'success');
            this.atualizarTabelaProdutos();
            this.atualizarSelectsProdutos();
            this.atualizarDashboard();
        }
    }

    excluirUsuario(username) {
        if (username === 'admin') {
            this.mostrarNotificacao('Não é possível excluir o usuário administrador', 'error');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
            delete this.usuarios[username];
            this.salvarDados();
            this.mostrarNotificacao('Usuário excluído com sucesso!', 'success');
            this.atualizarTabelaUsuarios();
        }
    }

    atualizarInfoUsuario() {
        const usuario = this.usuarios[this.usuarioAtual];
        document.getElementById('info-usuario').textContent = usuario ? usuario.nome : 'Não conectado';
    }

    atualizarHorario() {
        const agora = new Date();
        const horario = agora.toLocaleTimeString();
        document.getElementById('horario-atual').textContent = horario;
        setTimeout(() => this.atualizarHorario(), 1000);
    }

    atualizarDashboard() {
        const totalProdutos = Object.keys(this.produtosCadastrados).length;
        const totalItens = Object.values(this.produtos).reduce((sum, qty) => sum + qty, 0);
        
        let estoqueBaixo = 0;
        Object.keys(this.produtosCadastrados).forEach(nome => {
            const produto = this.produtosCadastrados[nome];
            const quantidade = this.produtos[nome] || 0;
            if (quantidade <= produto.estoqueMinimo) {
                estoqueBaixo++;
            }
        });

        document.getElementById('total-produtos').textContent = totalProdutos;
        document.getElementById('total-itens').textContent = totalItens;
        document.getElementById('estoque-baixo').textContent = estoqueBaixo;

        // Mostrar alerta se houver estoque baixo
        const alertaEstoque = document.getElementById('alerta-estoque-baixo');
        if (estoqueBaixo > 0) {
            alertaEstoque.style.display = 'block';
        } else {
            alertaEstoque.style.display = 'none';
        }

        // Atualizar tabela de histórico
        this.atualizarTabelaHistorico();
    }

    atualizarTabelaHistorico() {
        const tbody = document.querySelector('#tabela-historico tbody');
        tbody.innerHTML = '';

        this.historico.slice(0, 10).forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.data}</td>
                <td>${item.produto}</td>
                <td class="${item.tipo === 'entrada' ? 'text-success' : 'text-danger'}">${item.quantidade}</td>
                <td>${item.usuario}</td>
            `;
        });
    }

    atualizarSelectsProdutos() {
        const selectEntrada = document.getElementById('produto-entrada');
        const selectSaida = document.getElementById('produto-saida');

        // Limpar selects
        selectEntrada.innerHTML = '<option value="">Selecione um produto cadastrado</option>';
        selectSaida.innerHTML = '<option value="">Selecione um produto cadastrado</option>';

        // Adicionar produtos
        Object.keys(this.produtosCadastrados).forEach(nome => {
            const option1 = new Option(nome, nome);
            const option2 = new Option(nome, nome);
            selectEntrada.add(option1);
            selectSaida.add(option2);
        });
    }

    atualizarTabelaProdutos() {
        const tbody = document.querySelector('#tabela-produtos-cadastrados tbody');
        tbody.innerHTML = '';

        Object.keys(this.produtosCadastrados).forEach(nome => {
            const produto = this.produtosCadastrados[nome];
            const row = tbody.insertRow();
            const isAdmin = this.usuarioAtual === 'admin';
            const valorFormatado = produto.valorUnitario ? `R$ ${produto.valorUnitario.toFixed(2)}` : 'R$ 0,00';
            
            row.innerHTML = `
                <td>${nome}</td>
                <td>${produto.codigo}</td>
                <td><span class="categoria-${produto.categoria.toLowerCase()}">${produto.categoria}</span></td>
                <td id="estoque-min-${nome.replace(/\s+/g, '-')}">${produto.estoqueMinimo}</td>
                <td>${valorFormatado}</td>
                <td>
                    ${isAdmin ? `<button class="btn-editar" onclick="sistema.editarEstoqueMinimo('${nome}')">✏️</button>` : ''}
                    <button class="btn-excluir" onclick="sistema.excluirProduto('${nome}')">🗑️</button>
                </td>
            `;
        });
    }

    atualizarTabelaEstoque() {
        const tbody = document.querySelector('#tabela-estoque tbody');
        tbody.innerHTML = '';

        Object.keys(this.produtosCadastrados).forEach(nome => {
            const produto = this.produtosCadastrados[nome];
            const quantidade = this.produtos[nome] || 0;
            const status = quantidade <= produto.estoqueMinimo ? 'Estoque Baixo' : 'Normal';
            const statusClass = quantidade <= produto.estoqueMinimo ? 'text-danger' : 'text-success';
            
            const row = tbody.insertRow();
            if (quantidade <= produto.estoqueMinimo) {
                row.classList.add('estoque-baixo');
            }
            
            row.innerHTML = `
                <td>${nome}</td>
                <td>${produto.codigo}</td>
                <td><span class="categoria-${produto.categoria.toLowerCase()}">${produto.categoria}</span></td>
                <td>${quantidade}</td>
                <td>${produto.estoqueMinimo}</td>
                <td class="${statusClass}">${status}</td>
            `;
        });
    }

    atualizarTabelaUsuarios() {
        const tbody = document.querySelector('#tabela-usuarios tbody');
        tbody.innerHTML = '';

        Object.keys(this.usuarios).forEach(username => {
            const usuario = this.usuarios[username];
            const permissoes = usuario.permissoes;
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${usuario.nome}</td>
                <td>${username}</td>
                <td>${permissoes.entrada ? '✅' : '❌'}</td>
                <td>${permissoes.saida ? '✅' : '❌'}</td>
                <td>${permissoes.estoque ? '✅' : '❌'}</td>
                <td>${permissoes.relatorios ? '✅' : '❌'}</td>
                <td>${permissoes.usuarios ? '✅' : '❌'}</td>
                <td>${permissoes.cadastrarProduto ? '✅' : '❌'}</td>
                <td>
                    ${username !== 'admin' ? `<button class="btn-excluir" onclick="sistema.excluirUsuario('${username}')">🗑️</button>` : ''}
                </td>
            `;
        });
    }

    alternarTema() {
        this.temaEscuro = !this.temaEscuro;
        this.aplicarTema();
        localStorage.setItem('temaEscuro', this.temaEscuro);
    }

    aplicarTema() {
        const body = document.body;
        const btnTema = document.getElementById('btn-alternar-tema');
        
        if (this.temaEscuro) {
            body.classList.add('dark-mode');
            btnTema.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            btnTema.textContent = '🌙';
        }
    }

    mostrarNotificacao(mensagem, tipo) {
        const notificacao = document.getElementById('notificacao');
        notificacao.textContent = mensagem;
        notificacao.className = `notificacao ${tipo}`;
        notificacao.style.display = 'block';

        setTimeout(() => {
            notificacao.style.display = 'none';
        }, 3000);
    }

    exportarCSV() {
        const dados = [];
        dados.push(['Produto', 'Código', 'Categoria', 'Quantidade', 'Estoque Mínimo', 'Status']);

        Object.keys(this.produtosCadastrados).forEach(nome => {
            const produto = this.produtosCadastrados[nome];
            const quantidade = this.produtos[nome] || 0;
            const status = quantidade <= produto.estoqueMinimo ? 'Estoque Baixo' : 'Normal';
            dados.push([nome, produto.codigo, produto.categoria, quantidade, produto.estoqueMinimo, status]);
        });

        let csvContent = dados.map(linha => linha.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `estoque_${new Date().toLocaleDateString().replace(/\//g, '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.mostrarNotificacao('Relatório CSV exportado com sucesso!', 'success');
    }

    fazerBackup() {
        const backup = {
            produtos: this.produtos,
            produtosCadastrados: this.produtosCadastrados,
            historico: this.historico,
            usuarios: this.usuarios,
            dataBackup: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `backup_almoxarifado_${new Date().toLocaleDateString().replace(/\//g, '_')}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.mostrarNotificacao('Backup realizado com sucesso!', 'success');
    }

    carregarPerfil() {
        const usuario = this.usuarios[this.usuarioAtual];
        if (!usuario) return;

        // Garantir que o perfil existe
        if (!usuario.perfil) {
            usuario.perfil = {
                email: '',
                telefone: '',
                cargo: '',
                departamento: '',
                dataNascimento: '',
                foto: null
            };
        }

        // Preencher formulário de perfil
        document.getElementById('perfil-nome').value = usuario.nome || '';
        document.getElementById('perfil-email').value = usuario.perfil.email || '';
        document.getElementById('perfil-telefone').value = usuario.perfil.telefone || '';
        document.getElementById('perfil-cargo').value = usuario.perfil.cargo || '';
        document.getElementById('perfil-departamento').value = usuario.perfil.departamento || '';
        document.getElementById('perfil-data-nascimento').value = usuario.perfil.dataNascimento || '';

        // Atualizar foto de perfil
        this.atualizarFotoPerfil();
    }

    atualizarPerfil() {
        const usuario = this.usuarios[this.usuarioAtual];
        if (!usuario) return;

        const novosDados = {
            nome: document.getElementById('perfil-nome').value,
            email: document.getElementById('perfil-email').value,
            telefone: document.getElementById('perfil-telefone').value,
            cargo: document.getElementById('perfil-cargo').value,
            departamento: document.getElementById('perfil-departamento').value,
            dataNascimento: document.getElementById('perfil-data-nascimento').value
        };

        // Se não for admin, criar solicitação de aprovação
        if (this.usuarioAtual !== 'admin') {
            this.criarSolicitacaoAprovacao({
                tipo: 'perfil',
                usuario: this.usuarioAtual,
                descricao: 'Alteração de dados pessoais',
                dados: {
                    dadosAtuais: {
                        nome: usuario.nome,
                        email: usuario.perfil.email || '',
                        telefone: usuario.perfil.telefone || '',
                        cargo: usuario.perfil.cargo || '',
                        departamento: usuario.perfil.departamento || '',
                        dataNascimento: usuario.perfil.dataNascimento || ''
                    },
                    novosDados
                },
                valorTotal: 0
            });
            this.mostrarNotificacao('Alterações enviadas para aprovação do administrador', 'info');
            return;
        }

        // Admin pode alterar diretamente
        usuario.nome = novosDados.nome;
        usuario.perfil.email = novosDados.email;
        usuario.perfil.telefone = novosDados.telefone;
        usuario.perfil.cargo = novosDados.cargo;
        usuario.perfil.departamento = novosDados.departamento;
        usuario.perfil.dataNascimento = novosDados.dataNascimento;

        this.salvarDados();
        this.atualizarInfoUsuario();
        this.mostrarNotificacao('Perfil atualizado com sucesso!', 'success');
    }

    alterarSenha() {
        const senhaAtual = document.getElementById('senha-atual').value;
        const novaSenha = document.getElementById('nova-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        const usuario = this.usuarios[this.usuarioAtual];
        if (!usuario) return;

        // Verificar senha atual
        if (!this.verificarPassword(usuario.senha, senhaAtual)) {
            this.mostrarNotificacao('Senha atual incorreta', 'error');
            return;
        }

        // Verificar se as senhas coincidem
        if (novaSenha !== confirmarSenha) {
            this.mostrarNotificacao('As senhas não coincidem', 'error');
            return;
        }

        // Verificar se a nova senha não está vazia
        if (!novaSenha || novaSenha.length < 3) {
            this.mostrarNotificacao('A nova senha deve ter pelo menos 3 caracteres', 'error');
            return;
        }

        // Atualizar senha
        usuario.senha = this.hashPassword(novaSenha);
        this.salvarDados();
        this.mostrarNotificacao('Senha alterada com sucesso!', 'success');
        document.getElementById('form-alterar-senha').reset();
    }

    processarUploadFoto(evento) {
        const arquivo = evento.target.files[0];
        if (!arquivo) return;

        // Verificar tipo de arquivo
        if (!arquivo.type.startsWith('image/')) {
            this.mostrarNotificacao('Por favor, selecione apenas arquivos de imagem', 'error');
            return;
        }

        // Verificar tamanho (máximo 2MB)
        if (arquivo.size > 2 * 1024 * 1024) {
            this.mostrarNotificacao('A imagem deve ter no máximo 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const usuario = this.usuarios[this.usuarioAtual];
            usuario.perfil.foto = e.target.result;
            this.salvarDados();
            this.atualizarFotoPerfil();
            this.mostrarNotificacao('Foto atualizada com sucesso!', 'success');
        };
        reader.readAsDataURL(arquivo);
    }

    removerFoto() {
        if (confirm('Tem certeza que deseja remover sua foto de perfil?')) {
            const usuario = this.usuarios[this.usuarioAtual];
            usuario.perfil.foto = null;
            this.salvarDados();
            this.atualizarFotoPerfil();
            this.mostrarNotificacao('Foto removida com sucesso!', 'success');
        }
    }

    atualizarFotoPerfil() {
        const usuario = this.usuarios[this.usuarioAtual];
        if (!usuario) return;

        const fotoContainer = document.getElementById('foto-usuario');
        const iniciaisSpan = document.getElementById('iniciais-usuario');
        const btnRemover = document.getElementById('btn-remover-foto');

        if (usuario.perfil && usuario.perfil.foto) {
            // Mostrar foto personalizada
            fotoContainer.innerHTML = `<img src="${usuario.perfil.foto}" alt="Foto do usuário">`;
            btnRemover.style.display = 'block';
        } else {
            // Mostrar iniciais
            const iniciais = usuario.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            fotoContainer.innerHTML = `<span id="iniciais-usuario">${iniciais}</span>`;
            btnRemover.style.display = 'none';
        }
    }

    // Sistema de Aprovações
    criarSolicitacaoAprovacao(solicitacao) {
        const novaAprovacao = {
            id: `APR-${Date.now()}`,
            ...solicitacao,
            dataCreacao: new Date().toISOString(),
            status: 'pendente',
            comentarios: '',
            dataProcessamento: null,
            processadoPor: null
        };

        this.aprovacoes.unshift(novaAprovacao);
        this.salvarDados();
        this.atualizarContadorAprovacoes();
    }

    carregarAprovacoes() {
        const isAdmin = this.usuarioAtual === 'admin';
        
        if (isAdmin) {
            // Admin vê todas as aprovações
            document.querySelector('.aprovacoes-lista').style.display = 'block';
            document.getElementById('minhas-solicitacoes').style.display = 'none';
            this.atualizarTabelaAprovacoes();
        } else {
            // Usuários comuns veem apenas suas solicitações
            document.querySelector('.aprovacoes-lista').style.display = 'none';
            document.getElementById('minhas-solicitacoes').style.display = 'block';
            this.atualizarMinhasSolicitacoes();
        }
        
        this.atualizarContadorAprovacoes();
    }

    atualizarTabelaAprovacoes(filtros = {}) {
        const tbody = document.querySelector('#tabela-aprovacoes tbody');
        tbody.innerHTML = '';

        let aprovacoesFiltradas = [...this.aprovacoes];

        // Aplicar filtros
        if (filtros.tipo) {
            aprovacoesFiltradas = aprovacoesFiltradas.filter(a => a.tipo === filtros.tipo);
        }
        if (filtros.status) {
            aprovacoesFiltradas = aprovacoesFiltradas.filter(a => a.status === filtros.status);
        }

        aprovacoesFiltradas.forEach(aprovacao => {
            const row = tbody.insertRow();
            const usuario = this.usuarios[aprovacao.usuario];
            const dataFormatada = new Date(aprovacao.dataCreacao).toLocaleDateString();
            const valorFormatado = aprovacao.valorTotal ? `R$ ${aprovacao.valorTotal.toFixed(2)}` : '-';
            
            row.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${usuario ? usuario.nome : aprovacao.usuario}</td>
                <td>${aprovacao.tipo === 'perfil' ? 'Alteração de Perfil' : 'Produto Alto Valor'}</td>
                <td>${aprovacao.descricao}</td>
                <td>${valorFormatado}</td>
                <td><span class="status-${aprovacao.status}">${this.formatarStatus(aprovacao.status)}</span></td>
                <td>
                    ${aprovacao.status === 'pendente' ? 
                        `<button class="btn-editar" onclick="sistema.abrirModalAprovacao('${aprovacao.id}')">👁️ Ver</button>` : 
                        `<button class="btn-editar" onclick="sistema.abrirModalAprovacao('${aprovacao.id}')">📄 Detalhes</button>`
                    }
                </td>
            `;
        });
    }

    atualizarMinhasSolicitacoes() {
        const tbody = document.querySelector('#tabela-minhas-solicitacoes tbody');
        tbody.innerHTML = '';

        const minhasSolicitacoes = this.aprovacoes.filter(a => a.usuario === this.usuarioAtual);

        minhasSolicitacoes.forEach(aprovacao => {
            const row = tbody.insertRow();
            const dataFormatada = new Date(aprovacao.dataCreacao).toLocaleDateString();
            
            row.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${aprovacao.tipo === 'perfil' ? 'Alteração de Perfil' : 'Produto Alto Valor'}</td>
                <td>${aprovacao.descricao}</td>
                <td><span class="status-${aprovacao.status}">${this.formatarStatus(aprovacao.status)}</span></td>
                <td>${aprovacao.comentarios || '-'}</td>
            `;
        });
    }

    formatarStatus(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'aprovado': 'Aprovado',
            'rejeitado': 'Rejeitado',
            'aprovado_com_modificacao': 'Aprovado com Modificação'
        };
        return statusMap[status] || status;
    }

    filtrarAprovacoes() {
        const filtros = {
            tipo: document.getElementById('filtro-tipo').value,
            status: document.getElementById('filtro-status').value
        };
        this.atualizarTabelaAprovacoes(filtros);
    }

    abrirModalAprovacao(aprovacaoId) {
        const aprovacao = this.aprovacoes.find(a => a.id === aprovacaoId);
        if (!aprovacao) return;

        this.aprovacaoAtual = aprovacao;
        
        // Preencher detalhes da solicitação
        const detalhesHtml = this.gerarDetalhesAprovacao(aprovacao);
        document.getElementById('detalhes-solicitacao').innerHTML = detalhesHtml;
        
        // Limpar comentários
        document.getElementById('comentario-aprovacao').value = aprovacao.comentarios || '';
        
        // Controlar visibilidade dos botões baseado no status
        const isPendente = aprovacao.status === 'pendente';
        const isAdmin = this.usuarioAtual === 'admin';
        
        console.log('Status da aprovação:', aprovacao.status, 'É pendente:', isPendente, 'É admin:', isAdmin);
        
        const btnAprovar = document.getElementById('btn-aprovar');
        const btnAprovarModificacao = document.getElementById('btn-aprovar-modificacao');
        const btnRejeitar = document.getElementById('btn-rejeitar');
        const comentarioField = document.getElementById('comentario-aprovacao');
        
        if (btnAprovar) btnAprovar.style.display = isPendente && isAdmin ? 'inline-block' : 'none';
        if (btnAprovarModificacao) btnAprovarModificacao.style.display = isPendente && isAdmin ? 'inline-block' : 'none';
        if (btnRejeitar) btnRejeitar.style.display = isPendente && isAdmin ? 'inline-block' : 'none';
        if (comentarioField) comentarioField.disabled = !isPendente || !isAdmin;
        
        document.getElementById('modal-aprovacao').style.display = 'flex';
        
        // Reconfigurar event listeners do modal após abrir (para garantir que estão funcionando)
        this.configurarEventListenersModal();
    }

    gerarDetalhesAprovacao(aprovacao) {
        const usuario = this.usuarios[aprovacao.usuario];
        const dataFormatada = new Date(aprovacao.dataCreacao).toLocaleDateString();
        
        let detalhes = `
            <h4>Informações da Solicitação</h4>
            <div class="detalhe-item">
                <span class="detalhe-label">ID:</span>
                <span class="detalhe-valor">${aprovacao.id}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Usuário:</span>
                <span class="detalhe-valor">${usuario ? usuario.nome : aprovacao.usuario}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Data:</span>
                <span class="detalhe-valor">${dataFormatada}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Tipo:</span>
                <span class="detalhe-valor">${aprovacao.tipo === 'perfil' ? 'Alteração de Perfil' : 'Produto Alto Valor'}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Status:</span>
                <span class="detalhe-valor status-${aprovacao.status}">${this.formatarStatus(aprovacao.status)}</span>
            </div>
        `;

        if (aprovacao.tipo === 'perfil') {
            detalhes += this.gerarDetalhesPerfilAprovacao(aprovacao);
        } else if (aprovacao.tipo === 'produto') {
            detalhes += this.gerarDetalhesProdutoAprovacao(aprovacao);
        }

        return detalhes;
    }

    gerarDetalhesPerfilAprovacao(aprovacao) {
        const { dadosAtuais, novosDados } = aprovacao.dados;
        
        return `
            <h4 style="margin-top: 1.5rem;">Alterações Solicitadas</h4>
            <div class="detalhe-item">
                <span class="detalhe-label">Nome:</span>
                <span class="detalhe-valor">${dadosAtuais.nome} → ${novosDados.nome}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Email:</span>
                <span class="detalhe-valor">${dadosAtuais.email || '-'} → ${novosDados.email || '-'}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Telefone:</span>
                <span class="detalhe-valor">${dadosAtuais.telefone || '-'} → ${novosDados.telefone || '-'}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Cargo:</span>
                <span class="detalhe-valor">${dadosAtuais.cargo || '-'} → ${novosDados.cargo || '-'}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Departamento:</span>
                <span class="detalhe-valor">${dadosAtuais.departamento || '-'} → ${novosDados.departamento || '-'}</span>
            </div>
        `;
    }

    gerarDetalhesProdutoAprovacao(aprovacao) {
        const { nome, codigo, categoria, estoqueMinimo, valorUnitario } = aprovacao.dados;
        
        return `
            <h4 style="margin-top: 1.5rem;">Detalhes do Produto</h4>
            <div class="detalhe-item">
                <span class="detalhe-label">Nome:</span>
                <span class="detalhe-valor">${nome}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Código:</span>
                <span class="detalhe-valor">${codigo}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Categoria:</span>
                <span class="detalhe-valor">${categoria}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Estoque Mínimo:</span>
                <span class="detalhe-valor">${estoqueMinimo}</span>
            </div>
            <div class="detalhe-item">
                <span class="detalhe-label">Valor Unitário:</span>
                <span class="detalhe-valor">R$ ${valorUnitario.toFixed(2)}</span>
            </div>
        `;
    }

    processarAprovacao(novoStatus) {
        if (!this.aprovacaoAtual) {
            console.error('Nenhuma aprovação selecionada');
            return;
        }

        const comentario = document.getElementById('comentario-aprovacao').value;
        
        this.aprovacaoAtual.status = novoStatus;
        this.aprovacaoAtual.comentarios = comentario;
        this.aprovacaoAtual.dataProcessamento = new Date().toISOString();
        this.aprovacaoAtual.processadoPor = this.usuarioAtual;

        // Se aprovado, aplicar as alterações
        if (novoStatus === 'aprovado' || novoStatus === 'aprovado_com_modificacao') {
            this.aplicarAprovacao(this.aprovacaoAtual);
        }

        this.salvarDados();
        this.fecharModalAprovacao();
        this.carregarAprovacoes();
        this.mostrarNotificacao(`Solicitação ${this.formatarStatus(novoStatus).toLowerCase()}!`, 'success');
    }

    aplicarAprovacao(aprovacao) {
        if (aprovacao.tipo === 'perfil') {
            const usuario = this.usuarios[aprovacao.usuario];
            if (usuario) {
                const { novosDados } = aprovacao.dados;
                usuario.nome = novosDados.nome;
                usuario.perfil.email = novosDados.email;
                usuario.perfil.telefone = novosDados.telefone;
                usuario.perfil.cargo = novosDados.cargo;
                usuario.perfil.departamento = novosDados.departamento;
                usuario.perfil.dataNascimento = novosDados.dataNascimento;
            }
        } else if (aprovacao.tipo === 'produto') {
            const { nome, codigo, categoria, estoqueMinimo, valorUnitario } = aprovacao.dados;
            this.produtosCadastrados[nome] = {
                codigo,
                categoria,
                estoqueMinimo,
                valorUnitario,
                dataCadastro: new Date().toLocaleDateString()
            };
            this.produtos[nome] = 0;
            this.atualizarTabelaProdutos();
            this.atualizarSelectsProdutos();
            this.atualizarDashboard();
        }
    }

    configurarEventListenersModal() {
        // Remover event listeners existentes e adicionar novos para evitar duplicatas
        const btnAprovar = document.getElementById('btn-aprovar');
        const btnAprovarModificacao = document.getElementById('btn-aprovar-modificacao');
        const btnRejeitar = document.getElementById('btn-rejeitar');
        
        if (btnAprovar) {
            btnAprovar.onclick = () => {
                console.log('Aprovando...');
                this.processarAprovacao('aprovado');
            };
        }
        
        if (btnAprovarModificacao) {
            btnAprovarModificacao.onclick = () => {
                console.log('Aprovando com modificação...');
                this.processarAprovacao('aprovado_com_modificacao');
            };
        }
        
        if (btnRejeitar) {
            btnRejeitar.onclick = () => {
                console.log('Rejeitando...');
                this.processarAprovacao('rejeitado');
            };
        }
    }

    fecharModalAprovacao() {
        document.getElementById('modal-aprovacao').style.display = 'none';
        this.aprovacaoAtual = null;
    }

    atualizarContadorAprovacoes() {
        const aprovacoesPendentes = this.aprovacoes.filter(a => a.status === 'pendente').length;
        const contador = document.getElementById('contador-aprovacoes');
        
        if (aprovacoesPendentes > 0 && this.usuarioAtual === 'admin') {
            contador.textContent = aprovacoesPendentes;
            contador.style.display = 'inline';
        } else {
            contador.style.display = 'none';
        }
    }

    salvarDados() {
        localStorage.setItem('produtos', JSON.stringify(this.produtos));
        localStorage.setItem('produtosCadastrados', JSON.stringify(this.produtosCadastrados));
        localStorage.setItem('historico', JSON.stringify(this.historico));
        localStorage.setItem('usuarios', JSON.stringify(this.usuarios));
        localStorage.setItem('aprovacoes', JSON.stringify(this.aprovacoes));
    }
}

// Inicializar o sistema
const sistema = new SistemaEstoque();
