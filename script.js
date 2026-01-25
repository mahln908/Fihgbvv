// Configurações da planilha
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// Estado da aplicação
let todasReceitas = [];
let receitasFiltradas = [];
let categoriaAtual = 'todas';
let receitasExibidas = 0;
const RECIPES_PER_LOAD = 9;
let carregandoMais = false;

// Elementos DOM
const recipesContainer = document.getElementById('recipesContainer');
const categoriesScroll = document.getElementById('categoriesScroll');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');
const recipesCount = document.getElementById('recipesCount');
const autoLoadIndicator = document.getElementById('autoLoadIndicator');

// Imagens padrão para categorias
const imagensCategorias = {
    'pratos principais': '🍳',
    'low carb': '🥗',
    'sobremesa': '🍰',
    'vegetariano': '🥦',
    'salada': '🥙',
    'massas': '🍝',
    'carnes': '🥩',
    'aves': '🍗',
    'peixes': '🐟',
    'sopas': '🍲',
    'bolos': '🎂',
    'doces': '🍬',
    'bebidas': '🥤',
    'café da manhã': '☕',
    'lanche': '🥪'
};

// Cores para categorias (fallback)
const coresCategorias = {
    'pratos principais': '#FF6B35',
    'low carb': '#27AE60',
    'sobremesa': '#9B59B6',
    'vegetariano': '#3498DB',
    'salada': '#1ABC9C',
    'massas': '#E74C3C',
    'carnes': '#C0392B',
    'aves': '#D35400',
    'peixes': '#2980B9',
    'sopas': '#16A085',
    'bolos': '#8E44AD',
    'doces': '#F39C12',
    'bebidas': '#3498DB'
};

// Carregar dados da planilha
async function carregarReceitas() {
    try {
        mostrarLoading();
        
        console.log('🔗 Acessando Google Sheets...');
        const resposta = await fetch(URL);
        
        if (!resposta.ok) {
            throw new Error(`Erro ${resposta.status}: ${resposta.statusText}`);
        }
        
        const dados = await resposta.json();
        
        if (!dados.values || dados.values.length === 0) {
            throw new Error('Planilha vazia');
        }
        
        console.log('✅ Dados carregados!');
        
        // Processar dados
        todasReceitas = processarDados(dados.values);
        
        if (todasReceitas.length === 0) {
            throw new Error('Nenhuma receita encontrada');
        }
        
        console.log(`🍳 ${todasReceitas.length} receitas processadas`);
        
        // Inicializar
        receitasFiltradas = [...todasReceitas];
        receitasExibidas = 0;
        
        // Atualizar interface
        carregarCategorias();
        exibirReceitas();
        atualizarContador();
        
        // Configurar scroll infinito
        configurarScrollInfinito();
        
        esconderLoading();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarErro(`Erro ao carregar: ${erro.message}`);
    }
}

// Processar dados da planilha
function processarDados(dadosPlanilha) {
    if (!dadosPlanilha || dadosPlanilha.length < 2) return [];
    
    const cabecalhos = dadosPlanilha[0];
    const linhas = dadosPlanilha.slice(1);
    
    // Mapear índices
    const indices = {};
    cabecalhos.forEach((cabecalho, indice) => {
        const nomeCampo = cabecalho.toLowerCase().trim();
        indices[nomeCampo] = indice;
    });
    
    console.log('Índices encontrados:', indices);
    
    // Processar cada linha
    const receitas = [];
    
    linhas.forEach((linha, indiceLinha) => {
        try {
            const receita = {
                id: indiceLinha + 1,
                nome: obterValor(linha, indices, 'nome') || `Receita ${indiceLinha + 1}`,
                categoria: obterValor(linha, indices, 'categoria') || 'Geral',
                tempo: obterValor(linha, indices, 'tempo') || 'Tempo não informado',
                ingrediente: obterValor(linha, indices, 'ingrediente') || 'Ingredientes não informados',
                mododepreparo: obterValor(linha, indices, 'mododepreparo') || 'Modo de preparo não informado',
                url: obterValor(linha, indices, 'url') || '',
                mensagem: obterValor(linha, indices, 'mensagem') || ''
            };
            
            // Gerar cor e emoji baseado na categoria
            const primeiraCategoria = receita.categoria.toLowerCase().split(',')[0].trim();
            receita.cor = coresCategorias[primeiraCategoria] || gerarCor(primeiraCategoria);
            receita.emoji = imagensCategorias[primeiraCategoria] || '🍽️';
            
            receitas.push(receita);
            
        } catch (erro) {
            console.warn(`Erro linha ${indiceLinha}:`, erro);
        }
    });
    
    return receitas.filter(r => r.nome && r.nome.trim());
}

