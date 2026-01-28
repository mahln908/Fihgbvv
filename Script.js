// script.js
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
    let categories = [];
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearchTerm = '';
    
    // URL da API do Google Sheets
    const spreadsheetId = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const sheetName = 'Receitas Sabor de Casa';
    const apiKey = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
    
    // Inicializar
    init();
    
    // Função de inicialização
    async function init() {
        try {
            await loadRecipes();
            setupEventListeners();
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            showError('Erro ao carregar as receitas. Por favor, tente novamente mais tarde.');
        }
    }
    
    // Carregar receitas da API
    async function loadRecipes() {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Erro na resposta da API');
            }
            
            const data = await response.json();
            
            // Converter os dados da planilha em objetos de receita
            allRecipes = transformSheetData(data.values);
            
            // Extrair categorias únicas
            extractCategories(allRecipes);
            
            // Renderizar categorias
            renderCategories();
            
            // Mostrar todas as receitas inicialmente
            filteredRecipes = [...allRecipes];
            renderRecipes();
            
            // Esconder loading
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('Erro ao carregar receitas:', error);
            showError('Não foi possível carregar as receitas. Verifique sua conexão ou tente novamente mais tarde.');
            
            // Em caso de erro, usar dados de exemplo
            useSampleData();
        }
    }
    
    // Transformar dados da planilha em objetos de receita
    function transformSheetData(sheetData) {
        if (!sheetData || sheetData.length < 2) {
            return [];
        }
        
        const headers = sheetData[0];
        const rows = sheetData.slice(1);
        
        const recipes = rows.map(row => {
            const recipe = {};
            
            headers.forEach((header, index) => {
                const value = row[index] || '';
                
                // Normalizar nomes das propriedades
                const propertyName = header.toLowerCase().replace(/\s/g, '');
                
                // Atribuir valores
                if (propertyName === 'nome') {
                    recipe.name = value;
                } else if (propertyName === 'categoria') {
                    recipe.category = value;
                } else if (propertyName === 'tempo') {
                    recipe.time = value;
                } else if (propertyName === 'ingrediente') {
                    recipe.ingredients = value;
                } else if (propertyName === 'mododepreparo') {
                    recipe.instructions = value;
                } else if (propertyName === 'url') {
                    recipe.url = value;
                } else if (propertyName === 'mensagem') {
                    recipe.message = value;
                }
            });
            
            // Adicionar um ID único
            recipe.id = Math.random().toString(36).substr(2, 9);
            
            return recipe;
        });
        
        return recipes.filter(recipe => recipe.name); // Filtrar receitas sem nome
    }
    
    // Extrair categorias únicas das receitas
    function extractCategories(recipes) {
        const categorySet = new Set();
        
        recipes.forEach(recipe => {
            if (recipe.category) {
                categorySet.add(recipe.category);
            }
        });
        
        categories = Array.from(categorySet).sort();
    }
    
    // Renderizar botões de categorias
    function renderCategories() {
        // Limpar categorias existentes (exceto "Todos")
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn:not([data-category="todos"])');
        existingButtons.forEach(btn => btn.remove());
        
        // Adicionar categorias
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.dataset.category = category;
            button.textContent = category;
            
            categoriesContainer.appendChild(button);
        });
    }
    
    // Renderizar receitas
    function renderRecipes() {
        // Limpar container
        recipesContainer.innerHTML = '';
        
        if (filteredRecipes.length === 0) {
            noRecipesElement.classList.remove('hidden');
            return;
        }
        
        noRecipesElement.classList.add('hidden');
        
        // Adicionar receitas com animação de baixo para cima
        filteredRecipes.forEach((recipe, index) => {
            const recipeCard = createRecipeCard(recipe);
            
            // Adicionar atraso para animação sequencial
            recipeCard.style.animationDelay = `${index * 0.05}s`;
            
            recipesContainer.appendChild(recipeCard);
        });
    }
    
    // Criar card de receita
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Cor de fundo baseada na categoria (para exemplo, já que não temos imagens)
        const colorMap = {
            'Sobremesa': '#FFD6E7',
            'Prato Principal': '#C1E1C1',
            'Aperitivo': '#FFECB3',
            'Bebida': '#B3E5FC',
            'Café da Manhã': '#FFCCBC',
            'Salada': '#C8E6C9',
            'Molho': '#FFE0B2'
        };
        
        const bgColor = colorMap[recipe.category] || '#F5F5F5';
        
        // Truncar ingredientes para exibição
        const truncatedIngredients = recipe.ingredients 
            ? (recipe.ingredients.length > 120 ? recipe.ingredients.substring(0, 120) + '...' : recipe.ingredients)
            : 'Ingredientes não disponíveis';
        
        card.innerHTML = `
            <div class="recipe-image" style="background-color: ${bgColor};">
                ${recipe.time ? `<div class="recipe-time"><i class="far fa-clock"></i> ${recipe.time}</div>` : ''}
            </div>
            <div class="recipe-content">
                ${recipe.category ? `<span class="recipe-category">${recipe.category}</span>` : ''}
                <h3 class="recipe-title">${recipe.name || 'Receita sem nome'}</h3>
                <p class="recipe-ingredients">${truncatedIngredients}</p>
                <div class="recipe-footer">
                    ${recipe.url ? `<a href="receita.html?id=${recipe.id}" class="recipe-link" target="_blank"><i class="fas fa-book-open"></i> Ver Receita</a>` : '<span class="recipe-link disabled">Detalhes Indisponíveis</span>'}
                    ${recipe.message ? `<span class="recipe-message" title="${recipe.message}"><i class="far fa-comment"></i> ${recipe.message}</span>` : ''}
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Filtrar receitas por categoria e termo de pesquisa
    function filterRecipes() {
        filteredRecipes = allRecipes.filter(recipe => {
            // Filtrar por categoria
            const categoryMatch = currentCategory === 'todos' || recipe.category === currentCategory;
            
            // Filtrar por termo de pesquisa
            const searchMatch = !currentSearchTerm || 
                (recipe.name && recipe.name.toLowerCase().includes(currentSearchTerm)) ||
                (recipe.category && recipe.category.toLowerCase().includes(currentSearchTerm)) ||
                (recipe.ingredients && recipe.ingredients.toLowerCase().includes(currentSearchTerm));
            
            return categoryMatch && searchMatch;
        });
        
        renderRecipes();
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
                // Remover classe active de todos os botões
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Adicionar classe active ao botão clicado
                event.target.classList.add('active');
                
                // Atualizar categoria atual e filtrar receitas
                currentCategory = event.target.dataset.category;
                filterRecipes();
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
    
    // Manipular pesquisa
    function handleSearch() {
        currentSearchTerm = searchInput.value.trim().toLowerCase();
        filterRecipes();
    }
    
    // Mostrar erro
    function showError(message) {
        loadingElement.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 15px;"></i>
            <h3>Ops! Algo deu errado</h3>
            <p>${message}</p>
        `;
    }
    
    // Usar dados de exemplo se a API falhar
    function useSampleData() {
        allRecipes = [
            {
                id: '1',
                name: 'Bolo de Chocolate',
                category: 'Sobremesa',
                time: '60 min',
                ingredients: 'Farinha, açúcar, chocolate em pó, ovos, leite, óleo, fermento',
                instructions: 'Misture todos os ingredientes e asse por 40 minutos',
                url: '#',
                message: 'Perfeito para festas'
            },
            {
                id: '2',
                name: 'Lasanha à Bolonhesa',
                category: 'Prato Principal',
                time: '90 min',
                ingredients: 'Massa para lasanha, carne moída, molho de tomate, queijo mussarela, presunto',
                instructions: 'Monte em camadas e asse até dourar',
                url: '#',
                message: 'Família vai adorar'
            },
            {
                id: '3',
                name: 'Salada Caesar',
                category: 'Salada',
                time: '20 min',
                ingredients: 'Alface, croutons, queijo parmesão, molho Caesar, peito de frango',
                instructions: 'Misture todos os ingredientes e sirva',
                url: '#',
                message: 'Refrescante e saudável'
            },
            {
                id: '4',
                name: 'Smoothie de Frutas',
                category: 'Bebida',
                time: '10 min',
                ingredients: 'Banana, morango, iogurte, mel, gelo',
                instructions: 'Bata todos os ingredientes no liquidificador',
                url: '#',
                message: 'Energia para o dia'
            },
            {
                id: '5',
                name: 'Pão de Queijo',
                category: 'Aperitivo',
                time: '40 min',
                ingredients: 'Polvilho azedo, queijo minas, ovos, leite, óleo, sal',
                instructions: 'Misture, modele e asse até dourar',
                url: '#',
                message: 'Típico mineiro'
            },
            {
                id: '6',
                name: 'Omelete de Queijo',
                category: 'Café da Manhã',
                time: '15 min',
                ingredients: 'Ovos, queijo, tomate, cebola, sal, pimenta',
                instructions: 'Bata os ovos, adicione os ingredientes e frite',
                url: '#',
                message: 'Rápido e nutritivo'
            }
        ];
        
        extractCategories(allRecipes);
        renderCategories();
        
        filteredRecipes = [...allRecipes];
        renderRecipes();
        
        loadingElement.classList.add('hidden');
    }
});
