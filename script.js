// Configurações
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc/values/Receitas%20Sabor%20de%20Casa?key=AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc`;

// Variáveis globais
let allRecipes = [];
let filteredRecipes = [];
let currentCategory = 'todas';
let currentSearch = '';
let displayCount = 9;
let categories = [];

// Elementos DOM
const recipesContainer = document.getElementById('recipes-container');
const loadingElement = document.getElementById('loading');
const noRecipesElement = document.getElementById('no-recipes');
const recipesCounter = document.getElementById('recipes-counter');
const recipesCount = document.getElementById('recipes-count');
const categoriesContainer = document.getElementById('categories-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const themeToggle = document.getElementById('theme-toggle');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadRecipes();
    setupEventListeners();
});

// Carregar receitas da API
async function loadRecipes() {
    try {
        const response = await fetch(SHEET_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length <= 1) {
            throw new Error('Planilha vazia ou formato inválido');
        }
        
        // Converter dados da planilha em objetos de receita
        processSheetData(data.values);
        
        // Inicializar categorias
        initCategories();
        
        // Renderizar receitas
        renderRecipes();
        
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showError('Erro ao carregar receitas. Verifique a conexão ou a API.');
    }
}

// Processar dados da planilha
function processSheetData(sheetData) {
    // A primeira linha contém os cabeçalhos
    const headers = sheetData[0].map(header => header.toLowerCase());
    
    // Converter cada linha em um objeto de receita
    allRecipes = sheetData.slice(1).map((row, index) => {
        const recipe = {};
        
        headers.forEach((header, i) => {
            // Garantir que temos um valor (string vazia se não)
            recipe[header] = row[i] || '';
        });
        
        // Adicionar um ID único para cada receita
        recipe.id = index + 1;
        
        return recipe;
    });
    
    // Inverter a ordem para carregar de baixo para cima
    allRecipes.reverse();
    
    filteredRecipes = [...allRecipes];
}

// Inicializar categorias
function initCategories() {
    // Extrair todas as categorias únicas
    const categorySet = new Set();
    
    allRecipes.forEach(recipe => {
        if (recipe.categoria && recipe.categoria.trim() !== '') {
            // Separar múltiplas categorias (se houver vírgulas)
            const cats = recipe.categoria.split(',').map(cat => cat.trim());
            cats.forEach(cat => categorySet.add(cat));
        }
    });
    
    // Converter Set para array e ordenar
    categories = Array.from(categorySet).sort();
    
    // Renderizar botões de categoria
    renderCategories();
}

// Renderizar categorias
function renderCategories() {
    categoriesContainer.innerHTML = '';
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category;
        button.innerHTML = `
            <i class="fas fa-tag"></i>
            <span>${category}</span>
        `;
        
        button.addEventListener('click', () => {
            setActiveCategory(category);
        });
        
        categoriesContainer.appendChild(button);
    });
}

// Definir categoria ativa
function setActiveCategory(category) {
    currentCategory = category;
    
    // Atualizar botões de categoria
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else if (btn.dataset.category === 'todas' && category === 'todas') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Filtrar receitas
    filterRecipes();
}

// Filtrar receitas
function filterRecipes() {
    // Filtrar por categoria
    if (currentCategory === 'todas') {
        filteredRecipes = [...allRecipes];
    } else {
        filteredRecipes = allRecipes.filter(recipe => {
            return recipe.categoria && 
                   recipe.categoria.toLowerCase().includes(currentCategory.toLowerCase());
        });
    }
    
    // Filtrar por busca
    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase().trim();
        filteredRecipes = filteredRecipes.filter(recipe => {
            return (
                (recipe.nome && recipe.nome.toLowerCase().includes(searchTerm)) ||
                (recipe.categoria && recipe.categoria.toLowerCase().includes(searchTerm)) ||
                (recipe.ingrediente && recipe.ingrediente.toLowerCase().includes(searchTerm)) ||
                (recipe.mensagem && recipe.mensagem.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    // Resetar contador de exibição
    displayCount = 9;
    
    // Renderizar receitas filtradas
    renderRecipes();
}

// Renderizar receitas
function renderRecipes() {
    // Esconder loading
    loadingElement.style.display = 'none';
    
    // Verificar se há receitas
    if (filteredRecipes.length === 0) {
        noRecipesElement.style.display = 'block';
        recipesContainer.innerHTML = '';
        recipesCounter.style.display = 'none';
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    // Mostrar contador de receitas
    recipesCount.textContent = filteredRecipes.length;
    recipesCounter.style.display = 'block';
    
    // Mostrar receitas encontradas
    noRecipesElement.style.display = 'none';
    
    // Determinar receitas a mostrar
    const recipesToShow = filteredRecipes.slice(0, displayCount);
    
    // Limpar container
    recipesContainer.innerHTML = '';
    
    // Renderizar cada receita (de baixo para cima)
    recipesToShow.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipesContainer.appendChild(recipeCard);
    });
    
    // Mostrar botão "Carregar mais" se houver mais receitas
    if (filteredRecipes.length > displayCount) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// Criar card de receita
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // Truncar ingredientes para exibição
    const ingredientsPreview = recipe.ingrediente ? 
        (recipe.ingrediente.length > 100 ? 
         recipe.ingrediente.substring(0, 100) + '...' : 
         recipe.ingrediente) : 
        'Ingredientes não disponíveis';
    
    // Determinar ícone baseado na categoria
    let icon = 'fa-utensils';
    if (recipe.categoria) {
        if (recipe.categoria.toLowerCase().includes('bebida') || 
            recipe.categoria.toLowerCase().includes('drink')) {
            icon = 'fa-glass-martini-alt';
        } else if (recipe.categoria.toLowerCase().includes('sobremesa') || 
                   recipe.categoria.toLowerCase().includes('doce')) {
            icon = 'fa-ice-cream';
        } else if (recipe.categoria.toLowerCase().includes('salada')) {
            icon = 'fa-leaf';
        } else if (recipe.categoria.toLowerCase().includes('carne')) {
            icon = 'fa-drumstick-bite';
        } else if (recipe.categoria.toLowerCase().includes('vegetariana') || 
                   recipe.categoria.toLowerCase().includes('vegana')) {
            icon = 'fa-seedling';
        }
    }
    
    card.innerHTML = `
        <div class="recipe-image">
            <i class="fas ${icon}"></i>
        </div>
        <div class="recipe-content">
            <h3 class="recipe-title">${recipe.nome || 'Receita sem nome'}</h3>
            <div class="recipe-meta">
                <span class="recipe-category">${recipe.categoria || 'Sem categoria'}</span>
                <span class="recipe-time">
                    <i class="far fa-clock"></i>
                    ${recipe.tempo || 'Não especificado'}
                </span>
            </div>
            <div class="recipe-ingredients">
                <h4>Ingredientes:</h4>
                <p>${ingredientsPreview}</p>
            </div>
            <div class="recipe-actions">
                <button class="view-recipe-btn" data-id="${recipe.id}">
                    <i class="fas fa-book-open"></i>
                    Ver Receita
                </button>
                <button class="save-recipe-btn" title="Salvar receita">
                    <i class="far fa-bookmark"></i>
                </button>
            </div>
        </div>
    `;
    
    // Adicionar evento ao botão "Ver Receita"
    const viewButton = card.querySelector('.view-recipe-btn');
    viewButton.addEventListener('click', () => {
        viewRecipe(recipe.id);
    });
    
    // Adicionar evento ao botão "Salvar"
    const saveButton = card.querySelector('.save-recipe-btn');
    saveButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSaveRecipe(recipe.id, saveButton);
    });
    
    return card;
}

// Visualizar receita completa
function viewRecipe(recipeId) {
    // Salvar ID da receita no localStorage para a página de receita
    localStorage.setItem('selectedRecipeId', recipeId);
    
    // Redirecionar para a página de receita
    window.location.href = 'receita.html';
}

// Alternar salvar receita
function toggleSaveRecipe(recipeId, button) {
    const icon = button.querySelector('i');
    
    if (icon.classList.contains('far')) {
        // Salvar
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.title = 'Remover dos salvos';
        
        // Salvar no localStorage
        saveToLocalStorage(recipeId, true);
    } else {
        // Remover
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.title = 'Salvar receita';
        
        // Remover do localStorage
        saveToLocalStorage(recipeId, false);
    }
}

// Salvar/remover receita no localStorage
function saveToLocalStorage(recipeId, save) {
    let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
    
    if (save) {
        if (!savedRecipes.includes(recipeId)) {
            savedRecipes.push(recipeId);
        }
    } else {
        savedRecipes = savedRecipes.filter(id => id !== recipeId);
    }
    
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Busca
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        
        // Mostrar/ocultar botão de limpar busca
        if (currentSearch.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        // Filtrar receitas
        filterRecipes();
    });
    
    // Limpar busca
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.style.display = 'none';
        filterRecipes();
    });
    
    // Alternar tema
    themeToggle.addEventListener('click', toggleTheme);
    
    // Carregar mais receitas
    loadMoreBtn.addEventListener('click', () => {
        displayCount += 9;
        renderRecipes();
    });
}

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Atualizar ícone do botão
    const icon = themeToggle.querySelector('i');
    if (savedTheme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Alternar tema claro/escuro
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Atualizar ícone do botão
    const icon = themeToggle.querySelector('i');
    if (newTheme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Mostrar erro
function showError(message) {
    loadingElement.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;"></i>
        <h3>Erro ao carregar receitas</h3>
        <p>${message}</p>
        <button id="retry-btn" style="margin-top: 20px; padding: 10px 20px; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Tentar novamente
        </button>
    `;
    
    document.getElementById('retry-btn').addEventListener('click', () => {
        loadingElement.innerHTML = `
            <div class="spinner"></div>
            <p>Carregando receitas...</p>
        `;
        loadRecipes();
    });
                 }
