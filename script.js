// Configuração da API do Google Sheets
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
// IMPORTANTE: A planilha precisa estar pública para funcionar!
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Receitas%20Sabor%20de%20Casa?key=${API_KEY}`;

// Variáveis globais
let allRecipes = [];
let filteredRecipes = [];
let currentCategory = 'todas';
let displayedRecipes = 0;
const RECIPES_PER_PAGE = 6;

// Elementos DOM
const recipesContainer = document.getElementById('recipesContainer');
const categoriesScroll = document.getElementById('categoriesScroll');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const recipesCount = document.getElementById('recipesCount');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');
const refreshBtn = document.getElementById('refreshBtn');
const loadingElement = document.getElementById('loading');

// Cores para diferentes categorias
const categoryColors = {
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
    'tradicional': '#E67E22',
    'café da manhã': '#F1C40F',
    'light': '#2ECC71'
};

// Função principal para carregar dados da planilha
async function loadRecipes() {
    try {
        showLoading();
        console.log('🔄 Conectando ao Google Sheets...');
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Planilha vazia ou sem dados');
        }
        
        console.log('✅ Dados recebidos!');
        console.log('Primeira linha (cabeçalhos):', data.values[0]);
        
        // Processar os dados
        allRecipes = processSheetData(data.values);
        
        if (allRecipes.length === 0) {
            throw new Error('Nenhuma receita válida encontrada');
        }
        
        console.log(`🍳 ${allRecipes.length} receitas processadas`);
        
        // Resetar filtros
        filteredRecipes = [...allRecipes];
        displayedRecipes = 0;
        currentCategory = 'todas';
        
        // Atualizar a interface
        renderCategories();
        renderRecipes();
        updateRecipesCount();
        
    } catch (error) {
        console.error('❌ Erro ao carregar receitas:', error);
        showError(`Erro: ${error.message}<br><br>Verifique se a planilha está pública:<br>1. Acesse a planilha no Google Sheets<br>2. Clique em "Compartilhar"<br>3. Configure como "Qualquer pessoa com o link pode visualizar"`);
    } finally {
        hideLoading();
    }
}

// Função para processar dados da planilha
function processSheetData(sheetData) {
    if (!sheetData || sheetData.length < 2) {
        return [];
    }
    
    const headers = sheetData[0]; // Primeira linha = cabeçalhos
    const rows = sheetData.slice(1); // Resto = dados
    
    console.log('Cabeçalhos:', headers);
    
    // Encontrar índices das colunas (case insensitive)
    const headerIndices = {};
    headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();
        headerIndices[headerLower] = index;
    });
    
    console.log('Índices encontrados:', headerIndices);
    
    // Processar cada linha
    const recipes = [];
    
    rows.forEach((row, rowIndex) => {
        try {
            // Criar objeto da receita
            const recipe = {
                id: rowIndex + 1,
                nome: getValue(row, headerIndices, 'nome') || `Receita ${rowIndex + 1}`,
                categoria: getValue(row, headerIndices, 'categoria') || 'Geral',
                tempo: getValue(row, headerIndices, 'tempo') || 'Tempo não informado',
                ingrediente: getValue(row, headerIndices, 'ingrediente') || 'Ingredientes não informados',
                mododepreparo: getValue(row, headerIndices, 'mododepreparo') || 'Modo de preparo não informado',
                url: getValue(row, headerIndices, 'url') || '',
                mensagem: getValue(row, headerIndices, 'mensagem') || ''
            };
            
            // Gerar cor baseada na categoria
            const firstCategory = recipe.categoria.toLowerCase().split(',')[0].trim();
            recipe.color = categoryColors[firstCategory] || generateRandomColor();
            
            // Adicionar à lista
            recipes.push(recipe);
            
        } catch (error) {
            console.warn(`⚠️ Erro ao processar linha ${rowIndex + 1}:`, error);
        }
    });
    
    return recipes;
}

// Função auxiliar para obter valor da célula
function getValue(row, headerIndices, fieldName) {
    const index = headerIndices[fieldName];
    if (index !== undefined && row[index] !== undefined) {
        return row[index].toString().trim();
    }
    return '';
}

// Gerar cor aleatória
function generateRandomColor() {
    const colors = [
        '#FF6B35', '#FF8B5A', '#E55A2B', '#FFB347',
        '#2ECC71', '#27AE60', '#3498DB', '#2980B9',
        '#9B59B6', '#8E44AD', '#F39C12', '#E67E22'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Função para extrair categorias únicas
function getUniqueCategories() {
    const categories = new Set();
    
    allRecipes.forEach(recipe => {
        if (recipe.categoria && recipe.categoria.trim()) {
            // Separar categorias por vírgula
            recipe.categoria.split(',').forEach(cat => {
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
        
        // Adicionar ícone baseado na categoria
        const icon = document.createElement('i');
        icon.className = getCategoryIcon(category);
        button.appendChild(icon);
        
        // Adicionar texto
        const text = document.createTextNode(` ${category}`);
        button.appendChild(text);
        
        // Event listener
        button.addEventListener('click', () => {
            // Remover active de todos
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Adicionar active ao clicado
            button.classList.add('active');
            
            // Filtrar receitas
            currentCategory = category.toLowerCase();
            filteredRecipes = filterRecipes();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        });
        
        categoriesScroll.appendChild(button);
    });
}

// Função para obter ícone da categoria
function getCategoryIcon(category) {
    const catLower = category.toLowerCase();
    
    if (catLower.includes('prato') || catLower.includes('principal')) return 'fas fa-utensils';
    if (catLower.includes('low') || catLower.includes('carb')) return 'fas fa-leaf';
    if (catLower.includes('doce') || catLower.includes('sobremesa')) return 'fas fa-birthday-cake';
    if (catLower.includes('vegetar')) return 'fas fa-seedling';
    if (catLower.includes('salada')) return 'fas fa-apple-alt';
    if (catLower.includes('massa')) return 'fas fa-pizza-slice';
    if (catLower.includes('carne')) return 'fas fa-drumstick-bite';
    if (catLower.includes('ave') || catLower.includes('frango')) return 'fas fa-drumstick-bite';
    if (catLower.includes('peixe')) return 'fas fa-fish';
    if (catLower.includes('sopa')) return 'fas fa-mug-hot';
    if (catLower.includes('bolo')) return 'fas fa-birthday-cake';
    if (catLower.includes('bebida')) return 'fas fa-glass-whiskey';
    if (catLower.includes('café')) return 'fas fa-coffee';
    if (catLower.includes('lanche')) return 'fas fa-hamburger';
    
    return 'fas fa-utensils';
}

// Função para filtrar receitas
function filterRecipes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    return allRecipes.filter(recipe => {
        // Filtrar por categoria
        const categoryMatch = currentCategory === 'todas' || 
            recipe.categoria.toLowerCase().includes(currentCategory);
        
        // Filtrar por termo de busca
        const searchMatch = !searchTerm ||
            recipe.nome.toLowerCase().includes(searchTerm) ||
            recipe.ingrediente.toLowerCase().includes(searchTerm) ||
            recipe.categoria.toLowerCase().includes(searchTerm);
        
        return categoryMatch && searchMatch;
    });
}

// Função para renderizar receitas
function renderRecipes() {
    // Calcular receitas para mostrar
    const recipesToShow = filteredRecipes.slice(0, displayedRecipes + RECIPES_PER_PAGE);
    
    // Limpar container se for a primeira página
    if (displayedRecipes === 0) {
        recipesContainer.innerHTML = '';
    }
    
    if (filteredRecipes.length === 0) {
        showNoResults();
        loadMoreBtn.style.display = 'none';
        return;
    }
    
    // Adicionar receitas
    recipesToShow.forEach((recipe, index) => {
        const recipeCard = createRecipeCard(recipe, index);
        recipesContainer.appendChild(recipeCard);
    });
    
    displayedRecipes = recipesToShow.length;
    
    // Mostrar/ocultar botão "Carregar mais"
    if (displayedRecipes < filteredRecipes.length) {
        loadMoreBtn.style.display = 'inline-flex';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Função para criar card de receita
function createRecipeCard(recipe, index) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Limitar ingredientes para preview
    let ingredientsPreview = recipe.ingrediente;
    if (ingredientsPreview.length > 100) {
        ingredientsPreview = ingredientsPreview.substring(0, 100) + '...';
    }
    
    // Primeira categoria
    const firstCategory = recipe.categoria.split(',')[0].trim();
    
    card.innerHTML = `
        <div class="recipe-image" style="background: linear-gradient(135deg, ${recipe.color}, ${recipe.color}80)">
            <span class="recipe-category">${firstCategory}</span>
            <span class="recipe-time"><i class="far fa-clock"></i> ${recipe.tempo}</span>
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

