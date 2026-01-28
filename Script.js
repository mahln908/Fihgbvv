// Configuração da API do Google Sheets
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas%20Sabor%20de%20Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;

// Elementos DOM
const recipesContainer = document.querySelector('.recipes-container');
const categoriesContainer = document.querySelector('.categories-container');
const searchInput = document.querySelector('.search-input');
const recipeModal = document.getElementById('recipe-modal');
const aboutModal = document.getElementById('about-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');
const favoritesBtn = document.getElementById('favorites-btn');
const aboutBtn = document.getElementById('about-btn');

// Variáveis globais
let allRecipes = [];
let categories = [];
let filteredRecipes = [];
let favorites = JSON.parse(localStorage.getItem('recipeFavorites')) || [];

// Cores para imagens de placeholder
const placeholderColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

// Função para carregar dados do Google Sheets
async function loadRecipes() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Verificar se há dados
        if (!data.values || data.values.length === 0) {
            showNoResults('Nenhuma receita encontrada na planilha.');
            return;
        }
        
        // Extrair cabeçalhos da primeira linha
        const headers = data.values[0].map(header => header.trim().toLowerCase());
        
        // Converter linhas em objetos de receita
        allRecipes = data.values.slice(1).map((row, index) => {
            const recipe = { id: index };
            
            // Mapear cada coluna para sua propriedade correspondente
            headers.forEach((header, colIndex) => {
                // Normalizar nomes das propriedades
                if (header === 'mododepreparo') {
                    recipe['modoDePreparo'] = row[colIndex] || '';
                } else {
                    recipe[header] = row[colIndex] || '';
                }
            });
            
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
        
        // Renderizar receitas
        renderRecipes();
        
        // Renderizar categorias
        renderCategories();
        
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showNoResults('Erro ao carregar receitas. Verifique sua conexão com a internet.');
    }
}

