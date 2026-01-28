// CONFIGURAÇÃO DA API
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// ELEMENTOS DOM
const recipesContainer = document.getElementById('recipesContainer');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const categoriesContainer = document.querySelector('.categories-scroll-container');
const loadingIndicator = document.getElementById('loadingIndicator');
const noResults = document.getElementById('noResults');
const clearFilters = document.getElementById('clearFilters');
const totalRecipesSpan = document.getElementById('totalRecipes');
const loadedRecipesSpan = document.getElementById('loadedRecipes');
const scrollLeftBtn = document.querySelector('.scroll-left');
const scrollRightBtn = document.querySelector('.scroll-right');
const toggleFavorites = document.getElementById('toggleFavorites');
const refreshRecipes = document.getElementById('refreshRecipes');

// VARIÁVEIS GLOBAIS
let allRecipes = [];
let filteredRecipes = [];
let categories = new Set();
let currentCategory = 'all';
let currentSearch = '';
let isLoading = false;
let hasMoreRecipes = true;
let recipesPerLoad = 12;
let displayedRecipes = 0;
let showingFavorites = false;
let favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];

// CORES PARA IMAGENS DE RECEITAS
const recipeColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)'
];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    showLoading();
    await loadRecipes();
    setupEventListeners();
    updateStats();
    hideLoading();
}

// CARREGAR RECEITAS DA PLANILHA
async function loadRecipes() {
    try {
        console.log('Carregando receitas da API...');
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Planilha vazia');
        }
        
        // Extrair cabeçalhos
        const headers = data.values[0].map(h => h.trim().toLowerCase());
        
        // Processar cada linha da planilha (começando da linha 2)
        allRecipes = data.values.slice(1).map((row, index) => {
            const recipe = { id: index };
            
            // Mapear cada coluna para o campo correspondente
            headers.forEach((header, colIndex) => {
                const value = row[colIndex] || '';
                
                // Corrigir nomes de campos
                switch(header) {
                    case 'mododepreparo':
                        recipe.modoDePreparo = value;
                        break;
                    case 'url':
                        recipe.url = value;
                        break;
                    default:
                        recipe[header] = value;
                }
            });
            
            return recipe;
        });
        
        // Filtrar receitas vazias
        allRecipes = allRecipes.filter(recipe => 
            recipe.nome && recipe.nome.trim() !== ''
        );
        
        console.log(`${allRecipes.length} receitas carregadas`);
        
        if (allRecipes.length === 0) {
            showNoResults();
            return;
        }
        
        // Extrair categorias
        extractCategories();
        
        // Renderizar categorias
        renderCategories();
        
        // Inicializar receitas filtradas
        filteredRecipes = [...allRecipes];
        
        // Renderizar primeira leva de receitas (de BAIXO para CIMA)
        loadMoreRecipes();
        
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showError('Erro ao carregar receitas. Verifique a conexão.');
    }
}

// EXTRAIR CATEGORIAS
function extractCategories() {
    categories.clear();
    allRecipes.forEach(recipe => {
        if (recipe.categoria && recipe.categoria.trim() !== '') {
            categories.add(recipe.categoria.trim());
        }
    });
    
    console.log('Categorias encontradas:', Array.from(categories));
}

// RENDERIZAR CATEGORIAS
function renderCategories() {
    // Limpar container
    categoriesContainer.innerHTML = '';
    
    // Botão "Todas"
    const allBtn = createCategoryButton('all', 'Todas');
    categoriesContainer.appendChild(allBtn);
    
    // Botões para cada categoria
    Array.from(categories).sort().forEach(category => {
        const btn = createCategoryButton(category, category);
        categoriesContainer.appendChild(btn);
    });
    
    updateScrollControls();
}

function createCategoryButton(category, text) {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.category = category;
    btn.innerHTML = `
        <i class="fas fa-tag"></i>
        <span>${text}</span>
    `;
    
    if (category === currentCategory) {
        btn.classList.add('active');
    }
    
    btn.addEventListener('click', () => filterByCategory(category));
    return btn;
}

