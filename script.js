// Configurações da planilha
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// Estado da aplicação
let todasReceitas = [];
let receitasFiltradas = [];
let categoriaAtual = 'todas';
let receitasExibidas = 0;
const RECIPES_PER_LOAD = 12;
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

// Verificar conexão
function verificarConexao() {
    if (!navigator.onLine) {
        mostrarErro('📡 Sem conexão com a internet<br><small>É preciso dados móveis ou Wi-Fi para carregar as receitas</small>');
        return false;
    }
    return true;
}

// Carregar dados da planilha
async function carregarReceitas() {
    try {
        // Verificar conexão primeiro
        if (!verificarConexao()) return;
        
        mostrarLoading();
        console.log('📥 Carregando receitas...');
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Planilha vazia ou sem dados');
        }
        
        console.log('✅ Dados recebidos:', data.values.length, 'linhas');
        
        // Processar dados
        processarDados(data.values);
        
    } catch (error) {
        console.error('❌ Erro ao carregar receitas:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            mostrarErro('📡 Sem conexão com a internet<br><small>É preciso dados móveis ou Wi-Fi para carregar as receitas</small>');
        } else {
            mostrarErro('Não foi possível carregar as receitas. Verifique sua conexão.');
        }
    }
}

// Processar dados - CORRIGIDO: remover receitas duplicadas
function processarDados(dadosPlanilha) {
    const cabecalhos = dadosPlanilha[0];
    const linhas = dadosPlanilha.slice(1);
    
    // Mapear índices
    const nomeIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('nome'));
    const categoriaIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('categoria'));
    const tempoIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('tempo'));
    const ingredienteIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('ingrediente'));
    const preparoIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('modo') || h.toLowerCase().includes('preparo'));
    const urlIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('url'));
    const mensagemIndex = cabecalhos.findIndex(h => h.toLowerCase().includes('mensagem'));
    
    // Processar linhas da MAIS RECENTE para a MAIS ANTIGA
    // Usar Set para evitar duplicatas
    const nomesVistos = new Set();
    todasReceitas = [];
    
    for (let i = linhas.length - 1; i >= 0; i--) {
        const linha = linhas[i];
        
        const receita = {
            id: i + 1,
            nome: (nomeIndex >= 0 && linha[nomeIndex]) ? linha[nomeIndex].toString().trim() : `Receita ${i + 1}`,
            categoria: (categoriaIndex >= 0 && linha[categoriaIndex]) ? linha[categoriaIndex].toString().trim() : 'Geral',
            tempo: (tempoIndex >= 0 && linha[tempoIndex]) ? linha[tempoIndex].toString().trim() : 'Tempo não informado',
            ingrediente: (ingredienteIndex >= 0 && linha[ingredienteIndex]) ? linha[ingredienteIndex].toString().trim() : '',
            mododepreparo: (preparoIndex >= 0 && linha[preparoIndex]) ? linha[preparoIndex].toString().trim() : '',
            url: (urlIndex >= 0 && linha[urlIndex]) ? linha[urlIndex].toString().trim() : '',
            mensagem: (mensagemIndex >= 0 && linha[mensagemIndex]) ? linha[mensagemIndex].toString().trim() : ''
        };
        
        // Verificar se é duplicada (mesmo nome) e se tem nome válido
        if (receita.nome && receita.nome !== 'Receita' && !nomesVistos.has(receita.nome.toLowerCase())) {
            nomesVistos.add(receita.nome.toLowerCase());
            todasReceitas.push(receita);
        }
    }
    
    console.log(`🍳 ${todasReceitas.length} receitas processadas (sem duplicatas)`);
    
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
}

// Carregar categorias - CORRIGIDO: categorias únicas
function carregarCategorias() {
    // Extrair categorias únicas (sem duplicatas)
    const categoriasSet = new Set();
    
    todasReceitas.forEach(receita => {
        if (receita.categoria && receita.categoria.trim()) {
            // Dividir por vírgula e adicionar cada categoria
            const categorias = receita.categoria.split(',').map(cat => cat.trim());
            categorias.forEach(cat => {
                if (cat) categoriasSet.add(cat);
            });
        }
    });
    
    // Converter para array e ordenar
    const categoriasOrdenadas = Array.from(categoriasSet).sort();
    
    // Limpar e criar categorias
    categoriesScroll.innerHTML = '';
    
    categoriasOrdenadas.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = 'cat-btn';
        botao.textContent = categoria;
        botao.dataset.category = categoria.toLowerCase();
        
        botao.addEventListener('click', () => {
            // Atualizar botão ativo
            document.querySelectorAll('.cat-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            botao.classList.add('active');
            
            // Filtrar receitas
            categoriaAtual = categoria.toLowerCase();
            receitasFiltradas = todasReceitas.filter(receita => 
                receita.categoria.toLowerCase().includes(categoriaAtual)
            );
            receitasExibidas = 0;
            exibirReceitas();
            atualizarContador();
        });
        
        categoriesScroll.appendChild(botao);
    });
    
    // Atualizar botão "Todas"
    const todasBtn = document.querySelector('.cat-btn[data-category="todas"]');
    if (todasBtn) {
        todasBtn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            todasBtn.classList.add('active');
            categoriaAtual = 'todas';
            receitasFiltradas = [...todasReceitas];
            receitasExibidas = 0;
            exibirReceitas();
            atualizarContador();
        });
    }
}

