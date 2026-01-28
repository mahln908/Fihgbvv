// script.js - VERSÃO FINAL CORRIGIDA
document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const recipesContainer = document.getElementById('recipes-container');
    const loadingElement = document.getElementById('loading');
    const noRecipesElement = document.getElementById('no-recipes');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoriesContainer = document.querySelector('.categories-scroll');
    const backToTopButton = document.getElementById('back-to-top');
    
    // Variáveis globais
    let allRecipes = [];
    let categories = new Set(['todos']); // Usando Set para evitar categorias repetidas
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearchTerm = '';
    
    // Configuração da API do Google Sheets
    const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const SHEET_NAME = 'Receitas Sabor de Casa';
    const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    
    // URL da API - CORRIGIDA para funcionar com espaços no nome da planilha
    const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
    
    console.log('URL da API:', API_URL);
    
    // Inicializar a aplicação
    init();
    
    // Função principal de inicialização
    async function init() {
        try {
            console.log('Iniciando carregamento de receitas...');
            await loadRecipes();
            setupEventListeners();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            showError('Erro ao carregar as receitas. Recarregue a página.');
        }
    }
    
    // Carregar receitas da API do Google Sheets
    async function loadRecipes() {
        try {
            console.log('Fazendo requisição para:', API_URL);
            
            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Dados recebidos da API:', data);
            
            if (!data.values || data.values.length === 0) {
                throw new Error('Planilha vazia ou sem dados');
            }
            
            // Processar os dados da planilha
            allRecipes = processSheetData(data.values);
            
            if (allRecipes.length === 0) {
                throw new Error('Nenhuma receita válida encontrada');
            }
            
            console.log(`Total de receitas carregadas: ${allRecipes.length}`);
            
            // Extrair categorias únicas
            extractUniqueCategories();
            
            // Renderizar categorias
            renderCategories();
            
            // Salvar receitas no localStorage para usar na página de detalhes
            localStorage.setItem('saborDeCasaRecipes', JSON.stringify(allRecipes));
            localStorage.setItem('saborDeCasaLastUpdate', Date.now());
            
            // Inicializar com todas as receitas
            filteredRecipes = [...allRecipes];
            renderRecipesWithAnimation();
            
            // Esconder loading
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('Erro ao carregar receitas:', error);
            handleLoadError(error);
        }
    }
    
    // Processar dados da planilha
    function processSheetData(sheetData) {
        const recipes = [];
        
        if (!sheetData || sheetData.length < 2) {
            return recipes;
        }
        
        // Obter cabeçalhos
        const headers = sheetData[0].map(header => 
            header.toLowerCase().trim().replace(/\s+/g, '')
        );
        
        // Mapear índices das colunas
        const headerMap = {};
        headers.forEach((header, index) => {
            headerMap[header] = index;
        });
        
        console.log('Cabeçalhos mapeados:', headerMap);
        
        // Processar cada linha de receita
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            
            // Pular linhas vazias
            if (!row || row.length === 0) continue;
            
            const recipe = {
                id: `recipe-${i}`,
                name: row[headerMap['nome']]?.trim() || '',
                category: row[headerMap['categoria']]?.trim() || 'Sem categoria',
                time: row[headerMap['tempo']]?.trim() || 'Não informado',
                ingredients: row[headerMap['ingrediente']]?.trim() || 'Ingredientes não informados',
                instructions: row[headerMap['mododepreparo']]?.trim() || 'Modo de preparo não informado',
                url: row[headerMap['url']]?.trim() || '',
                message: row[headerMap['mensagem']]?.trim() || ''
            };
            
            // Processar URL da imagem
            if (recipe.url) {
                recipe.imageUrl = processImageUrl(recipe.url);
            } else {
                recipe.imageUrl = getDefaultImage(recipe.category);
            }
            
            // Só adiciona se tiver nome
            if (recipe.name && recipe.name !== '') {
                recipes.push(recipe);
            }
        }
        
        return recipes;
    }
    
    // Processar URL da imagem
    function processImageUrl(url) {
        if (!url) return getDefaultImage();
        
        // Se for do Google Drive, converter para link direto
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([^\/]+)/);
            if (match) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
        }
        
        return url;
    }
    
    // Obter imagem padrão baseada na categoria
    function getDefaultImage(category = '') {
        const defaultImages = {
            'sobremesa': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=600&fit=crop',
            'doce': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=600&fit=crop',
            'prato principal': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
            'salada': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
            'aperitivo': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
            'bebida': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop',
            'café da manhã': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop',
            'massas': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=600&fit=crop',
            'vegetariano': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=600&fit=crop'
        };
        
        const categoryLower = category.toLowerCase();
        return defaultImages[categoryLower] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
    }
    
    // Extrair categorias únicas - SEM REPETIÇÕES
    function extractUniqueCategories() {
        categories.clear();
        categories.add('todos');
        
        allRecipes.forEach(recipe => {
            if (recipe.category && recipe.category.trim() !== '') {
                categories.add(recipe.category.trim());
            }
        });
        
        console.log('Categorias encontradas:', Array.from(categories));
    }
    
    // Renderizar categorias
    function renderCategories() {
        // Limpar categorias existentes (exceto "Todos")
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn:not([data-category="todos"])');
        existingButtons.forEach(btn => btn.remove());
        
        // Converter Set para Array, ordenar e renderizar
        const sortedCategories = Array.from(categories)
            .filter(cat => cat !== 'todos')
            .sort((a, b) => a.localeCompare(b));
        
        sortedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.dataset.category = category;
            button.textContent = category;
            button.title = `Filtrar receitas de ${category}`;
            
            categoriesContainer.appendChild(button);
        });
    }
    
    // Renderizar receitas com animação de baixo para cima
    function renderRecipesWithAnimation() {
        recipesContainer.innerHTML = '';
        
        if (filteredRecipes.length === 0) {
            noRecipesElement.classList.remove('hidden');
            return;
        }
        
        noRecipesElement.classList.add('hidden');
        
        // Renderizar receitas em ordem inversa para animação
        filteredRecipecs.forEach((recipe, index) => {
            const recipeCard = createRecipeCard(recipe);
            recipeCard.style.setProperty('--card-index', index);
            recipesContainer.appendChild(recipeCard);
        });
    }
    
    // Criar card de receita
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Limitar ingredientes para preview
        const ingredientsPreview = recipe.ingredients.length > 120 
            ? recipe.ingredients.substring(0, 120) + '...' 
            : recipe.ingredients;
        
        card.innerHTML = `
            <div class="recipe-image" style="background-image: url('${recipe.imageUrl}')">
                ${recipe.time ? `<div class="recipe-time"><i class="far fa-clock"></i> ${recipe.time}</div>` : ''}
            </div>
            <div class="recipe-content">
                ${recipe.category ? `<span class="recipe-category">${recipe.category}</span>` : ''}
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-ingredients">${ingredientsPreview}</p>
                <div class="recipe-footer">
                    <a href="receita.html?id=${recipe.id}" class="recipe-link" onclick="saveRecipeToStorage('${recipe.id}')">
                        <i class="fas fa-book-open"></i> Ver Receita Completa
                    </a>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Filtrar receitas
    function filterRecipes() {
        filteredRecipes = allRecipes.filter(recipe => {
            // Filtrar por categoria
            const categoryMatch = currentCategory === 'todos' || recipe.category === currentCategory;
            
            // Filtrar por termo de busca
            if (!currentSearchTerm) return categoryMatch;
            
            const searchTerm = currentSearchTerm.toLowerCase();
            return categoryMatch && (
                recipe.name.toLowerCase().includes(searchTerm) ||
                recipe.category.toLowerCase().includes(searchTerm) ||
                recipe.ingredients.toLowerCase().includes(searchTerm)
            );
        });
        
        renderRecipesWithAnimation();
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Pesquisa
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Categorias
        categoriesContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('category-btn')) {
                // Remover active de todos
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Adicionar active ao clicado
                event.target.classList.add('active');
                
                // Atualizar categoria e filtrar
                currentCategory = event.target.dataset.category;
                filterRecipes();
                
                // Scroll suave para o topo
                window.scrollTo({
                    top: recipesContainer.offsetTop - 150,
                    behavior: 'smooth'
                });
            }
        });
        
        // Botão voltar ao topo
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Mostrar/ocultar botão voltar ao topo
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.remove('hidden');
            } else {
                backToTopButton.classList.add('hidden');
            }
        });
    }
    
    // Manipular busca
    function handleSearch() {
        currentSearchTerm = searchInput.value.trim().toLowerCase();
        filterRecipes();
    }
    
    // Manipular erro de carregamento
    function handleLoadError(error) {
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 40px 0;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 15px;"></i>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Erro ao carregar receitas</h3>
                <p style="color: #7f8c8d; margin-bottom: 20px;">${error.message}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.3s;
                    ">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                    <button onclick="useFallbackData()" style="
                        background: #2c3e50;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.3s;
                    ">
                        <i class="fas fa-utensils"></i> Usar Receitas de Exemplo
                    </button>
                </div>
            </div>
        `;
    }
    
    // Mostrar erro
    function showError(message) {
        console.error(message);
    }
    
    // Funções globais
    window.saveRecipeToStorage = function(recipeId) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            localStorage.setItem('currentRecipe', JSON.stringify(recipe));
        }
    };
    
    window.resetFilters = function() {
        currentCategory = 'todos';
        currentSearchTerm = '';
        searchInput.value = '';
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'todos') {
                btn.classList.add('active');
            }
        });
        
        filteredRecipes = [...allRecipes];
        renderRecipesWithAnimation();
    };
    
    window.useFallbackData = function() {
        console.log('Usando dados de fallback...');
        
        allRecipes = [
            {
                id: 'recipe-1',
                name: 'Bolo de Chocolate',
                category: 'Sobremesa',
                time: '60 min',
                ingredients: 'Farinha, açúcar, chocolate em pó, ovos, leite, óleo, fermento',
                instructions: '1. Pré-aqueça o forno a 180°C\n2. Misture todos os ingredientes secos\n3. Adicione os ingredientes líquidos\n4. Asse por 40 minutos',
                imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop',
                message: 'Perfeito para festas de aniversário'
            },
            {
                id: 'recipe-2',
                name: 'Lasanha à Bolonhesa',
                category: 'Prato Principal',
                time: '90 min',
                ingredients: 'Massa para lasanha, carne moída, molho de tomate, queijo mussarela, presunto',
                instructions: '1. Refogue a carne\n2. Monte em camadas\n3. Asse até dourar',
                imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop',
                message: 'Receita tradicional da família'
            }
        ];
        
        extractUniqueCategories();
        renderCategories();
        
        filteredRecipes = [...allRecipes];
        renderRecipesWithAnimation();
        
        loadingElement.classList.add('hidden');
    };
});