// FILTRAR POR CATEGORIA
function filterByCategory(category) {
    // Atualizar botão ativo
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    currentCategory = category;
    resetDisplay();
    
    // Filtrar receitas
    if (category === 'all') {
        filteredRecipes = [...allRecipes];
    } else {
        filteredRecipes = allRecipes.filter(recipe => 
            recipe.categoria && recipe.categoria.toLowerCase() === category.toLowerCase()
        );
    }
    
    // Aplicar busca se houver
    if (currentSearch) {
        applySearchFilter();
    }
    
    // Mostrar favoritos se selecionado
    if (showingFavorites) {
        filteredRecipes = filteredRecipes.filter(recipe => favorites.includes(recipe.id));
    }
    
    // Ordenar de BAIXO para CIMA (mais recentes primeiro)
    filteredRecipes.sort((a, b) => b.id - a.id);
    
    // Resetar contagem
    displayedRecipes = 0;
    hasMoreRecipes = filteredRecipes.length > 0;
    
    // Carregar primeiras receitas
    loadMoreRecipes();
    updateStats();
}

// APLICAR FILTRO DE BUSCA
function applySearchFilter() {
    if (!currentSearch) return;
    
    const searchTerm = currentSearch.toLowerCase();
    filteredRecipes = filteredRecipes.filter(recipe => {
        const searchString = `
            ${recipe.nome || ''}
            ${recipe.ingrediente || ''}
            ${recipe.categoria || ''}
            ${recipe.modoDePreparo || ''}
            ${recipe.mensagem || ''}
        `.toLowerCase();
        
        return searchString.includes(searchTerm);
    });
}

// CARREGAR MAIS RECEITAS (PAGINAÇÃO INFINITA)
function loadMoreRecipes() {
    if (isLoading || !hasMoreRecipes) return;
    
    isLoading = true;
    loadingIndicator.classList.add('show');
    
    // Simular delay para visualização
    setTimeout(() => {
        const startIndex = displayedRecipes;
        const endIndex = Math.min(startIndex + recipesPerLoad, filteredRecipes.length);
        const recipesToShow = filteredRecipes.slice(startIndex, endIndex);
        
        if (recipesToShow.length === 0) {
            if (displayedRecipes === 0) {
                showNoResults();
            }
            hasMoreRecipes = false;
            loadingIndicator.classList.remove('show');
            isLoading = false;
            return;
        }
        
        // Renderizar receitas (adicionando no início para ordem invertida)
        recipesToShow.forEach(recipe => {
            const recipeCard = createRecipeCard(recipe);
            recipesContainer.prepend(recipeCard);
        });
        
        displayedRecipes = endIndex;
        hasMoreRecipes = displayedRecipes < filteredRecipes.length;
        
        loadingIndicator.classList.remove('show');
        isLoading = false;
        updateStats();
        
    }, 500);
}

// CRIAR CARD DE RECEITA
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id;
    
    // Cor aleatória para imagem
    const colorIndex = recipe.id % recipeColors.length;
    const bgColor = recipeColors[colorIndex];
    
    // Verificar se é favorita
    const isFavorite = favorites.includes(recipe.id);
    
    // Preparar ingredientes para preview
    let ingredientsPreview = 'Ingredientes não especificados';
    if (recipe.ingrediente) {
        const ingredients = recipe.ingrediente.split(',').slice(0, 3).map(ing => ing.trim());
        ingredientsPreview = ingredients.join(', ') + (recipe.ingrediente.split(',').length > 3 ? '...' : '');
    }
    
    card.innerHTML = `
        <div class="recipe-image" style="background: ${bgColor}">
            ${recipe.tempo ? `
                <div class="recipe-time">
                    <i class="far fa-clock"></i>
                    <span>${recipe.tempo}</span>
                </div>
            ` : ''}
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, ${recipe.id})">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        
        <div class="recipe-content">
            <div class="recipe-category">
                ${recipe.categoria || 'Geral'}
            </div>
            
            <h3 class="recipe-title">
                ${recipe.nome || 'Receita sem nome'}
            </h3>
            
            <p class="recipe-ingredients">
                ${ingredientsPreview}
            </p>
            
            <div class="recipe-footer">
                ${recipe.mensagem ? `
                    <div class="recipe-message" title="${recipe.mensagem}">
                        <i class="fas fa-quote-left"></i>
                        ${recipe.mensagem.length > 40 ? recipe.mensagem.substring(0, 40) + '...' : recipe.mensagem}
                        <i class="fas fa-quote-right"></i>
                    </div>
                ` : '<div class="recipe-message"></div>'}
                
                <a href="receita.html?id=${recipe.id}" class="view-recipe-btn">
                    <i class="fas fa-book-open"></i>
                    Ver Receita
                </a>
            </div>
        </div>
    `;
    
    return card;
}

