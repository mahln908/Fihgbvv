// Configuração da API do Google Sheets
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const SHEET_NAME_ENCODED = encodeURIComponent(SHEET_NAME);
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME_ENCODED}?key=${API_KEY}`;

// Configuração do Unsplash para imagens (fallback)
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Adicione sua chave se quiser
const FOOD_CATEGORIES = ['food', 'cooking', 'restaurant', 'meal', 'dish', 'cuisine'];

// Elementos DOM
const recipesContainer = document.getElementById('recipes-container');
const categoriesContainer = document.getElementById('categories-container');
const searchInput = document.querySelector('.search-input');
const aboutModal = document.getElementById('about-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');
const favoritesBtn = document.getElementById('favorites-btn');
const aboutBtn = document.getElementById('about-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const resultsCount = document.getElementById('results-count');
const scrollLeft = document.getElementById('scroll-left');
const scrollRight = document.getElementById('scroll-right');

// Variáveis globais
let allRecipes = [];
let categories = [];
let filteredRecipes = [];
let favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];
let currentPage = 1;
const recipesPerPage = 9;
let isFiltered = false;
let currentCategory = 'all';
let currentSearch = '';

// Inicialização
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await loadRecipes();
    setupEventListeners();
    updateResultsCount();
}

// Função para carregar dados do Google Sheets
async function loadRecipes() {
    try {
        showLoading();
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Verificar se há dados
        if (!data.values || data.values.length === 0) {
            showNoResults('Nenhuma receita encontrada na planilha.');
            return;
        }
        
        // Extrair cabeçalhos da primeira linha
        const headers = data.values[0].map(header => 
            header.trim().toLowerCase().replace(/\s+/g, '')
        );
        
        // Converter linhas em objetos de receita
        allRecipes = data.values.slice(1).map((row, index) => {
            const recipe = { 
                id: index,
                image: null 
            };
            
            // Mapear cada coluna para sua propriedade correspondente
            headers.forEach((header, colIndex) => {
                const value = row[colIndex] || '';
                switch(header) {
                    case 'mododepreparo':
                        recipe.modoDePreparo = value;
                        break;
                    case 'url':
                        recipe.url = value;
                        // Tentar extrair imagem da URL se for do YouTube
                        if (value.includes('youtube.com') || value.includes('youtu.be')) {
                            recipe.image = getYouTubeThumbnail(value);
                        }
                        break;
                    default:
                        recipe[header] = value;
                }
            });
            
            // Gerar imagem de fallback baseada no nome da receita
            if (!recipe.image) {
                recipe.image = getRecipeImage(recipe.nome, index);
            }
            
            return recipe;
        });
        
        // Filtrar receitas vazias
        allRecipes = allRecipes.filter(recipe => recipe.nome && recipe.nome.trim() !== '');
        
        if (allRecipes.length === 0) {
            showNoResults('Nenhuma receita válida encontrada.');
            return;
        }
        
        // Extrair categorias únicas
        extractCategories();
        
        // Inicializar receitas filtradas
        filteredRecipes = [...allRecipes];
        
        // Renderizar categorias
        renderCategories();
        
        // Renderizar primeira página de receitas
        renderRecipesPage();
        
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showNoResults('Erro ao carregar receitas. Verifique sua conexão com a internet.');
    }
}

// Função para gerar imagem da receita
function getRecipeImage(recipeName, index) {
    // Se quiser usar Unsplash, substitua esta função
    // Por enquanto, usaremos cores e ícones
    const colors = [
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    ];
    
    const icons = [
        'fas fa-utensils',
        'fas fa-pizza-slice',
        'fas fa-hamburger',
        'fas fa-cheese',
        'fas fa-bread-slice',
        'fas fa-drumstick-bite',
        'fas fa-fish',
        'fas fa-egg',
        'fas fa-ice-cream',
        'fas fa-cookie-bite',
        'fas fa-cake-candles',
        'fas fa-mug-hot'
    ];
    
    const colorIndex = index % colors.length;
    const iconIndex = index % icons.length;
    
    return {
        background: colors[colorIndex],
        icon: icons[iconIndex]
    };
}

// Função para extrair thumbnail do YouTube
function getYouTubeThumbnail(url) {
    try {
        let videoId = '';
        
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        
        if (videoId) {
            return {
                backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`,
                icon: 'fab fa-youtube'
            };
        }
    } catch (e) {
        console.log('Não foi possível extrair thumbnail do YouTube:', e);
    }
    
    return null;
}

// Extrair categorias únicas
function extractCategories() {
    const allCategories = allRecipes
        .map(recipe => recipe.categoria)
        .filter(Boolean)
        .map(cat => cat.trim());
    
    categories = ['all', ...new Set(allCategories)].filter(cat => cat && cat !== '');
}

