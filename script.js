// Configuração da sua planilha
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// Variáveis globais
let allRecipes = [];
let filteredRecipes = [];
let currentCategory = 'todas';
let isLoading = false;
let isAutoLoading = false;
let displayedRecipes = 0;
const INITIAL_RECIPES = 9;
const AUTO_LOAD_INCREMENT = 6;

// Elementos DOM
const recipesContainer = document.getElementById('recipesContainer');
const categoriesScroll = document.getElementById('categoriesScroll');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const recipesCount = document.getElementById('recipesCount');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');
const reloadBtn = document.getElementById('reloadBtn');
const autoLoadIndicator = document.getElementById('autoLoadIndicator');
const loadingElement = document.getElementById('loading');

// Cores para as imagens das receitas (baseadas na categoria)
const categoryColors = {
    'pratos principais': '#FF6B35',
    'low carb': '#2ECC71',
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

// Função principal para carregar dados
async function loadRecipes() {
    try {
        showLoading();
        console.log('🔄 Carregando receitas do Google Sheets...');
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Planilha vazia ou sem dados');
        }
        
        console.log('✅ Dados recebidos:', data.values.length, 'linhas');
        
        // Processar dados
        allRecipes = processSheetData(data.values);
        
        if (allRecipes.length === 0) {
            throw new Error('Nenhuma receita válida encontrada na planilha');
        }
        
        console.log(`🍳 ${allRecipes.length} receitas processadas`);
        
        // Inicializar
        filteredRecipes = [...allRecipes];
        displayedRecipes = 0;
        
        // Renderizar
        renderCategories();
        renderRecipes();
        updateRecipesCount();
        
        // Configurar scroll infinito
        setupInfiniteScroll();
        
    } catch (error) {
        console.error('❌ Erro ao carregar receitas:', error);
        showError(`Erro ao carregar: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Função para processar dados da planilha
function processSheetData(sheetData) {
    if (!sheetData || sheetData.length < 2) return [];
    
    const headers = sheetData[0].map(h => h.toLowerCase().trim());
    const rows = sheetData.slice(1);
    
    // Mapear índices das colunas
    const colIndices = {
        nome: headers.indexOf('nome'),
        categoria: headers.indexOf('categoria'),
        tempo: headers.indexOf('tempo'),
        ingrediente: headers.indexOf('ingrediente'),
        mododepreparo: headers.indexOf('mododepreparo'),
        url: headers.indexOf('url'),
        mensagem: headers.indexOf('mensagem')
    };
    
    // Processar cada receita
    const recipes = rows.map((row, index) => {
        const recipe = {
            id: index + 1,
            nome: getCellValue(row, colIndices.nome),
            categoria: getCellValue(row, colIndices.categoria),
            tempo: getCellValue(row, colIndices.tempo),
            ingrediente: getCellValue(row, colIndices.ingrediente),
            mododepreparo: getCellValue(row, colIndices.mododepreparo),
            url: getCellValue(row, colIndices.url),
            mensagem: getCellValue(row, colIndices.mensagem)
        };
        
        // Gerar cor baseada na categoria
        const firstCategory = recipe.categoria.toLowerCase().split(',')[0].trim();
        recipe.imageColor = categoryColors[firstCategory] || generateColorFromText(recipe.nome);
        
        return recipe;
    });
    
    // Filtrar receitas válidas
    return recipes.filter(recipe => recipe.nome && recipe.nome.trim());
}

function getCellValue(row, index) {
    return (index !== -1 && row[index]) ? row[index].toString().trim() : '';
}

function generateColorFromText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#FF6B35', '#FF8B5A', '#E55A2B', '#FFB347', '#FF7F50',
        '#2ECC71', '#27AE60', '#3498DB', '#2980B9', '#9B59B6',
        '#8E44AD', '#F39C12', '#E67E22', '#E74C3C', '#C0392B'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// Função para extrair categorias únicas
function getUniqueCategories() {
    const categories = new Set();
    
    allRecipes.forEach(recipe => {
        if (recipe.categoria) {
            recipe.categoria.split(/[,;]/).forEach(cat => {
                const trimmedCat = cat.trim();
                if (trimmedCat) {
                    categories.add(trimmedCat);
                }
            });
        }
    });
    
    return Array.from(categories).sort();
}

// Função para renderizar categorias
function renderCategories() {
    const categories = getUniqueCategories();
    
    // Limpar e criar novo conteúdo
    categoriesScroll.innerHTML = '';
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category.toLowerCase();
        button.textContent = category;
        
        // Adicionar ícone baseado na categoria
        addCategoryIcon(button, category);
        
        button.addEventListener('click', () => {
            // Atualizar categoria ativa
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Filtrar receitas
            currentCategory = category.toLowerCase();
            filteredRecipes = filterRecipesByCategory();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        });
        
        categoriesScroll.appendChild(button);
    });
}

function addCategoryIcon(button, category) {
    const icon = document.createElement('i');
    icon.className = 'fas';
    
    const catLower = category.toLowerCase();
    
    if (catLower.includes('prato')) icon.className += ' fa-utensils';
    else if (catLower.includes('low')) icon.className += ' fa-leaf';
    else if (catLower.includes('doce') || catLower.includes('sobremesa')) icon.className += ' fa-birthday-cake';
    else if (catLower.includes('vegetar')) icon.className += ' fa-seedling';
    else if (catLower.includes('salada')) icon.className += ' fa-apple-alt';
    else if (catLower.includes('massa')) icon.className += ' fa-pizza-slice';
    else if (catLower.includes('carne')) icon.className += ' fa-drumstick-bite';
    else if (catLower.includes('ave') || catLower.includes('frango')) icon.className += ' fa-drumstick-bite';
    else if (catLower.includes('peixe')) icon.className += ' fa-fish';
    else if (catLower.includes('sopa')) icon.className += ' fa-mug-hot';
    else if (catLower.includes('bolo')) icon.className += ' fa-birthday-cake';
    else if (catLower.includes('bebida')) icon.className += ' fa-glass-whiskey';
    else icon.className += ' fa-utensils';
    
    button.prepend(icon);
    button.insertAdjacentText('afterbegin', ' ');
}

// Função para filtrar receitas por categoria
function filterRecipesByCategory() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    return allRecipes.filter(recipe => {
        // Filtrar por categoria
        const categoryMatch = currentCategory === 'todas' || 
            (recipe.categoria && recipe.categoria.toLowerCase().includes(currentCategory));
        
        // Filtrar por termo de pesquisa
        const searchMatch = !searchTerm ||
            (recipe.nome && recipe.nome.toLowerCase().includes(searchTerm)) ||
            (recipe.ingrediente && recipe.ingrediente.toLowerCase().includes(searchTerm)) ||
            (recipe.categoria && recipe.categoria.toLowerCase().includes(searchTerm));
        
        return categoryMatch && searchMatch;
    });
}

// Função para renderizar receitas
function renderRecipes() {
    // Calcular quantas receitas mostrar
    const recipesToShow = Math.min(displayedRecipes + INITIAL_RECIPES, filteredRecipes.length);
    
    // Limpar container apenas se for a primeira renderização
    if (displayedRecipes === 0) {
        recipesContainer.innerHTML = '';
    }
    
    if (filteredRecipes.length === 0) {
        showNoResults();
        return;
    }
    
    // Adicionar novas receitas
    for (let i = displayedRecipes; i < recipesToShow; i++) {
        const recipe = filteredRecipes[i];
        const recipeCard = createRecipeCard(recipe, i);
        recipesContainer.appendChild(recipeCard);
    }
    
    displayedRecipes = recipesToShow;
    
    // Ocultar indicador de carregamento
    autoLoadIndicator.classList.remove('active');
    isAutoLoading = false;
}

// Função para criar card de receita
function createRecipeCard(recipe, index) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.style.transform = 'translateY(20px)';
    
    // Preparar ingredientes para preview
    let ingredientsPreview = 'Ingredientes não informados';
    if (recipe.ingrediente) {
        const ingredients = recipe.ingrediente.split(',').slice(0, 3).map(i => i.trim());
        ingredientsPreview = ingredients.join(', ') + 
            (recipe.ingrediente.split(',').length > 3 ? '...' : '');
    }
    
    // Primeira categoria
    const firstCategory = recipe.categoria ? 
        recipe.categoria.split(/[,;]/)[0].trim() : 'Geral';
    
    card.innerHTML = `
        <div class="recipe-image" style="background: linear-gradient(135deg, ${recipe.imageColor}, ${recipe.imageColor}80)">
            <span class="recipe-category">${firstCategory}</span>
            ${recipe.tempo ? `<span class="recipe-time"><i class="far fa-clock"></i> ${recipe.tempo}</span>` : ''}
        </div>
        <div class="recipe-info">
            <h3 class="recipe-title">${recipe.nome}</h3>
            <p class="recipe-ingredients">${ingredientsPreview}</p>
            <a href="receita.html?id=${recipe.id}" class="recipe-link">
                Ver receita completa <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
    
    return card;
}

// Função para carregar mais receitas automaticamente
function loadMoreRecipes() {
    if (isAutoLoading || displayedRecipes >= filteredRecipes.length) return;
    
    isAutoLoading = true;
    autoLoadIndicator.classList.add('active');
    
    // Simular delay para melhor UX
    setTimeout(() => {
        displayedRecipes += AUTO_LOAD_INCREMENT;
        renderRecipes();
    }, 500);
}

// Função para configurar scroll infinito
function setupInfiniteScroll() {
    let isScrolling;
    
    window.addEventListener('scroll', () => {
        clearTimeout(isScrolling);
        
        isScrolling = setTimeout(() => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;
            const threshold = 100; // pixels antes do fim
            
            if (scrollPosition >= pageHeight - threshold) {
                loadMoreRecipes();
            }
        }, 100);
    });
}

// Função para atualizar contador
function updateRecipesCount() {
    if (recipesCount) {
        recipesCount.textContent = filteredRecipes.length;
    }
}

// Funções de UI
function showLoading() {
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showError(message) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar</h3>
            <p>${message}</p>
            <button id="retryButton" class="action-btn" style="margin-top: 15px;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>
    `;
    
    document.getElementById('retryButton').addEventListener('click', loadRecipes);
}

function showNoResults() {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <h3>Nenhuma receita encontrada</h3>
            <p>Tente outro termo de busca ou selecione uma categoria diferente.</p>
        </div>
    `;
}

// Funções para scroll horizontal
function initCategoryScroll() {
    if (scrollLeft && scrollRight) {
        scrollLeft.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: -150, behavior: 'smooth' });
        });
        
        scrollRight.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: 150, behavior: 'smooth' });
        });
    }
}

// Função para pesquisar
function performSearch() {
    filteredRecipes = filterRecipesByCategory();
    displayedRecipes = 0;
    renderRecipes();
    updateRecipesCount();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Sabor de Casa...');
    
    // Carregar receitas
    loadRecipes();
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            loadRecipes();
        });
    }
    
    // Configurar categoria "Todas"
    const todasBtn = document.querySelector('.category-btn[data-category="todas"]');
    if (todasBtn) {
        todasBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            todasBtn.classList.add('active');
            currentCategory = 'todas';
            filteredRecipes = filterRecipesByCategory();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        });
    }
    
    // Inicializar scroll horizontal
    initCategoryScroll();
    
    // Verificar parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam && searchInput) {
        searchInput.value = searchParam;
        setTimeout(performSearch, 100);
    }
});
