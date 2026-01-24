// Configuração da API do Google Sheets
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;

// Variáveis globais
let allRecipes = [];
let filteredRecipes = [];
let currentCategory = 'todas';
let currentPage = 1;
const recipesPerPage = 6;
let isLoading = false;

// Elementos DOM
const recipesGrid = document.getElementById('recipesGrid');
const categoriesList = document.getElementById('categoriesList');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const recipesCount = document.getElementById('recipesCount');
const themeToggle = document.getElementById('themeToggle');

// Função para carregar os dados da planilha
async function loadRecipes() {
    try {
        showLoading();
        
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Nenhum dado encontrado na planilha');
        }
        
        // Converter os dados da planilha em objetos de receitas
        const headers = data.values[0]; // Primeira linha é o cabeçalho
        const rows = data.values.slice(1); // Restante são os dados
        
        allRecipes = rows.map(row => {
            const recipe = {};
            headers.forEach((header, index) => {
                // Normalizar o nome do campo para corresponder à estrutura
                const fieldName = header.toLowerCase().replace(/\s/g, '');
                recipe[fieldName] = row[index] || '';
            });
            return recipe;
        });
        
        // Inverter a ordem das receitas (mais recentes primeiro)
        allRecipes.reverse();
        
        // Inicializar receitas filtradas
        filteredRecipes = [...allRecipes];
        
        // Renderizar categorias
        renderCategories();
        
        // Renderizar receitas
        renderRecipes();
        
        updateRecipesCount();
        
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        showError('Não foi possível carregar as receitas. Verifique a conexão com a internet.');
    } finally {
        hideLoading();
    }
}

// Função para extrair categorias únicas das receitas
function getUniqueCategories() {
    const categories = new Set();
    
    allRecipes.forEach(recipe => {
        if (recipe.categoria) {
            // Dividir categorias por vírgula e adicionar cada uma
            const cats = recipe.categoria.split(',').map(cat => cat.trim());
            cats.forEach(cat => {
                if (cat) categories.add(cat);
            });
        }
    });
    
    return Array.from(categories);
}

// Função para renderizar as categorias
function renderCategories() {
    const categories = getUniqueCategories();
    
    // Limpar lista de categorias
    categoriesList.innerHTML = '';
    
    // Adicionar cada categoria
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = category;
        button.dataset.category = category.toLowerCase();
        
        button.addEventListener('click', () => {
            // Remover classe active de todos os botões
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Adicionar classe active ao botão clicado
            button.classList.add('active');
            
            // Atualizar categoria atual
            currentCategory = category.toLowerCase();
            
            // Filtrar receitas
            filterRecipes();
        });
        
        categoriesList.appendChild(button);
    });
}

// Função para filtrar receitas por categoria e pesquisa
function filterRecipes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    filteredRecipes = allRecipes.filter(recipe => {
        // Filtrar por categoria
        const categoryMatch = currentCategory === 'todas' || 
            (recipe.categoria && recipe.categoria.toLowerCase().includes(currentCategory));
        
        // Filtrar por termo de pesquisa
        const searchMatch = searchTerm === '' || 
            (recipe.nome && recipe.nome.toLowerCase().includes(searchTerm)) ||
            (recipe.ingrediente && recipe.ingrediente.toLowerCase().includes(searchTerm)) ||
            (recipe.categoria && recipe.categoria.toLowerCase().includes(searchTerm));
        
        return categoryMatch && searchMatch;
    });
    
    // Resetar para a primeira página
    currentPage = 1;
    
    // Renderizar receitas
    renderRecipes();
    
    // Atualizar contador
    updateRecipesCount();
}

// Função para renderizar as receitas
function renderRecipes() {
    // Calcular quais receitas mostrar na página atual
    const startIndex = 0;
    const endIndex = currentPage * recipesPerPage;
    const recipesToShow = filteredRecipes.slice(startIndex, endIndex);
    
    // Limpar grid de receitas
    recipesGrid.innerHTML = '';
    
    if (recipesToShow.length === 0) {
        // Mostrar mensagem de nenhum resultado
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-utensils"></i>
            <h3>Nenhuma receita encontrada</h3>
            <p>Tente buscar por outro termo ou selecione uma categoria diferente.</p>
        `;
        recipesGrid.appendChild(noResults);
        
        // Ocultar botão "Carregar mais"
        loadMoreBtn.style.display = 'none';
        return;
    }
    
    // Adicionar cada receita ao grid
    recipesToShow.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipesGrid.appendChild(recipeCard);
    });
    
    // Mostrar/ocultar botão "Carregar mais"
    if (endIndex < filteredRecipes.length) {
        loadMoreBtn.style.display = 'flex';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Função para criar um card de receita
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // Gerar cor de fundo aleatória para a imagem
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Limitar ingredientes para preview
    const ingredientsPreview = recipe.ingrediente ? 
        recipe.ingrediente.split(',').slice(0, 3).join(', ') + '...' : 
        'Ingredientes não disponíveis';
    
    // Formatar tempo
    const time = recipe.tempo || 'Tempo não informado';
    
    card.innerHTML = `
        <div class="recipe-image" style="background-color: ${randomColor};">
            ${recipe.categoria ? `<span class="recipe-category">${recipe.categoria.split(',')[0]}</span>` : ''}
            <span class="recipe-time">${time}</span>
        </div>
        <div class="recipe-info">
            <h3 class="recipe-title">${recipe.nome || 'Receita sem nome'}</h3>
            <p class="recipe-ingredients">${ingredientsPreview}</p>
            <a href="receita.html?recipe=${encodeURIComponent(recipe.nome || '')}" class="recipe-link">Ver receita completa</a>
        </div>
    `;
    
    return card;
}

// Função para carregar mais receitas
function loadMoreRecipes() {
    if (isLoading) return;
    
    currentPage++;
    renderRecipes();
}

// Função para atualizar o contador de receitas
function updateRecipesCount() {
    recipesCount.textContent = filteredRecipes.length;
}

// Função para mostrar loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
    }
}

// Função para ocultar loading
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Função para mostrar erro
function showError(message) {
    recipesGrid.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar receitas</h3>
            <p>${message}</p>
            <button id="retryButton" class="load-more-btn" style="margin-top: 20px;">Tentar novamente</button>
        </div>
    `;
    
    document.getElementById('retryButton').addEventListener('click', loadRecipes);
}

// Função para alternar tema claro/escuro
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Atualizar ícone
    const icon = themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // Salvar preferência no localStorage
    localStorage.setItem('theme', newTheme);
}

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Atualizar ícone
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema
    initTheme();
    
    // Carregar receitas
    loadRecipes();
    
    // Configurar eventos
    searchButton.addEventListener('click', filterRecipes);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filterRecipes();
        }
    });
    
    loadMoreBtn.addEventListener('click', loadMoreRecipes);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Atualizar categoria "Todas"
    document.querySelector('.category-btn[data-category="todas"]').addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.category-btn[data-category="todas"]').classList.add('active');
        currentCategory = 'todas';
        filterRecipes();
    });
});