// Renderizar categorias com scroll horizontal
function renderCategories() {
    categoriesContainer.innerHTML = '';
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        
        if (category === 'all') {
            button.classList.add('active');
            button.textContent = 'Todas';
            button.dataset.category = 'all';
        } else {
            button.textContent = category;
            button.dataset.category = category;
        }
        
        button.addEventListener('click', filterByCategory);
        categoriesContainer.appendChild(button);
    });
}

// Funções para controlar scroll horizontal
function setupScrollControls() {
    scrollLeft.addEventListener('click', () => {
        categoriesContainer.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    });
    
    scrollRight.addEventListener('click', () => {
        categoriesContainer.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    });
    
    // Mostrar/ocultar setas baseado na posição do scroll
    categoriesContainer.addEventListener('scroll', updateScrollIndicators);
    
    // Atualizar inicialmente
    updateScrollIndicators();
}

function updateScrollIndicators() {
    const container = categoriesContainer;
    const scrollLeftVisible = container.scrollLeft > 0;
    const scrollRightVisible = container.scrollLeft < (container.scrollWidth - container.clientWidth);
    
    scrollLeft.style.display = scrollLeftVisible ? 'flex' : 'none';
    scrollRight.style.display = scrollRightVisible ? 'flex' : 'none';
}

// Filtrar por categoria
function filterByCategory(e) {
    // Atualizar botões ativos
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    currentCategory = e.target.dataset.category;
    currentPage = 1;
    isFiltered = true;
    
    // Filtrar receitas
    if (currentCategory === 'all') {
        filteredRecipes = [...allRecipes];
    } else {
        filteredRecipes = allRecipes.filter(recipe => 
            recipe.categoria && 
            recipe.categoria.toLowerCase() === currentCategory.toLowerCase()
        );
    }
    
    // Aplicar filtro de busca também, se houver
    if (currentSearch) {
        applySearchFilter();
    }
    
    // Renderizar receitas filtradas
    renderRecipesPage();
    updateResultsCount();
}

// Aplicar filtro de busca
function applySearchFilter() {
    if (!currentSearch) return;
    
    const searchTerm = currentSearch.toLowerCase();
    
    filteredRecipes = filteredRecipes.filter(recipe => {
        const searchableText = [
            recipe.nome,
            recipe.ingrediente,
            recipe.categoria,
            recipe.modoDePreparo,
            recipe.mensagem
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchTerm);
    });
}

// Filtrar por busca
function filterBySearch() {
    currentSearch = searchInput.value.trim().toLowerCase();
    currentPage = 1;
    isFiltered = true;
    
    // Resetar para todas as categorias se estiver filtrando
    if (currentSearch) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'all') {
                btn.classList.add('active');
            }
        });
        currentCategory = 'all';
        filteredRecipes = [...allRecipes];
    } else {
        // Se a busca estiver vazia, voltar ao filtro de categoria atual
        if (currentCategory !== 'all') {
            filteredRecipes = allRecipes.filter(recipe => 
                recipe.categoria && 
                recipe.categoria.toLowerCase() === currentCategory.toLowerCase()
            );
        } else {
            filteredRecipes = [...allRecipes];
        }
    }
    
    // Aplicar filtro de busca
    if (currentSearch) {
        applySearchFilter();
    }
    
    renderRecipesPage();
    updateResultsCount();
}

// Renderizar página de receitas
function renderRecipesPage() {
    recipesContainer.innerHTML = '';
    
    if (filteredRecipes.length === 0) {
        showNoResults('Nenhuma receita encontrada com os filtros atuais.');
        loadMoreContainer.classList.add('hidden');
        return;
    }
    
    // Ordenar receitas para carregar de baixo para cima (últimas primeiro)
    const recipesToShow = [...filteredRecipes].reverse();
    
    // Calcular índices para paginação
    const startIndex = (currentPage - 1) * recipesPerPage;
    const endIndex = startIndex + recipesPerPage;
    const pageRecipes = recipesToShow.slice(startIndex, endIndex);
    
    pageRecipes.forEach((recipe, index) => {
        const card = createRecipeCard(recipe, startIndex + index);
        recipesContainer.appendChild(card);
    });
    
    // Mostrar/ocultar botão "Carregar Mais"
    if (endIndex < recipesToShow.length) {
        loadMoreContainer.classList.remove('hidden');
    } else {
        loadMoreContainer.classList.add('hidden');
    }
}

