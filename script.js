// Configurações da planilha
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// Cache para dados já carregados
let cacheDados = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Estado da aplicação
let todasReceitas = [];
let receitasFiltradas = [];
let categoriaAtual = 'todas';
let receitasExibidas = 0;
const RECIPES_PER_LOAD = 12; // Aumentado para carregar mais de uma vez
let carregandoMais = false;
let carregamentoInicial = true;

// Elementos DOM
const recipesContainer = document.getElementById('recipesContainer');
const categoriesScroll = document.getElementById('categoriesScroll');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');
const recipesCount = document.getElementById('recipesCount');
const autoLoadIndicator = document.getElementById('autoLoadIndicator');

// Carregar dados com cache
async function carregarReceitas() {
    try {
        mostrarLoading();
        
        // Verificar cache
        const agora = Date.now();
        if (cacheDados && cacheTimestamp && (agora - cacheTimestamp) < CACHE_DURATION) {
            console.log('📦 Usando dados do cache...');
            processarDadosCache();
            return;
        }
        
        console.log('🔗 Buscando dados do Google Sheets...');
        const resposta = await fetch(URL, {
            cache: 'no-store' // Forçar atualização
        });
        
        if (!resposta.ok) {
            throw new Error(`Erro ${resposta.status}: ${resposta.statusText}`);
        }
        
        const dados = await resposta.json();
        
        if (!dados.values || dados.values.length === 0) {
            throw new Error('Planilha vazia');
        }
        
        console.log('✅ Dados carregados!');
        
        // Atualizar cache
        cacheDados = dados.values;
        cacheTimestamp = Date.now();
        
        // Processar dados
        processarDadosCache();
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        mostrarErro(`Erro ao carregar: ${erro.message}`);
    }
}

