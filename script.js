// Configuração EXATA da sua planilha
const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
const SHEET_NAME = 'Receitas Sabor de Casa';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

// Variáveis globais
let allRecipes = [];
let filteredRecipes = [];
let currentCategory = 'todas';
let currentPage = 1;
const recipesPerPage = 9;

// Elementos DOM
const recipesContainer = document.getElementById('recipesContainer');
const categoriesScroll = document.getElementById('categoriesScroll');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const recipesCount = document.getElementById('recipesCount');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');

// Função principal para carregar dados da planilha
async function loadRecipes() {
    try {
        showLoading();
        
        console.log('🔗 Conectando ao Google Sheets...');
        console.log('📊 URL da API:', API_URL);
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('Planilha vazia ou sem dados');
        }
        
        console.log('✅ Dados recebidos com sucesso!');
        console.log('📋 Total de linhas:', data.values.length);
        
        // Processar os dados EXATAMENTE como estão na planilha
        allRecipes = processSheetData(data.values);
        
        console.log('🍳 Total de receitas processadas:', allRecipes.length);
        
        // Mostrar primeira receita no console para debug
        if (allRecipes.length > 0) {
            console.log('📝 Primeira receita:', allRecipes[0]);
        }
        
        // Inicializar receitas filtradas
        filteredRecipes = [...allRecipes];
        
        // Renderizar categorias
        renderCategories();
        
        // Renderizar receitas
        renderRecipes();
        
        updateRecipesCount();
        
    } catch (error) {
        console.error('❌ Erro ao carregar receitas:', error);
        showError(`Erro ao carregar receitas: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Função para processar os dados da planilha EXATAMENTE como você configurou
function processSheetData(sheetData) {
    if (!sheetData || sheetData.length < 2) {
        return [];
    }
    
    const headers = sheetData[0]; // Primeira linha: cabeçalhos
    const rows = sheetData.slice(1); // Resto: dados das receitas
    
    console.log('📋 Cabeçalhos encontrados:', headers);
    
    // Mapear os índices das colunas baseado nos cabeçalhos
    const headerMap = {};
    headers.forEach((header, index) => {
        headerMap[header.trim().toLowerCase()] = index;
    });
    
    console.log('🗺️ Mapeamento de colunas:', headerMap);
    
    // Processar cada linha/registro
    const recipes = rows.map((row, rowIndex) => {
        // Criar objeto de receita
        const recipe = {
            id: rowIndex + 1,
            nome: getValue(row, headerMap, ['nome']),
            categoria: getValue(row, headerMap, ['categoria']),
            tempo: getValue(row, headerMap, ['tempo']),
            ingrediente: getValue(row, headerMap, ['ingrediente']),
            mododepreparo: getValue(row, headerMap, ['modo de preparo', 'mododepreparo']),
            url: getValue(row, headerMap, ['url']),
            mensagem: getValue(row, headerMap, ['mensagem'])
        };
        
        // Garantir que não haja valores undefined
        Object.keys(recipe).forEach(key => {
            if (recipe[key] === undefined) recipe[key] = '';
        });
        
        return recipe;
    });
    
    // Filtrar receitas que têm pelo menos nome ou ingredientes
    const validRecipes = recipes.filter(recipe => 
        recipe.nome.trim() !== '' || recipe.ingrediente.trim() !== ''
    );
    
    console.log(`✅ ${validRecipes.length} receitas válidas de ${recipes.length} linhas`);
    
    return validRecipes;
}

// Função auxiliar para obter valores das células
function getValue(row, headerMap, possibleHeaders) {
    for (const header of possibleHeaders) {
        const index = headerMap[header];
        if (index !== undefined && row[index] !== undefined) {
            return row[index].toString().trim();
        }
    }
    return '';
}

// Função para extrair categorias únicas
function getUniqueCategories() {
    const categories = new Set(['Todas']);
    
    allRecipes.forEach(recipe => {
        if (recipe.categoria && recipe.categoria.trim()) {
            // Dividir por vírgula, ponto e vírgula, ou "e"
            const cats = recipe.categoria.split(/[,;e]/).map(cat => cat.trim());
            cats.forEach(cat => {
                if (cat) categories.add(cat);
            });
        }
    });
    
    return Array.from(categories);
}

// Função para renderizar categorias
function renderCategories() {
    const categories = getUniqueCategories();
    
    // Limpar lista de categorias
    categoriesScroll.innerHTML = '';
    
    console.log('🏷️ Categorias encontradas:', categories);
    
    // Adicionar cada categoria (exceto "Todas" que já está fixa)
    categories.filter(cat => cat !== 'Todas').forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category.toLowerCase();
        button.textContent = category;
        
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
        
        categoriesScroll.appendChild(button);
    });
}

// Função para filtrar receitas
function filterRecipes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    filteredRecipes = allRecipes.filter(recipe => {
        // Filtrar por categoria
        let categoryMatch = currentCategory === 'todas';
        if (!categoryMatch && recipe.categoria) {
            const recipeCategories = recipe.categoria.toLowerCase();
            categoryMatch = recipeCategories.includes(currentCategory);
        }
        
        // Filtrar por termo de pesquisa
        let searchMatch = searchTerm === '';
        if (!searchMatch) {
            searchMatch = 
                (recipe.nome && recipe.nome.toLowerCase().includes(searchTerm)) ||
                (recipe.ingrediente && recipe.ingrediente.toLowerCase().includes(searchTerm)) ||
                (recipe.categoria && recipe.categoria.toLowerCase().includes(searchTerm));
        }
        
        return categoryMatch && searchMatch;
    });
    
    // Resetar para a primeira página
    currentPage = 1;
    
    // Renderizar receitas
    renderRecipes();
    
    // Atualizar contador
    updateRecipesCount();
}

// Função para renderizar receitas
function renderRecipes() {
    // Calcular quais receitas mostrar
    const startIndex = 0;
    const endIndex = currentPage * recipesPerPage;
    const recipesToShow = filteredRecipes.slice(startIndex, endIndex);
    
    // Limpar container
    recipesContainer.innerHTML = '';
    
    if (recipesToShow.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>Nenhuma receita encontrada</h3>
            <p>Tente buscar por outro termo ou selecione uma categoria diferente.</p>
        `;
        recipesContainer.appendChild(noResults);
        
        document.getElementById('loadMoreContainer').style.display = 'none';
        return;
    }
    
    // Adicionar receitas
    recipesToShow.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipesContainer.appendChild(recipeCard);
    });
    
    // Mostrar/ocultar botão "Carregar mais"
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (endIndex < filteredRecipes.length) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// Função para criar card de receita
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // Limitar ingredientes para preview
    let ingredientsPreview = 'Ingredientes não disponíveis';
    if (recipe.ingrediente && recipe.ingrediente.trim()) {
        const ingredients = recipe.ingrediente.split(',').slice(0, 3);
        ingredientsPreview = ingredients.join(', ') + (recipe.ingrediente.split(',').length > 3 ? '...' : '');
    }
    
    // Primeira categoria
    const firstCategory = recipe.categoria ? 
        recipe.categoria.split(/[,;]/)[0].trim() : 'Geral';
    
    card.innerHTML = `
        <div class="recipe-header">
            <span class="recipe-category">${firstCategory}</span>
            ${recipe.tempo ? `<span class="recipe-time"><i class="far fa-clock"></i> ${recipe.tempo}</span>` : ''}
            <h3 class="recipe-title-main">${recipe.nome || 'Receita sem nome'}</h3>
        </div>
        <div class="recipe-info">
            <p class="recipe-ingredients-preview">${ingredientsPreview}</p>
            <a href="receita.html?id=${recipe.id}" class="recipe-link">
                Ver receita completa <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
    
    return card;
}

// Função para carregar mais receitas
function loadMoreRecipes() {
    currentPage++;
    
    // Calcular receitas para a nova página
    const startIndex = 0;
    const endIndex = currentPage * recipesPerPage;
    const newRecipes = filteredRecipes.slice(startIndex, endIndex);
    
    // Limpar e renderizar todas as receitas novamente
    renderRecipes();
}

// Função para atualizar contador
function updateRecipesCount() {
    if (recipesCount) {
        recipesCount.textContent = filteredRecipes.length;
    }
}

// Funções de loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Função para mostrar erro
function showError(message) {
    recipesContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar receitas</h3>
            <p>${message}</p>
            <p style="font-size: 0.9rem; margin-top: 10px;">
                Verifique se a planilha está pública e se a API Key está correta.
            </p>
            <button id="retryButton" class="load-more-btn" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Tentar novamente
            </button>
        </div>
    `;
    
    document.getElementById('retryButton').addEventListener('click', loadRecipes);
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

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Sabor de Casa...');
    
    // Carregar receitas
    loadRecipes();
    
    // Configurar eventos
    if (searchButton) {
        searchButton.addEventListener('click', filterRecipes);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                filterRecipes();
            }
        });
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreRecipes);
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
            filterRecipes();
        });
    }
    
    // Inicializar scroll horizontal
    initCategoryScroll();
    
    // Verificar parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam && searchInput) {
        searchInput.value = searchParam;
        // Aguardar um pouco para garantir que as receitas foram carregadas
        setTimeout(() => filterRecipes(), 500);
    }
});
