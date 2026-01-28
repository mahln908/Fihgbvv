document.addEventListener('DOMContentLoaded', function() {
    const recipesContainer = document.getElementById('recipes-container');
    const loadingElement = document.getElementById('loading');
    const noRecipesElement = document.getElementById('no-recipes');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoriesContainer = document.querySelector('.categories-scroll');
    const backToTopButton = document.getElementById('back-to-top');
    
    let allRecipes = [];
    let categories = ['todos'];
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearchTerm = '';
    
    const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    
    init();
    
    async function init() {
        try {
            await loadRecipesFromGoogleSheets();
            setupEventListeners();
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            showError('Erro ao carregar receitas. Recarregue a página.');
        }
    }
    
    async function loadRecipesFromGoogleSheets() {
        try {
            // URL correta para a API do Google Sheets
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Receitas%20Sabor%20de%20Casa?key=${API_KEY}`;
            
            console.log('Carregando dados da planilha...');
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                throw new Error('Planilha vazia ou não encontrada');
            }
            
            allRecipes = parseSheetData(data.values);
            
            if (allRecipes.length === 0) {
                throw new Error('Nenhuma receita encontrada na planilha');
            }
            
            console.log(`Carregadas ${allRecipes.length} receitas da planilha`);
            
            extractCategoriesFromRecipes();
            renderCategories();
            
            filteredRecipes = [...allRecipes];
            renderRecipes();
            
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('Erro ao carregar da planilha:', error);
            loadingElement.innerHTML = `
                <div style="color: #e74c3c; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <h3>Erro ao carregar receitas</h3>
                    <p>${error.message}</p>
                    <p>Verifique se a planilha está pública e se o nome está correto.</p>
                    <button onclick="location.reload()" style="
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #e74c3c;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
    
    function parseSheetData(sheetData) {
        const recipes = [];
        
        // Verifica se há dados
        if (!sheetData || sheetData.length < 2) {
            return recipes;
        }
        
        // Obtém os cabeçalhos da primeira linha
        const headers = sheetData[0].map(header => 
            header.toLowerCase().trim().replace(/\s+/g, '')
        );
        
        // Processa cada linha de dados
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            const recipe = {
                id: `recipe-${i}`
            };
            
            // Mapeia cada coluna para a propriedade correspondente
            for (let j = 0; j < headers.length; j++) {
                const value = row[j] ? row[j].trim() : '';
                const header = headers[j];
                
                switch(header) {
                    case 'nome':
                        recipe.name = value;
                        break;
                    case 'categoria':
                        recipe.category = value;
                        break;
                    case 'tempo':
                        recipe.time = value;
                        break;
                    case 'ingrediente':
                        recipe.ingredients = value;
                        break;
                    case 'mododepreparo':
                        recipe.instructions = value;
                        break;
                    case 'url':
                        // Processa URL da imagem
                        if (value && value.includes('drive.google.com')) {
                            // Converte link do Google Drive para link direto
                            const match = value.match(/\/d\/([^\/]+)/);
                            if (match) {
                                recipe.imageUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                            } else {
                                recipe.imageUrl = value;
                            }
                        } else if (value) {
                            recipe.imageUrl = value;
                        }
                        break;
                    case 'mensagem':
                        recipe.message = value;
                        break;
                }
            }
            
            // Só adiciona se tiver nome
            if (recipe.name && recipe.name.trim() !== '') {
                // Garante que todas as propriedades existam
                recipe.category = recipe.category || 'Sem categoria';
                recipe.time = recipe.time || 'Não informado';
                recipe.ingredients = recipe.ingredients || 'Ingredientes não informados';
                recipe.instructions = recipe.instructions || 'Modo de preparo não informado';
                recipe.message = recipe.message || '';
                
                // Imagem padrão se não tiver
                if (!recipe.imageUrl) {
                    recipe.imageUrl = getDefaultImage(recipe.category);
                }
                
                recipes.push(recipe);
            }
        }
        
        return recipes;
    }
    
    function getDefaultImage(category) {
        const defaultImages = {
            'Sobremesa': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=600&fit=crop',
            'Doce': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=600&fit=crop',
            'Prato Principal': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
            'Salada': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
            'Aperitivo': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
            'Bebida': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop',
            'Café da Manhã': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop'
        };
        
        return defaultImages[category] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
    }
    
    function extractCategoriesFromRecipes() {
        const categorySet = new Set(['todos']);
        
        allRecipes.forEach(recipe => {
            if (recipe.category && recipe.category.trim() !== '') {
                categorySet.add(recipe.category.trim());
            }
        });
        
        categories = Array.from(categorySet);
    }
    
    function renderCategories() {
        // Remove todas as categorias exceto "todos"
        const currentButtons = categoriesContainer.querySelectorAll('.category-btn');
        currentButtons.forEach(btn => {
            if (btn.dataset.category !== 'todos') {
                btn.remove();
            }
        });
        
        // Adiciona novas categorias
        categories
            .filter(cat => cat !== 'todos')
            .sort()
            .forEach(category => {
                const button = document.createElement('button');
                button.className = 'category-btn';
                button.dataset.category = category;
                button.textContent = category;
                categoriesContainer.appendChild(button);
            });
    }
    
    function renderRecipes() {
        recipesContainer.innerHTML = '';
        
        if (filteredRecipes.length === 0) {
            noRecipesElement.classList.remove('hidden');
            return;
        }
        
        noRecipesElement.classList.add('hidden');
        
        filteredRecipes.forEach((recipe, index) => {
            const recipeCard = createRecipeCard(recipe, index);
            recipesContainer.appendChild(recipeCard);
        });
    }
    
    function createRecipeCard(recipe, index) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Prepara ingredientes para exibição
        const ingredientsPreview = recipe.ingredients.length > 100 
            ? recipe.ingredients.substring(0, 100) + '...' 
            : recipe.ingredients;
        
        card.innerHTML = `
            <div class="recipe-image" style="background-image: url('${recipe.imageUrl}')">
                <div class="recipe-time">
                    <i class="far fa-clock"></i> ${recipe.time}
                </div>
            </div>
            <div class="recipe-content">
                <span class="recipe-category">${recipe.category}</span>
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-ingredients">${ingredientsPreview}</p>
                <div class="recipe-footer">
                    <a href="receita.html?id=${recipe.id}" class="recipe-link" onclick="saveRecipeState('${recipe.id}')">
                        <i class="fas fa-book-open"></i> Ver Receita
                    </a>
                    ${recipe.message && recipe.message.length > 0 
                        ? `<span class="recipe-message" title="${recipe.message}">
                            <i class="far fa-comment"></i> Nota
                          </span>`
                        : ''}
                </div>
            </div>
        `;
        
        return card;
    }
    
    function filterRecipes() {
        filteredRecipes = allRecipes.filter(recipe => {
            const categoryMatch = currentCategory === 'todos' || recipe.category === currentCategory;
            
            if (!currentSearchTerm) return categoryMatch;
            
            const searchTerm = currentSearchTerm.toLowerCase();
            const nameMatch = recipe.name.toLowerCase().includes(searchTerm);
            const categoryMatchSearch = recipe.category.toLowerCase().includes(searchTerm);
            const ingredientsMatch = recipe.ingredients.toLowerCase().includes(searchTerm);
            
            return categoryMatch && (nameMatch || categoryMatchSearch || ingredientsMatch);
        });
        
        renderRecipes();
    }
    
    function setupEventListeners() {
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        categoriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category;
                filterRecipes();
            }
        });
        
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', () => {
            backToTopButton.classList.toggle('hidden', window.scrollY < 300);
        });
        
        // Gerenciar histórico do navegador
        window.addEventListener('popstate', () => {
            if (!window.location.pathname.includes('receita.html')) {
                filterRecipes();
            }
        });
    }
    
    function handleSearch() {
        currentSearchTerm = searchInput.value.trim().toLowerCase();
        filterRecipes();
    }
    
    function showError(message) {
        loadingElement.innerHTML = `
            <div style="color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    // Função global para salvar estado da receita
    window.saveRecipeState = function(recipeId) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            sessionStorage.setItem('currentRecipe', JSON.stringify(recipe));
        }
    };
    
    // Carrega receita do sessionStorage se estiver disponível
    window.getRecipeFromStorage = function() {
        const saved = sessionStorage.getItem('currentRecipe');
        return saved ? JSON.parse(saved) : null;
    };
});
