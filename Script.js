// script.js - CONEXÃO DIRETA COM SUA PLANILHA
document.addEventListener('DOMContentLoaded', function() {
    // Configurações da API - USE SUAS CREDENCIAIS
    const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    
    // Elementos DOM
    const recipesContainer = document.getElementById('recipes-container');
    const loadingElement = document.getElementById('loading');
    const noRecipesElement = document.getElementById('no-recipes');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoriesContainer = document.querySelector('.categories-scroll');
    
    // Variáveis
    let allRecipes = [];
    let categories = new Set(['todos']);
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearch = '';
    
    // Inicializar
    initializeApp();
    
    async function initializeApp() {
        try {
            await loadRecipesFromGoogleSheets();
            setupEventListeners();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            showError('Erro ao conectar com as receitas. Recarregue a página.');
        }
    }
    
    // FUNÇÃO PRINCIPAL: CARREGAR RECEITAS DA SUA PLANILHA
    async function loadRecipesFromGoogleSheets() {
        try {
            console.log('🔄 Conectando com sua planilha do Google Sheets...');
            
            // URL da API do Google Sheets - NOME CORRETO DA PLANILHA
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Receitas%20Sabor%20de%20Casa?key=${API_KEY}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Falha na conexão: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                throw new Error('Sua planilha está vazia ou não encontrada');
            }
            
            console.log(`✅ Planilha carregada: ${data.values.length} linhas encontradas`);
            
            // Processar dados da SUA planilha
            allRecipes = processYourSheetData(data.values);
            
            if (allRecipes.length === 0) {
                throw new Error('Nenhuma receita encontrada em sua planilha');
            }
            
            console.log(`🍽️ ${allRecipes.length} receitas processadas da SUA planilha`);
            
            // Extrair categorias da SUA planilha
            extractCategoriesFromYourData();
            
            // Renderizar categorias
            renderCategories();
            
            // Salvar no localStorage para página de detalhes
            localStorage.setItem('saborDeCasaRecipes', JSON.stringify(allRecipes));
            
            // Mostrar todas as receitas inicialmente
            filteredRecipes = [...allRecipes];
            renderRecipes();
            
            // Esconder loading
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('❌ Erro ao carregar da sua planilha:', error);
            handleLoadError(error);
        }
    }
    
    // PROCESSAR DADOS DA SUA PLANILHA ESPECÍFICA
    function processYourSheetData(sheetData) {
        const recipes = [];
        
        if (!sheetData || sheetData.length < 2) {
            return recipes;
        }
        
        // Cabeçalhos da SUA planilha (conforme você especificou)
        const headers = sheetData[0];
        console.log('📋 Cabeçalhos da sua planilha:', headers);
        
        // Processar cada linha de receita
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            
            // Pular linhas vazias
            if (!row || row.length === 0) continue;
            
            // Criar objeto receita baseado nos cabeçalhos da SUA planilha
            const recipe = {
                id: `recipe-${i}-${Date.now()}`,
                name: getValue(row, headers, 'nome') || '',
                category: getValue(row, headers, 'categoria') || 'Sem categoria',
                time: getValue(row, headers, 'tempo') || 'Não especificado',
                ingredients: getValue(row, headers, 'ingrediente') || 'Ingredientes não informados',
                instructions: getValue(row, headers, 'mododepreparo') || 'Modo de preparo não informado',
                imageUrl: processImageUrl(getValue(row, headers, 'url')),
                message: getValue(row, headers, 'mensagem') || ''
            };
            
            // Apenas adicionar receitas com nome
            if (recipe.name.trim() !== '') {
                recipes.push(recipe);
                console.log(`📝 Receita adicionada: ${recipe.name} (${recipe.category})`);
            }
        }
        
        return recipes;
    }
    
    // Função auxiliar para obter valor baseado no cabeçalho
    function getValue(row, headers, headerName) {
        const index = headers.findIndex(h => 
            h.toLowerCase().trim().replace(/\s+/g, '') === headerName.toLowerCase().replace(/\s+/g, '')
        );
        
        if (index !== -1 && row[index]) {
            return row[index].trim();
        }
        
        return '';
    }
    
    // Processar URL da imagem
    function processImageUrl(url) {
        if (!url || url.trim() === '') {
            // Imagem padrão baseada na categoria
            return getDefaultImage();
        }
        
        // Se for Google Drive, converter para link direto
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
        }
        
        return url;
    }
    
    // Imagem padrão
    function getDefaultImage() {
        const images = [
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop'
        ];
        
        return images[Math.floor(Math.random() * images.length)];
    }
    
    // Extrair categorias da SUA planilha
    function extractCategoriesFromYourData() {
        categories.clear();
        categories.add('todos');
        
        allRecipes.forEach(recipe => {
            if (recipe.category && recipe.category.trim() !== '') {
                categories.add(recipe.category.trim());
            }
        });
        
        console.log('🏷️ Categorias encontradas na SUA planilha:', Array.from(categories));
    }
    
    // Renderizar categorias
    function renderCategories() {
        // Manter apenas o botão "Todas"
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn:not([data-category="todos"])');
        existingButtons.forEach(btn => btn.remove());
        
        // Adicionar categorias da SUA planilha
        Array.from(categories)
            .filter(cat => cat !== 'todos')
            .sort((a, b) => a.localeCompare(b))
            .forEach(category => {
                const button = document.createElement('button');
                button.className = 'category-btn';
                button.dataset.category = category;
                button.textContent = category;
                
                categoriesContainer.appendChild(button);
            });
        
        console.log(`✅ ${categories.size - 1} categorias renderizadas`);
    }
    
    // Renderizar receitas com animação
    function renderRecipes() {
        recipesContainer.innerHTML = '';
        
        if (filteredRecipes.length === 0) {
            noRecipesElement.classList.remove('hidden');
            return;
        }
        
        noRecipesElement.classList.add('hidden');
        
        // Renderizar em ordem inversa para animação de baixo para cima
        filteredRecipes.reverse().forEach((recipe, index) => {
            const card = createRecipeCard(recipe);
            card.style.animationDelay = `${index * 0.05}s`;
            recipesContainer.appendChild(card);
        });
        
        // Trigger reflow para animação
        recipesContainer.style.opacity = '0';
        setTimeout(() => {
            recipesContainer.style.opacity = '1';
        }, 10);
    }
    
    // Criar card de receita
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Truncar ingredientes para preview
        const ingredientsPreview = recipe.ingredients.length > 100 
            ? recipe.ingredients.substring(0, 100) + '...' 
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
                    <a href="receita.html?id=${recipe.id}" class="recipe-link" onclick="saveRecipe('${recipe.id}')">
                        <i class="fas fa-book-open"></i> Ver Receita
                    </a>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Filtrar receitas
    function filterRecipes() {
        filteredRecipes = allRecipes.filter(recipe => {
            // Filtro por categoria
            const categoryMatch = currentCategory === 'todos' || recipe.category === currentCategory;
            
            // Filtro por busca
            if (!currentSearch) return categoryMatch;
            
            const searchLower = currentSearch.toLowerCase();
            return categoryMatch && (
                recipe.name.toLowerCase().includes(searchLower) ||
                recipe.category.toLowerCase().includes(searchLower) ||
                recipe.ingredients.toLowerCase().includes(searchLower) ||
                (recipe.message && recipe.message.toLowerCase().includes(searchLower))
            );
        });
        
        renderRecipes();
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Busca
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        // Categorias
        categoriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                // Atualizar categoria ativa
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category;
                
                // Filtrar receitas
                filterRecipes();
                
                // Scroll suave para receitas
                window.scrollTo({
                    top: recipesContainer.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
        
        // Botão voltar ao topo
        const backToTopBtn = document.getElementById('back-to-top');
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('hidden', window.scrollY < 300);
        });
    }
    
    // Manipular busca
    function handleSearch() {
        currentSearch = searchInput.value.trim().toLowerCase();
        filterRecipes();
    }
    
    // Manipular erro de carregamento
    function handleLoadError(error) {
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
                <div style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Não foi possível carregar as receitas</h3>
                <p style="color: #6c757d; margin-bottom: 10px;"><strong>Erro:</strong> ${error.message}</p>
                <p style="color: #6c757d; margin-bottom: 25px;">Verifique se sua planilha do Google Sheets está pública.</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }
    
    // Mostrar erro
    function showError(message) {
        console.error(message);
    }
    
    // FUNÇÕES GLOBAIS
    window.saveRecipe = function(recipeId) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            localStorage.setItem('currentRecipe', JSON.stringify(recipe));
        }
    };
    
    window.resetFilters = function() {
        currentCategory = 'todos';
        currentSearch = '';
        searchInput.value = '';
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'todos') {
                btn.classList.add('active');
            }
        });
        
        filteredRecipes = [...allRecipes];
        renderRecipes();
    };
});