function obterValor(linha, indices, campo) {
    const indice = indices[campo];
    return (indice !== undefined && linha[indice]) ? linha[indice].toString().trim() : '';
}

function gerarCor(texto) {
    const cores = ['#FF6B35', '#E55A2B', '#FF8B5A', '#2ECC71', '#3498DB', '#9B59B6'];
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = texto.charCodeAt(i) + ((hash << 5) - hash);
    }
    return cores[Math.abs(hash) % cores.length];
}

// Carregar categorias
function carregarCategorias() {
    const categoriasUnicas = obterCategoriasUnicas();
    
    categoriesScroll.innerHTML = '';
    
    categoriasUnicas.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = 'cat-btn';
        botao.dataset.category = categoria.toLowerCase();
        
        // Adicionar ícone
        const icone = document.createElement('i');
        icone.className = getIconeCategoria(categoria);
        botao.appendChild(icone);
        
        // Adicionar texto
        const texto = document.createTextNode(` ${categoria}`);
        botao.appendChild(texto);
        
        botao.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            botao.classList.add('active');
            
            categoriaAtual = categoria.toLowerCase();
            receitasFiltradas = filtrarReceitas();
            receitasExibidas = 0;
            exibirReceitas();
            atualizarContador();
        });
        
        categoriesScroll.appendChild(botao);
    });
}

function getIconeCategoria(categoria) {
    const cat = categoria.toLowerCase();
    if (cat.includes('prato') || cat.includes('principal')) return 'fas fa-utensils';
    if (cat.includes('low') || cat.includes('carb')) return 'fas fa-leaf';
    if (cat.includes('doce') || cat.includes('sobremesa')) return 'fas fa-birthday-cake';
    if (cat.includes('vegetar')) return 'fas fa-seedling';
    if (cat.includes('salada')) return 'fas fa-apple-alt';
    if (cat.includes('massa')) return 'fas fa-pizza-slice';
    if (cat.includes('carne')) return 'fas fa-drumstick-bite';
    if (cat.includes('ave') || cat.includes('frango')) return 'fas fa-drumstick-bite';
    if (cat.includes('peixe')) return 'fas fa-fish';
    if (cat.includes('sopa')) return 'fas fa-mug-hot';
    if (cat.includes('bolo')) return 'fas fa-birthday-cake';
    if (cat.includes('bebida')) return 'fas fa-glass-whiskey';
    if (cat.includes('café')) return 'fas fa-coffee';
    if (cat.includes('lanche')) return 'fas fa-hamburger';
    return 'fas fa-utensils';
}

function obterCategoriasUnicas() {
    const categorias = new Set();
    
    todasReceitas.forEach(receita => {
        if (receita.categoria) {
            receita.categoria.split(',').forEach(cat => {
                const catLimpa = cat.trim();
                if (catLimpa) categorias.add(catLimpa);
            });
        }
    });
    
    return Array.from(categorias).sort();
}

// Filtrar receitas
function filtrarReceitas() {
    const termoBusca = searchInput.value.toLowerCase().trim();
    
    return todasReceitas.filter(receita => {
        const categoriaCorreta = categoriaAtual === 'todas' || 
            receita.categoria.toLowerCase().includes(categoriaAtual);
        
        const buscaCorreta = !termoBusca ||
            receita.nome.toLowerCase().includes(termoBusca) ||
            receita.ingrediente.toLowerCase().includes(termoBusca) ||
            receita.categoria.toLowerCase().includes(termoBusca);
        
        return categoriaCorreta && buscaCorreta;
    });
}