// Função para mostrar mensagem de erro/sem resultados
function showNoResults(message) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-utensils"></i>
            <h3>${message}</h3>
            <p>Tente recarregar a página.</p>
        </div>
    `;
}

// Extrair categorias únicas
function extractCategories() {
    const allCategories = allRecipes.map(recipe => recipe.categoria).filter(Boolean);
    categories = ['all', ...new Set(allCategories)].filter(cat => cat && cat.trim() !== '');
}

// Renderizar categorias
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

// Renderizar receitas
function renderRecipes() {
    recipesContainer.innerHTML = '';
    
    if (filteredRecipes.length === 0) {
        recipesContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Nenhuma receita encontrada</h3>
                <p>Tente ajustar sua busca ou filtrar por outra categoria.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar receitas para carregar de baixo para cima (últimas primeiro)
    const recipesToShow = [...filteredRecipes].reverse();
    
    recipesToShow.forEach((recipe, index) => {
        const card = createRecipeCard(recipe, index);
        recipesContainer.appendChild(card);
    });
}

// Criar card de receita
function createRecipeCard(recipe, index) {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id;
    
    // Verificar se a receita está favoritada
    const isFavorite = favorites.includes(recipe.id);
    
    // Cor de placeholder baseada no índice
    const colorIndex = index % placeholderColors.length;
    const placeholderColor = placeholderColors[colorIndex];
    
    // Preparar ingredientes para preview
    let ingredientsPreview = 'Ingredientes não especificados';
    if (recipe.ingrediente) {
        const ingredients = recipe.ingrediente.split(',').slice(0, 3).join(', ');
        ingredientsPreview = ingredients.length > 80 ? ingredients.substring(0, 80) + '...' : ingredients;
    }
    
    // Preparar mensagem para preview
    let messagePreview = '';
    if (recipe.mensagem) {
        messagePreview = recipe.mensagem.length > 40 ? 
            recipe.mensagem.substring(0, 40) + '...' : 
            recipe.mensagem;
    }
    
    card.innerHTML = `
        <div class="recipe-image" style="background-color: ${placeholderColor};">
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
                <button class="recipe-link" data-recipe-id="${recipe.id}">
                    <i class="fas fa-book-open"></i> Ver Receita
                </button>
            </div>
        </div>
    `;
    
    // Adicionar eventos
    const viewButton = card.querySelector('.recipe-link');
    viewButton.addEventListener('click', () => openRecipeModal(recipe));
    
    const favoriteButton = card.querySelector('.favorite-btn');
    favoriteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(recipe.id);
    });
    
    return card;
}

// Abrir modal de receita
function openRecipeModal(recipe) {
    // Preencher dados da receita no modal
    document.querySelector('.modal-category').textContent = recipe.categoria || 'Geral';
    document.querySelector('.modal-title').textContent = recipe.nome || 'Receita sem nome';
    document.querySelector('.time-text').textContent = recipe.tempo || 'Não especificado';
    
    // Preencher ingredientes
    const ingredientsList = document.querySelector('.ingredients-list');
    ingredientsList.innerHTML = '';
    
    if (recipe.ingrediente) {
        const ingredients = recipe.ingrediente.split(',')
            .map(ing => ing.trim())
            .filter(ing => ing !== '');
        
        if (ingredients.length > 0) {
            ingredients.forEach(ingredient => {
                const li = document.createElement('li');
                li.textContent = ingredient;
                ingredientsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Ingredientes não especificados';
            ingredientsList.appendChild(li);
        }
    } else {
        const li = document.createElement('li');
        li.textContent = 'Ingredientes não especificados';
        ingredientsList.appendChild(li);
    }
    
    // Preencher modo de preparo
    const preparationSteps = document.querySelector('.preparation-steps');
    if (recipe.modoDePreparo && recipe.modoDePreparo.trim() !== '') {
        // Substituir quebras de linha
        const formattedSteps = recipe.modoDePreparo
            .split('\n')
            .filter(step => step.trim() !== '')
            .map(step => `<p>${step.trim()}</p>`)
            .join('');
        
        preparationSteps.innerHTML = formattedSteps;
    } else {
        preparationSteps.innerHTML = '<p>Modo de preparo não especificado.</p>';
    }
    
    // Preencher mensagem
    const modalMessage = document.querySelector('.modal-message');
    if (recipe.mensagem && recipe.mensagem.trim() !== '') {
        modalMessage.textContent = recipe.mensagem;
        modalMessage.style.display = 'block';
    } else {
        modalMessage.style.display = 'none';
    }
    
    // Preencher URL
    const urlLink = document.querySelector('.modal-url');
    if (recipe.url && recipe.url.trim() !== '' && recipe.url.startsWith('http')) {
        urlLink.href = recipe.url;
        urlLink.style.display = 'flex';
    } else {
        urlLink.style.display = 'none';
    }
    
    // Mostrar modal
    recipeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Fechar modal
function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Alternar favorito
function toggleFavorite(recipeId) {
    const index = favorites.indexOf(recipeId);
    
    if (index === -1) {
        // Adicionar aos favoritos
        favorites.push(recipeId);
    } else {
        // Remover dos favoritos
        favorites.splice(index, 1);
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

// Filtrar por categoria
function filterByCategory(e) {
    // Atualizar botões ativos
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    const category = e.target.dataset.category;
    
    // Filtrar receitas
    if (category === 'all') {
        filteredRecipes = [...allRecipes];
    } else {
        filteredRecipes = allRecipes.filter(recipe => 
            recipe.categoria && recipe.categoria.toLowerCase() === category.toLowerCase()
        );
    }
    
    // Aplicar filtro de busca também, se houver
    applySearchFilter();
    
    // Renderizar receitas filtradas
    renderRecipes();
}

// Aplicar filtro de busca
function applySearchFilter() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) return;
    
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
    // Resetar para todas as categorias
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'all') {
            btn.classList.add('active');
        }
    });
    
    // Filtrar todas as receitas com base no termo de busca
    filteredRecipes = [...allRecipes];
    applySearchFilter();
    renderRecipes();
}

// Event Listeners
searchInput.addEventListener('input', filterBySearch);

// Fechar modais
closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const modal = this.closest('.recipe-modal, .about-modal');
        closeModal(modal);
    });
});

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
        closeModal(recipeModal);
    }
    if (e.target === aboutModal) {
        closeModal(aboutModal);
    }
});

// Botões de ação
favoritesBtn.addEventListener('click', () => {
    // Filtrar apenas favoritos
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    filteredRecipes = allRecipes.filter(recipe => favorites.includes(recipe.id));
    
    if (filteredRecipes.length === 0) {
        showNoResults('Nenhuma receita favoritada ainda.');
    } else {
        renderRecipes();
    }
});

aboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
});

// Tecla ESC para fechar modais
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (recipeModal.style.display === 'block') {
            closeModal(recipeModal);
        }
        if (aboutModal.style.display === 'block') {
            closeModal(aboutModal);
        }
    }
});

// Estilo para botão de favorito
const style = document.createElement('style');
style.textContent = `
    .favorite-btn {
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 1.2rem;
        color: #7f8c8d;
    }
    
    .favorite-btn:hover {
        background: white;
        transform: scale(1.1);
    }
    
    .favorite-btn.active {
        color: #e74c3c;
    }
`;
document.head.appendChild(style);

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', loadRecipes);