// Criar card de receita
function createRecipeCard(recipe, index) {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id;
    
    // Verificar se a receita está favoritada
    const isFavorite = favorites.includes(recipe.id);
    
    // Preparar ingredientes para preview
    let ingredientsPreview = 'Ingredientes não especificados';
    if (recipe.ingrediente) {
        const ingredients = recipe.ingrediente.split(',').slice(0, 4).join(', ');
        ingredientsPreview = ingredients.length > 100 ? ingredients.substring(0, 100) + '...' : ingredients;
    }
    
    // Preparar mensagem para preview
    let messagePreview = '';
    if (recipe.mensagem) {
        messagePreview = recipe.mensagem.length > 40 ? 
            recipe.mensagem.substring(0, 40) + '...' : 
            recipe.mensagem;
    }
    
    // Configurar imagem
    let imageStyle = '';
    let iconClass = '';
    
    if (recipe.image) {
        if (typeof recipe.image === 'object') {
            if (recipe.image.backgroundImage) {
                imageStyle = `background: ${recipe.image.backgroundImage}; background-size: cover;`;
            } else if (recipe.image.background) {
                imageStyle = `background: ${recipe.image.background};`;
            }
            iconClass = recipe.image.icon || 'fas fa-utensils';
        } else {
            imageStyle = `background: ${recipe.image};`;
            iconClass = 'fas fa-utensils';
        }
    }
    
    card.innerHTML = `
        <div class="recipe-image" style="${imageStyle}">
            ${!recipe.image || typeof recipe.image !== 'object' || !recipe.image.backgroundImage ? 
                `<div class="image-placeholder">
                    <i class="${iconClass}"></i>
                </div>` : ''
            }
            ${recipe.tempo ? `<div class="recipe-time"><i class="far fa-clock"></i> ${recipe.tempo}</div>` : ''}
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-recipe-id="${recipe.id}">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        <div class="recipe-content">
            <div class="recipe-category">${recipe.categoria || 'Geral'}</div>
            <h3 class="recipe-title">${recipe.nome || 'Receita sem nome'}</h3>
            <p class="recipe-ingredients">${ingredientsPreview}</p>
            <div class="recipe-footer">
                <div class="recipe-message" title="${recipe.mensagem || ''}">
                    ${messagePreview ? `"${messagePreview}"` : ''}
                </div>
                <a href="recipe.html?id=${recipe.id}" class="recipe-link" data-recipe-id="${recipe.id}">
                    <i class="fas fa-book-open"></i> Ver Receita
                </a>
            </div>
        </div>
    `;
    
    // Adicionar estilos para o placeholder da imagem
    const style = document.createElement('style');
    style.textContent = `
        .image-placeholder {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 3rem;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
    `;
    document.head.appendChild(style);
    
    // Adicionar eventos
    const favoriteButton = card.querySelector('.favorite-btn');
    favoriteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(recipe.id);
    });
    
    return card;
}

// Alternar favorito
function toggleFavorite(recipeId) {
    const index = favorites.indexOf(recipeId);
    
    if (index === -1) {
        // Adicionar aos favoritos
        favorites.push(recipeId);
        showNotification('Receita adicionada aos favoritos!');
    } else {
        // Remover dos favoritos
        favorites.splice(index, 1);
        showNotification('Receita removida dos favoritos!');
    }
    
    // Atualizar localStorage
    localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
    
    // Atualizar botão no card
    const favoriteBtn = document.querySelector(`.favorite-btn[data-recipe-id="${recipeId}"]`);
    const favoriteIcon = favoriteBtn.querySelector('i');
    
    favoriteBtn.classList.toggle('active');
    favoriteIcon.classList.toggle('far');
    favoriteIcon.classList.toggle('fas');
}

// Carregar mais receitas
function loadMoreRecipes() {
    currentPage++;
    renderRecipesPage();
}

// Atualizar contador de resultados
function updateResultsCount() {
    const total = filteredRecipes.length;
    const showing = Math.min(currentPage * recipesPerPage, total);
    
    if (total === 0) {
        resultsCount.textContent = 'Nenhuma receita encontrada';
    } else {
        resultsCount.textContent = `Mostrando ${showing} de ${total} receitas`;
    }
}

// Mostrar loading
function showLoading() {
    recipesContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Carregando receitas...</span>
        </div>
    `;
}

// Mostrar sem resultados
function showNoResults(message) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <h3>${message}</h3>
            <p>Tente ajustar sua busca ou filtrar por outra categoria.</p>
        </div>
    `;
    loadMoreContainer.classList.add('hidden');
}

// Mostrar notificação
function showNotification(message) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Estilos para a notificação
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 15px 25px;
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            z-index: 3000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            animation-fill-mode: forwards;
            max-width: 300px;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Configurar event listeners
function setupEventListeners() {
    // Busca
    searchInput.addEventListener('input', debounce(filterBySearch, 300));
    
    // Botões de ação
    favoritesBtn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'all') {
                btn.classList.add('active');
            }
        });
        
        currentCategory = 'all';
        filteredRecipes = allRecipes.filter(recipe => favorites.includes(recipe.id));
        currentPage = 1;
        renderRecipesPage();
        updateResultsCount();
        
        if (filteredRecipes.length === 0) {
            showNoResults('Nenhuma receita favoritada ainda.');
        }
    });
    
    aboutBtn.addEventListener('click', () => {
        aboutModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Tecla ESC para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal.style.display === 'block') {
            aboutModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Carregar mais receitas
    loadMoreBtn.addEventListener('click', loadMoreRecipes);
    
    // Scroll horizontal das categorias
    setupScrollControls();
}

// Função debounce para busca
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