// TOGGLE FAVORITO
function toggleFavorite(event, recipeId) {
    event.stopPropagation();
    
    const index = favorites.indexOf(recipeId);
    const btn = event.target.closest('.favorite-btn');
    const icon = btn.querySelector('i');
    
    if (index === -1) {
        favorites.push(recipeId);
        btn.classList.add('active');
        icon.classList.remove('far');
        icon.classList.add('fas');
        showNotification('Receita favoritada!');
    } else {
        favorites.splice(index, 1);
        btn.classList.remove('active');
        icon.classList.remove('fas');
        icon.classList.add('far');
        showNotification('Receita removida dos favoritos');
    }
    
    localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
}

// BUSCAR RECEITAS
function searchRecipes() {
    currentSearch = searchInput.value.trim();
    
    if (currentSearch) {
        clearSearch.classList.add('show');
    } else {
        clearSearch.classList.remove('show');
    }
    
    resetDisplay();
    filterByCategory(currentCategory);
}

// LIMPAR BUSCA
function clearSearchInput() {
    searchInput.value = '';
    currentSearch = '';
    clearSearch.classList.remove('show');
    searchRecipes();
}

// RESETAR DISPLAY
function resetDisplay() {
    recipesContainer.innerHTML = '';
    displayedRecipes = 0;
    hasMoreRecipes = true;
    noResults.classList.add('hidden');
}

// MOSTRAR/OCULTAR FAVORITOS
function toggleFavoritesView() {
    showingFavorites = !showingFavorites;
    toggleFavorites.classList.toggle('active', showingFavorites);
    
    resetDisplay();
    filterByCategory(currentCategory);
}

// ATUALIZAR ESTATÍSTICAS
function updateStats() {
    totalRecipesSpan.textContent = allRecipes.length;
    loadedRecipesSpan.textContent = displayedRecipes;
}

// CONTROLES DE SCROLL HORIZONTAL
function setupScrollControls() {
    scrollLeftBtn.addEventListener('click', () => {
        categoriesContainer.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    });
    
    scrollRightBtn.addEventListener('click', () => {
        categoriesContainer.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    });
    
    categoriesContainer.addEventListener('scroll', updateScrollControls);
}

function updateScrollControls() {
    const { scrollLeft, scrollWidth, clientWidth } = categoriesContainer;
    scrollLeftBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
    scrollRightBtn.style.display = scrollLeft < scrollWidth - clientWidth - 10 ? 'flex' : 'none';
}

// SCROLL INFINITO
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMoreRecipes) {
            loadMoreRecipes();
        }
    }, {
        rootMargin: '100px',
        threshold: 0.1
    });
    
    observer.observe(loadingIndicator);
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    // Busca
    searchInput.addEventListener('input', debounce(searchRecipes, 300));
    clearSearch.addEventListener('click', clearSearchInput);
    
    // Filtros
    clearFilters.addEventListener('click', () => {
        currentSearch = '';
        searchInput.value = '';
        clearSearch.classList.remove('show');
        showingFavorites = false;
        toggleFavorites.classList.remove('active');
        filterByCategory('all');
    });
    
    // Botões
    toggleFavorites.addEventListener('click', toggleFavoritesView);
    refreshRecipes.addEventListener('click', () => {
        showLoading();
        loadRecipes();
    });
    
    // Scroll infinito
    setupInfiniteScroll();
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentSearch) {
            clearSearchInput();
        }
        if (e.key === '/' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// UTILITÁRIOS
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    recipesContainer.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Carregando receitas deliciosas...</p>
        </div>
    `;
}

function hideLoading() {
    const loading = document.querySelector('.loading-state');
    if (loading) {
        loading.remove();
    }
}

function showNoResults() {
    noResults.classList.remove('hidden');
    recipesContainer.innerHTML = '';
}

function showError(message) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle fa-3x"></i>
            <h3>${message}</h3>
            <button onclick="location.reload()" class="btn-primary">
                <i class="fas fa-redo"></i>
                Tentar Novamente
            </button>
        </div>
    `;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
        animation-fill-mode: forwards;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Adicionar estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .favorite-btn {
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(255,255,255,0.9);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #94a3b8;
        font-size: 1.2rem;
        z-index: 1;
    }
    
    .favorite-btn:hover {
        background: white;
        transform: scale(1.1);
    }
    
    .favorite-btn.active {
        color: #f5576c;
    }
`;
document.head.appendChild(style);