// Exibir receitas
function exibirReceitas() {
    // Calcular quantas receitas mostrar
    const receitasParaMostrar = receitasFiltradas.slice(0, receitasExibidas + RECIPES_PER_LOAD);
    
    // Limpar container se for a primeira página
    if (receitasExibidas === 0) {
        recipesContainer.innerHTML = '';
    }
    
    if (receitasFiltradas.length === 0) {
        mostrarSemResultados();
        return;
    }
    
    // Adicionar receitas
    receitasParaMostrar.forEach((receita, index) => {
        const card = criarCardReceita(receita, index);
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
    card.style.animationDelay = `${(indice % 10) * 0.1}s`;
    
    // Primeira categoria
    const primeiraCategoria = receita.categoria.split(',')[0].trim();
    
    // Preview de ingredientes
    let ingredientesPreview = receita.ingrediente || 'Ingredientes não informados';
    if (ingredientesPreview.length > 100) {
        ingredientesPreview = ingredientesPreview.substring(0, 100) + '...';
    }
    
    // Verificar se URL é imagem
    const temImagem = receita.url && (
        receita.url.includes('.jpg') || 
        receita.url.includes('.jpeg') || 
        receita.url.includes('.png') ||
        receita.url.includes('.gif') ||
        receita.url.includes('http')
    );
    
    card.innerHTML = `
        <div class="recipe-image-container">
            ${temImagem ? 
                `<img src="${receita.url}" alt="${receita.nome}" class="recipe-image" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-utensils\\'></i></div>';">` :
                `<div class="image-placeholder">
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
    
    // Clicar em todo o card abre a receita
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.view-recipe')) {
            window.location.href = `receita.html?id=${receita.id}`;
        }
    });
    
    return card;
}

// Carregar mais automaticamente
function carregarMaisAutomaticamente() {
    if (carregandoMais || receitasExibidas >= receitasFiltradas.length) return;
    
    carregandoMais = true;
    autoLoadIndicator.style.display = 'flex';
    
    setTimeout(() => {
        receitasExibidas += RECIPES_PER_LOAD;
        exibirReceitas();
    }, 500);
}

// Configurar scroll infinito
function configurarScrollInfinito() {
    let timer;
    
    window.addEventListener('scroll', () => {
        clearTimeout(timer);
        
        timer = setTimeout(() => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;
            const threshold = 200;
            
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
            <i class="fas fa-wifi-slash"></i>
            <h3>Sem conexão</h3>
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
            <p>Tente buscar por outro termo ou selecione uma categoria diferente.</p>
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
    const termo = searchInput.value.toLowerCase().trim();
    
    receitasFiltradas = todasReceitas.filter(receita => {
        if (categoriaAtual !== 'todas' && !receita.categoria.toLowerCase().includes(categoriaAtual)) {
            return false;
        }
        
        if (!termo) return true;
        
        return receita.nome.toLowerCase().includes(termo) ||
               receita.ingrediente.toLowerCase().includes(termo) ||
               receita.categoria.toLowerCase().includes(termo);
    });
    
    receitasExibidas = 0;
    exibirReceitas();
    atualizarContador();
}

// Detectar mudanças na conexão
window.addEventListener('online', () => {
    console.log('✅ Conexão restaurada');
    // Tentar recarregar se estava com erro
    if (recipesContainer.querySelector('.no-results i.fa-wifi-slash')) {
        carregarReceitas();
    }
});

window.addEventListener('offline', () => {
    console.log('❌ Conexão perdida');
    if (!todasReceitas.length) {
        mostrarErro('📡 Sem conexão com a internet<br><small>É preciso dados móveis ou Wi-Fi para carregar as receitas</small>');
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Sabor de Casa...');
    
    // Verificar conexão inicial
    if (!navigator.onLine) {
        mostrarErro('📡 Sem conexão com a internet<br><small>É preciso dados móveis ou Wi-Fi para carregar as receitas</small>');
    } else {
        // Carregar receitas
        carregarReceitas();
    }
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', executarBusca);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') executarBusca();
        });
    }
    
    // Configurar scroll horizontal
    configurarScrollHorizontal();
});