// Função para carregar mais receitas
function loadMore() {
    displayedRecipes += RECIPES_PER_PAGE;
    renderRecipes();
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
            <h3>Erro ao carregar receitas</h3>
            <p>${message}</p>
            <button id="retryButton" class="load-more-btn" style="margin-top: 20px;">
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
            <p>Tente buscar por outro termo ou selecione uma categoria diferente.</p>
        </div>
    `;
}

// Funções para scroll horizontal
function initCategoryScroll() {
    if (scrollLeft && scrollRight) {
        scrollLeft.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: -200, behavior: 'smooth' });
        });
        
        scrollRight.addEventListener('click', () => {
            categoriesScroll.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sabor de Casa - Iniciando...');
    
    // Carregar receitas
    loadRecipes();
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            filteredRecipes = filterRecipes();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                filteredRecipes = filterRecipes();
                displayedRecipes = 0;
                renderRecipes();
                updateRecipesCount();
            }
        });
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadRecipes);
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
            filteredRecipes = filterRecipes();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        });
    }
    
    // Inicializar scroll horizontal
    initCategoryScroll();
    
    // Verificar parâmetro de busca na URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam && searchInput) {
        searchInput.value = searchParam;
        setTimeout(() => {
            filteredRecipes = filterRecipes();
            displayedRecipes = 0;
            renderRecipes();
            updateRecipesCount();
        }, 500);
    }
});