function processarDadosCache() {
    todasReceitas = processarDados(cacheDados);
    
    if (todasReceitas.length === 0) {
        mostrarErro('Nenhuma receita encontrada na planilha');
        return;
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
    carregamentoInicial = false;
}

// Processar dados da planilha - OTIMIZADO
function processarDados(dadosPlanilha) {
    if (!dadosPlanilha || dadosPlanilha.length < 2) return [];
    
    const cabecalhos = dadosPlanilha[0];
    const linhas = dadosPlanilha.slice(1);
    
    // Mapear índices rapidamente
    const indices = {};
    cabecalhos.forEach((cabecalho, indice) => {
        const nomeCampo = cabecalho.toLowerCase().trim();
        indices[nomeCampo] = indice;
    });
    
    // Processar linhas da MAIS RECENTE para a MAIS ANTIGA (de baixo para cima)
    const receitas = [];
    
    for (let i = linhas.length - 1; i >= 0; i--) {
        const linha = linhas[i];
        
        try {
            const receita = {
                id: i + 1,
                nome: (linha[indices['nome']] || '').toString().trim() || `Receita ${i + 1}`,
                categoria: (linha[indices['categoria']] || '').toString().trim() || 'Geral',
                tempo: (linha[indices['tempo']] || '').toString().trim() || 'Tempo não informado',
                ingrediente: (linha[indices['ingrediente']] || '').toString().trim() || 'Ingredientes não informados',
                mododepreparo: (linha[indices['mododepreparo']] || '').toString().trim() || 'Modo de preparo não informado',
                url: (linha[indices['url']] || '').toString().trim() || '',
                mensagem: (linha[indices['mensagem']] || '').toString().trim() || ''
            };
            
            // Verificar se é duplicada (comparar com a última adicionada)
            if (receitas.length === 0 || receita.nome !== receitas[receitas.length - 1].nome) {
                // Gerar cor baseada na categoria
                const primeiraCategoria = receita.categoria.toLowerCase().split(',')[0].trim();
                receita.cor = gerarCorCategoria(primeiraCategoria);
                
                receitas.push(receita);
            }
            
        } catch (erro) {
            console.warn(`Erro linha ${i}:`, erro);
        }
    }
    
    return receitas.filter(r => r.nome && r.nome.trim() !== 'Receita');
}

function gerarCorCategoria(categoria) {
    const coresMap = {
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
        'bebidas': '#3498DB',
        'café da manhã': '#F1C40F',
        'lanche': '#E67E22'
    };
    
    return coresMap[categoria] || '#FF6B35';
}

// Carregar categorias - OTIMIZADO
function carregarCategorias() {
    const categoriasUnicas = obterCategoriasUnicas();
    
    categoriesScroll.innerHTML = '';
    
    categoriasUnicas.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = 'cat-btn';
        botao.dataset.category = categoria.toLowerCase();
        botao.innerHTML = `<i class="${getIconeCategoria(categoria)}"></i> ${categoria}`;
        
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

// Filtrar receitas - OTIMIZADO
function filtrarReceitas() {
    const termoBusca = searchInput.value.toLowerCase().trim();
    
    if (!termoBusca && categoriaAtual === 'todas') {
        return todasReceitas;
    }
    
    return todasReceitas.filter(receita => {
        // Filtrar por categoria
        if (categoriaAtual !== 'todas' && !receita.categoria.toLowerCase().includes(categoriaAtual)) {
            return false;
        }
        
        // Filtrar por termo de busca
        if (termoBusca) {
            return receita.nome.toLowerCase().includes(termoBusca) ||
                   receita.ingrediente.toLowerCase().includes(termoBusca) ||
                   receita.categoria.toLowerCase().includes(termoBusca);
        }
        
        return true;
    });
}

// Exibir receitas - OTIMIZADO
function exibirReceitas() {
    if (receitasExibidas === 0) {
        recipesContainer.innerHTML = '';
    }
    
    if (receitasFiltradas.length === 0) {
        mostrarSemResultados();
        return;
    }
    
    // Carregar mais receitas de uma vez no início
    const incremento = carregamentoInicial ? Math.min(RECIPES_PER_LOAD * 2, receitasFiltradas.length) : RECIPES_PER_LOAD;
    const receitasParaMostrar = receitasFiltradas.slice(receitasExibidas, receitasExibidas + incremento);
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    receitasParaMostrar.forEach((receita, indice) => {
        const card = criarCardReceita(receita, indice);
        fragment.appendChild(card);
    });
    
    recipesContainer.appendChild(fragment);
    receitasExibidas += incremento;
    
    // Ocultar indicador de carregamento
    carregandoMais = false;
    autoLoadIndicator.style.display = 'none';
}

function criarCardReceita(receita, indice) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${(indice % 10) * 0.1}s`;
    
    const primeiraCategoria = receita.categoria.split(',')[0].trim();
    const ingredientesPreview = receita.ingrediente.length > 80 ? 
        receita.ingrediente.substring(0, 80) + '...' : receita.ingrediente;
    
    // Verificar se tem URL de imagem
    const temImagem = receita.url && 
        (receita.url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) || 
         receita.url.includes('unsplash') || 
         receita.url.includes('pexels'));
    
    card.innerHTML = `
        <div class="recipe-image-container">
            ${temImagem ? 
                `<img src="${receita.url}" alt="${receita.nome}" class="recipe-image" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-placeholder\\' style=\\'background: linear-gradient(135deg, ${receita.cor}, ${receita.cor}80)\\'><i class=\\'fas fa-utensils\\'></i></div>';">` :
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

// Carregar mais receitas automaticamente - OTIMIZADO
function carregarMaisAutomaticamente() {
    if (carregandoMais || receitasExibidas >= receitasFiltradas.length) return;
    
    carregandoMais = true;
    autoLoadIndicator.style.display = 'flex';
    
    // Usar requestAnimationFrame para melhor performance
    requestAnimationFrame(() => {
        exibirReceitas();
    });
}

// Configurar scroll infinito - OTIMIZADO
function configurarScrollInfinito() {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollPosition = window.innerHeight + window.scrollY;
                const pageHeight = document.documentElement.scrollHeight;
                const threshold = 300; // pixels antes do fim
                
                if (scrollPosition >= pageHeight - threshold) {
                    carregarMaisAutomaticamente();
                }
                
                ticking = false;
            });
            
            ticking = true;
        }
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
            categoriesScroll.scrollBy({ left: -250, behavior: 'smooth' });
        });
        
        scrollRight.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: 250, behavior: 'smooth' });
        });
    }
}

// Busca com debounce para melhor performance
let buscaTimeout;
function executarBusca() {
    clearTimeout(buscaTimeout);
    buscaTimeout = setTimeout(() => {
        receitasFiltradas = filtrarReceitas();
        receitasExibidas = 0;
        exibirReceitas();
        atualizarContador();
    }, 300);
}

// Inicialização OTIMIZADA
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Sabor de Casa...');
    
    // Carregar dados imediatamente
    carregarReceitas();
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', executarBusca);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', executarBusca);
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