// Exibir receitas
function exibirReceitas() {
    const receitasParaMostrar = receitasFiltradas.slice(0, receitasExibidas + RECIPES_PER_LOAD);
    
    if (receitasExibidas === 0) {
        recipesContainer.innerHTML = '';
    }
    
    if (receitasFiltradas.length === 0) {
        mostrarSemResultados();
        return;
    }
    
    receitasParaMostrar.forEach((receita, indice) => {
        const card = criarCardReceita(receita, indice);
        recipesContainer.appendChild(card);
    });
    
    receitasExibidas = receitasParaMostrar.length;
    
    // Ocultar indicador de carregamento
    carregandoMais = false;
    autoLoadIndicator.style.display = 'none';
}

function criarCardReceita(receita, indice) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    const primeiraCategoria = receita.categoria.split(',')[0].trim();
    const ingredientesPreview = receita.ingrediente.length > 80 ? 
        receita.ingrediente.substring(0, 80) + '...' : receita.ingrediente;
    
    // Verificar se tem URL de imagem
    const temImagem = receita.url && receita.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    card.innerHTML = `
        <div class="recipe-image-container">
            ${temImagem ? 
                `<img src="${receita.url}" alt="${receita.nome}" class="recipe-image" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-utensils\\'></i></div>';" loading="lazy">` :
                `<div class="image-placeholder" style="background: linear-gradient(135deg, ${receita.cor}, ${receita.cor}80)">
                    <i class="fas fa-utensils"></i>
                </div>`
            }
            <span class="recipe-badge">${primeiraCategoria}</span>
            <span class="recipe-time"><i class="far fa-clock"></i> ${receita.tempo}</span>
        </div>
        <div class="recipe-content">
            <h3 class="recipe-title">${receita.nome}</h3>
            <p class="recipe-desc">${ingredientesPreview}</p>
            <a href="receita.html?id=${receita.id}" class="view-recipe">
                Ver receita completa <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
    
    // Adicionar evento de clique em todo o card
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.view-recipe')) {
            window.location.href = `receita.html?id=${receita.id}`;
        }
    });
    
    return card;
}

// Carregar mais receitas automaticamente
function carregarMaisAutomaticamente() {
    if (carregandoMais || receitasExibidas >= receitasFiltradas.length) return;
    
    carregandoMais = true;
    autoLoadIndicator.style.display = 'flex';
    
    setTimeout(() => {
        receitasExibidas += RECIPES_PER_LOAD;
        exibirReceitas();
    }, 300);
}

// Configurar scroll infinito
function configurarScrollInfinito() {
    let timer;
    
    window.addEventListener('scroll', () => {
        clearTimeout(timer);
        
        timer = setTimeout(() => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;
            const threshold = 100; // pixels antes do fim
            
            if (scrollPosition >= pageHeight - threshold) {
                carregarMaisAutomaticamente();
            }
        }, 100);
    });
}

// Atualizar contador
function atualizarContador() {
    if (recipesCount) {
        recipesCount.textContent = receitasFiltradas.length;
    }
}

// Funções UI
function mostrarLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
}

function esconderLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

function mostrarErro(mensagem) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar</h3>
            <p>${mensagem}</p>
            <button onclick="carregarReceitas()" class="view-recipe" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>
    `;
    esconderLoading();
}

function mostrarSemResultados() {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <h3>Nenhuma receita encontrada</h3>
            <p>Tente outro termo de busca ou selecione uma categoria diferente.</p>
        </div>
    `;
}

// Scroll horizontal das categorias
function configurarScrollHorizontal() {
    if (scrollLeft && scrollRight) {
        scrollLeft.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: -200, behavior: 'smooth' });
        });
        
        scrollRight.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }
}

// Busca
function executarBusca() {
    receitasFiltradas = filtrarReceitas();
    receitasExibidas = 0;
    exibirReceitas();
    atualizarContador();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Sabor de Casa...');
    
    // Carregar dados
    carregarReceitas();
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', executarBusca);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') executarBusca();
        });
    }
    
    // Configurar categoria "Todas"
    const todasBtn = document.querySelector('.cat-btn[data-category="todas"]');
    if (todasBtn) {
        todasBtn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            todasBtn.classList.add('active');
            categoriaAtual = 'todas';
            receitasFiltradas = filtrarReceitas();
            receitasExibidas = 0;
            exibirReceitas();
            atualizarContador();
        });
    }
    
    // Configurar scroll horizontal
    configurarScrollHorizontal();
});
