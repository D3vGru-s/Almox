
// Configuração do Supabase
const { createClient } = supabase;
const supabaseUrl = 'https://dgsjanilahivremuaoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2phbmlsYWhpcnZyZW11YW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjQ4MzMsImV4cCI6MjA3MDI0MDgzM30.92Ih7_36vunskpTgHVOsJr7t9FZ0iDJG4fl8PYRC4oQ';
const db = createClient(supabaseUrl, supabaseKey);

// Função utilitária para hash de senha
function hashPassword(senha) {
    return btoa(senha);
}

// Classe principal
class SistemaEstoque {
    constructor() {
        this.usuarioAtual = null;
        this.usuarioLogado = false;
        this.temaEscuro = false;
        this.inicializar();
    }

    async inicializar() {
        this.configurarEventListeners();
        this.atualizarHorario();
        this.mostrarTelaLogin();
    }

    configurarEventListeners() {
        document.getElementById('form-login').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('btn-logout').addEventListener('click', () => {
            this.logout();
        });

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
    }

    mostrarTelaLogin() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('sistema-principal').style.display = 'none';
    }

    mostrarSistema() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('sistema-principal').style.display = 'flex';
        this.atualizarDashboard();
        this.atualizarTabelaProdutos();
        this.atualizarTabelaEstoque();
        this.atualizarTabelaUsuarios();
    }

    async login() {
        const username = document.getElementById('usuario').value;
        const password = document.getElementById('senha').value;

        const { data, error } = await db.from('usuarios').select('*').eq('nome', username).single();
        if (error || !data) {
            alert('Usuário não encontrado');
            return;
        }

        if (data.senha === hashPassword(password)) {
            this.usuarioAtual = username;
            this.usuarioLogado = true;
            this.mostrarSistema();
        } else {
            alert('Senha incorreta');
        }
    }

    logout() {
        this.usuarioAtual = null;
        this.usuarioLogado = false;
        this.mostrarTelaLogin();
    }

    async criarUsuario() {
        const nome = document.getElementById('nome-usuario').value;
        const username = document.getElementById('username-usuario').value;
        const senha = document.getElementById('password-usuario').value;
        const permissoes = document.getElementById('permissoes-usuario').value;

        const { error } = await db.from('usuarios').insert([{
            nome: username,
            senha: hashPassword(senha),
            email: '',
            permissoes: permissoes.split(',')
        }]);

        if (error) {
            alert('Erro ao criar usuário: ' + error.message);
        } else {
            alert('Usuário criado com sucesso');
            this.atualizarTabelaUsuarios();
        }
    }

    async cadastrarProduto() {
        const nome = document.getElementById('nome-produto').value;
        const codigo = document.getElementById('codigo-produto').value || `AUTO-${Date.now()}`;
        const categoria = document.getElementById('categoria-produto').value;
        const estoqueMinimo = parseInt(document.getElementById('estoque-minimo').value);
        const valorUnitario = parseFloat(document.getElementById('valor-unitario').value) || 0;

        const { error } = await db.from('produtos').insert([{
            nome, codigo, categoria, estoqueMinimo, valorUnitario, quantidade: 0
        }]);

        if (error) {
            alert('Erro ao cadastrar produto: ' + error.message);
        } else {
            alert('Produto cadastrado com sucesso');
            this.atualizarTabelaProdutos();
        }
    }

    async entradaProduto() {
        const produto = document.getElementById('produto-entrada').value;
        const quantidade = parseInt(document.getElementById('quantidade-entrada').value);

        const { data } = await db.from('produtos').select('*').eq('nome', produto).single();
        if (!data) return;

        const novaQtd = data.quantidade + quantidade;
        await db.from('produtos').update({ quantidade: novaQtd }).eq('id', data.id);
        await db.from('historico').insert([{
            data: new Date().toLocaleDateString(),
            produto, quantidade: `+${quantidade}`, usuario: this.usuarioAtual, tipo: 'entrada'
        }]);

        alert('Entrada registrada com sucesso');
        this.atualizarTabelaEstoque();
    }

    async saidaProduto() {
        const produto = document.getElementById('produto-saida').value;
        const quantidade = parseInt(document.getElementById('quantidade-saida').value);

        const { data } = await db.from('produtos').select('*').eq('nome', produto).single();
        if (!data) return;

        if (quantidade > data.quantidade) {
            alert('Quantidade maior que estoque disponível');
            return;
        }

        const novaQtd = data.quantidade - quantidade;
        await db.from('produtos').update({ quantidade: novaQtd }).eq('id', data.id);
        await db.from('historico').insert([{
            data: new Date().toLocaleDateString(),
            produto, quantidade: `-${quantidade}`, usuario: this.usuarioAtual, tipo: 'saida'
        }]);

        alert('Saída registrada com sucesso');
        this.atualizarTabelaEstoque();
    }

    async atualizarTabelaProdutos() {
        const { data } = await db.from('produtos').select('*');
        const tbody = document.querySelector('#tabela-produtos-cadastrados tbody');
        tbody.innerHTML = '';
        data.forEach(prod => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${prod.nome}</td><td>${prod.codigo}</td><td>${prod.categoria}</td><td>${prod.estoqueMinimo}</td><td>${prod.valorUnitario}</td>`;
        });
    }

    async atualizarTabelaEstoque() {
        const { data } = await db.from('produtos').select('*');
        const tbody = document.querySelector('#tabela-estoque tbody');
        tbody.innerHTML = '';
        data.forEach(prod => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${prod.nome}</td><td>${prod.codigo}</td><td>${prod.categoria}</td><td>${prod.quantidade}</td><td>${prod.estoqueMinimo}</td>`;
        });
    }

    async atualizarTabelaUsuarios() {
        const { data } = await db.from('usuarios').select('*');
        const tbody = document.querySelector('#tabela-usuarios tbody');
        tbody.innerHTML = '';
        data.forEach(user => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${user.nome}</td><td>${user.email}</td>`;
        });
    }

    async atualizarDashboard() {
        const { data } = await db.from('produtos').select('*');
        document.getElementById('total-produtos').textContent = data.length;
        document.getElementById('total-itens').textContent = data.reduce((sum, p) => sum + p.quantidade, 0);
    }

    atualizarHorario() {
        const agora = new Date();
        document.getElementById('horario-atual').textContent = agora.toLocaleTimeString();
        setTimeout(() => this.atualizarHorario(), 1000);
    }
}
