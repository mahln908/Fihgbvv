// script.js - VERSÃO FINAL COM TODOS OS AJUSTES
document.addEventListener('DOMContentLoaded', function() {
    // Configurações da API - SUAS CREDENCIAIS
    const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    
    // Elementos DOM
    const recipesContainer = document.getElementById('recipes-container');
    const loadingElement = document.getElementById('loading');
    const noRecipesElement = document.getElementById('no-recipes');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoriesContainer = document.querySelector('.categories-scroll');
    const backToTopButton = document.getElementById('back-to-top');
    
    // Variáveis
    let allRecipes = [];
    let categories = new Set(['todos']); // Usando Set para evitar duplicatas
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearch = '';
    
    // Inicializar a aplicação
    initializeApp();
    
    async function initializeApp() {
        try {
            console.log('🚀 Iniciando carregamento das receitas...');
            await loadRecipesFromGoogleSheets();
            setupEventListeners();
            
            // Configurar botão voltar ao topo
            setupBackToTop();
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            showError('Erro ao conectar com as receitas. Recarregue a página.');
        }
    }
    
    // CARREGAR RECEITAS DA SUA PLANILHA
    async function loadRecipesFromGoogleSheets() {
        try {
            console.log('📡 Conectando com sua planilha do Google Sheets...');
            
            // URL da API do Google Sheets
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Receitas%20Sabor%20de%20Casa?key=${API_KEY}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Resposta da API:', errorText);
                throw new Error(`Erro na conexão: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                throw new Error('Sua planilha está vazia ou não encontrada');
            }
            
            console.log(`✅ Planilha carregada com sucesso! ${data.values.length} linhas encontradas.`);
            
            // Processar dados da sua planilha
            allRecipes = processYourSheetData(data.values);
            
            if (allRecipes.length === 0) {
                throw new Error('Nenhuma receita encontrada em sua planilha. Verifique os dados.');
            }
            
            console.log(`🍽️ ${allRecipes.length} receitas processadas da SUA planilha`);
            
            // Extrair categorias ÚNICAS da sua planilha
            extractUniqueCategories();
            
            // Renderizar categorias
            renderCategories();
            
            // Salvar no localStorage para página de detalhes
            localStorage.setItem('saborDeCasaRecipes', JSON.stringify(allRecipes));
            localStorage.setItem('saborDeCasaLastUpdate', Date.now().toString());
            
            // Mostrar todas as receitas inicialmente (invertidas para carregar de baixo para cima)
            filteredRecipes = [...allRecipes].reverse();
            renderRecipes();
            
            // Esconder loading
            loadingElement.classList.add('hidden');
            
            // Adicionar atraso para garantir que o CSS seja aplicado
            setTimeout(() => {
                recipesContainer.style.opacity = '1';
                recipesContainer.style.transform = 'translateY(0)';
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro ao carregar da sua planilha:', error);
            handleLoadError(error);
        }
    }
    
    // PROCESSAR DADOS DA SUA PLANILHA (ESTRUTURA ESPECÍFICA)
    function processYourSheetData(sheetData) {
        const recipes = [];
        
        if (!sheetData || sheetData.length < 2) {
            console.warn('⚠️ Planilha com poucos dados');
            return recipes;
        }
        
        // Cabeçalhos da sua planilha
        const headers = sheetData[0];
        console.log('📋 Cabeçalhos encontrados:', headers);
        
        // Mapear índices das colunas
        const columnIndex = {
            nome: headers.findIndex(h => h.toLowerCase().includes('nome')),
            categoria: headers.findIndex(h => h.toLowerCase().includes('categoria')),
            tempo: headers.findIndex(h => h.toLowerCase().includes('tempo')),
            ingrediente: headers.findIndex(h => h.toLowerCase().includes('ingrediente')),
            mododepreparo: headers.findIndex(h => h.toLowerCase().includes('modo') || h.toLowerCase().includes('preparo')),
            url: headers.findIndex(h => h.toLowerCase().includes('url')),
            mensagem: headers.findIndex(h => h.toLowerCase().includes('mensagem'))
        };
        
        console.log('📍 Índices das colunas:', columnIndex);
        
        // Processar cada linha de receita
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            
            // Pular linhas completamente vazias
            if (!row || row.every(cell => !cell || cell.trim() === '')) {
                continue;
            }
            
            // Criar objeto receita
            const recipe = {
                id: `recipe-${i}-${Date.now()}`,
                name: (columnIndex.nome !== -1 && row[columnIndex.nome]) ? row[columnIndex.nome].trim() : `Receita ${i}`,
                category: (columnIndex.categoria !== -1 && row[columnIndex.categoria]) ? row[columnIndex.categoria].trim() : 'Sem categoria',
                time: (columnIndex.tempo !== -1 && row[columnIndex.tempo]) ? row[columnIndex.tempo].trim() : 'Não especificado',
                ingredients: (columnIndex.ingrediente !== -1 && row[columnIndex.ingrediente]) ? row[columnIndex.ingrediente].trim() : 'Ingredientes não informados',
                instructions: (columnIndex.mododepreparo !== -1 && row[columnIndex.mododepreparo]) ? row[columnIndex.mododepreparo].trim() : 'Modo de preparo não informado',
                imageUrl: (columnIndex.url !== -1 && row[columnIndex.url]) ? processImageUrl(row[columnIndex.url].trim()) : getDefaultImage(),
                message: (columnIndex.mensagem !== -1 && row[columnIndex.mensagem]) ? row[columnIndex.mensagem].trim() : ''
            };
            
            // Só adicionar se tiver nome
            if (recipe.name && recipe.name.trim() !== '') {
                recipes.push(recipe);
                console.log(`📝 Receita "${recipe.name}" adicionada (Categoria: ${recipe.category})`);
            }
        }
        
        console.log(`📊 Total de receitas processadas: ${recipes.length}`);
        return recipes;
    }
    
    // Processar URL da imagem
    function processImageUrl(url) {
        if (!url || url.trim() === '') {
            return getDefaultImage();
        }
        
        // Limpar e normalizar URL
        url = url.trim();
        
        // Se for Google Drive, converter para link direto
        if (url.includes('drive.google.com')) {
            // Padrão 1: https://drive.google.com/file/d/FILE_ID/view
            let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            
            // Padrão 2: https://drive.google.com/open?id=FILE_ID
            if (!match) {
                match = url.match(/id=([a-zA-Z0-9-_]+)/);
            }
            
            if (match && match[1]) {
                return `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
        }
        
        return url;
    }
    
    // Imagem padrão
    function getDefaultImage() {
        const images = [
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&crop=center'
        ];
        
        return images[Math.floor(Math.random() * images.length)];
    }
    
    // EXTRAIR CATEGORIAS ÚNICAS (SEM REPETIR)
    function extractUniqueCategories() {
        categories.clear();
        categories.add('todos'); // Sempre incluir "todos"
        
        allRecipes.forEach(recipe => {
            if (recipe.category && recipe.category.trim() !== '' && recipe.category.trim() !== 'Sem categoria') {
                // Normalizar categoria (trim e capitalizar primeira letra)
                const normalizedCategory = recipe.category
                    .trim()
                    .toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());
                
                categories.add(normalizedCategory);
            }
        });
        
        console.log('🏷️ Categorias únicas encontradas:', Array.from(categories));
    }
    
    // RENDERIZAR CATEGORIAS
    function renderCategories() {
        // Limpar categorias existentes (exceto "Todas")
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn:not([data-category="todos"])');
        existingButtons.forEach(btn => btn.remove());
        
        // Converter Set para Array, ordenar alfabeticamente
        const sortedCategories = Array.from(categories)
            .filter(cat => cat !== 'todos')
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        
        // Adicionar cada categoria como botão
        sortedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.dataset.category = category;
            button.textContent = category;
            button.title = `Filtrar por: ${category}`;
            
            categoriesContainer.appendChild(button);
        });
        
        console.log(`✅ ${sortedCategories.length} categorias renderizadas`);
    }
    
    // RENDERIZAR RECEITAS COM ANIMAÇÃO
    function renderRecipes() {
        recipesContainer.innerHTML = '';
        
        if (filteredRecipes.length === 0) {
            noRecipesElement.classList.remove('hidden');
            return;
        }
        
        noRecipesElement.classList.add('hidden');
        
        // Renderizar receitas em ordem inversa (para animação de baixo para cima)
        filteredRecipes.forEach((recipe, index) => {
            const card = createRecipeCard(recipe);
            
            // Aplicar animação com delay progressivo
            card.style.animationDelay = `${index * 0.05}s`;
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            recipesContainer.appendChild(card);
            
            // Trigger animation
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 10 + (index * 50));
        });
    }
    
    // CRIAR CARD DE RECEITA
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Preparar conteúdo
        const ingredientsPreview = recipe.ingredients.length > 100 
            ? recipe.ingredients.substring(0, 100) + '...' 
            : recipe.ingredients;
        
        card.innerHTML = `
            <div class="recipe-image" style="background-image: url('${recipe.imageUrl}')">
                ${recipe.time !== 'Não especificado' ? 
                    `<div class="recipe-time"><i class="far fa-clock"></i> ${recipe.time}</div>` : ''}
            </div>
            <div class="recipe-content">
                <span class="recipe-category">${recipe.category}</span>
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-ingredients">${ingredientsPreview}</p>
                <div class="recipe-footer">
                    <!-- CLIQUE DIRETO PARA RECEITA COMPLETA -->
                    <a href="receita.html?id=${recipe.id}" class="recipe-link" 
                       onclick="saveRecipeToSession('${recipe.id}')">
                        <i class="fas fa-book-open"></i> Ver Receita Completa
                    </a>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // FILTRAR RECEITAS (BUSCA CASE-INSENSITIVE E PARCIAL)
    function filterRecipes() {
        const searchTerm = currentSearch.toLowerCase().trim();
        
        filteredRecipes = allRecipes.filter(recipe => {
            // Filtro por categoria
            const categoryMatch = currentCategory === 'todos' || 
                recipe.category.toLowerCase() === currentCategory.toLowerCase();
            
            // Se não há termo de busca, retornar apenas match de categoria
            if (!searchTerm) return categoryMatch;
            
            // Busca case-insensitive e parcial em múltiplos campos
            const searchInName = recipe.name.toLowerCase().includes(searchTerm);
            const searchInCategory = recipe.category.toLowerCase().includes(searchTerm);
            const searchInIngredients = recipe.ingredients.toLowerCase().includes(searchTerm);
            const searchInMessage = recipe.message ? recipe.message.toLowerCase().includes(searchTerm) : false;
            
            // Retornar true se qualquer campo contiver o termo de busca
            return categoryMatch && (searchInName || searchInCategory || searchInIngredients || searchInMessage);
        });
        
        // Inverter para mostrar as mais recentes primeiro
        filteredRecipes = [...filteredRecipes].reverse();
        
        renderRecipes();
    }
    
    // CONFIGURAR EVENT LISTENERS
    function setupEventListeners() {
        // Busca em tempo real
        searchInput.addEventListener('input', handleSearch);
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        
        // Categorias
        categoriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                handleCategoryClick(e.target);
            }
        });
    }
    
    // Configurar botão voltar ao topo
    function setupBackToTop() {
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', () => {
            backToTopButton.classList.toggle('hidden', window.scrollY < 300);
        });
    }
    
    // MANIPULAR CLIQUE EM CATEGORIA
    function handleCategoryClick(categoryButton) {
        // Remover active de todos os botões
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adicionar active ao botão clicado
        categoryButton.classList.add('active');
        currentCategory = categoryButton.dataset.category;
        
        // Aplicar filtros
        filterRecipes();
        
        // Scroll suave para receitas
        setTimeout(() => {
            window.scrollTo({
                top: recipesContainer.offsetTop - 120,
                behavior: 'smooth'
            });
        }, 100);
    }
    
    // MANIPULAR BUSCA
    function handleSearch() {
        currentSearch = searchInput.value;
        filterRecipes();
    }
    
    // MANIPULAR ERRO DE CARREGAMENTO
    function handleLoadError(error) {
        loadingElement.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
                <div style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: #2c3e50; margin-bottom: 15px;">Não foi possível carregar as receitas</h3>
                <p style="color: #6c757d; margin-bottom: 10px;"><strong>Erro:</strong> ${error.message}</p>
                <p style="color: #6c757d; margin-bottom: 25px;">
                    Verifique se sua planilha está pública e se o nome está correto.
                </p>
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
        `;
    }
    
    // MOSTRAR ERRO
    function showError(message) {
        console.error(message);
    }
    
    // FUNÇÕES GLOBAIS
    window.saveRecipeToSession = function(recipeId) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            // Salvar no sessionStorage para acesso imediato na página de receita
            sessionStorage.setItem('currentRecipe', JSON.stringify(recipe));
            
            // Também salvar no localStorage para backup
            const allRecipesJson = JSON.stringify(allRecipes);
            localStorage.setItem('saborDeCasaRecipes', allRecipesJson);
        }
    };
    
    window.resetFilters = function() {
        currentCategory = 'todos';
        currentSearch = '';
        searchInput.value = '';
        
        // Resetar botões de categoria
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === 'todos') {
                btn.classList.add('active');
            }
        });
        
        filteredRecipes = [...allRecipes].reverse();
        renderRecipes();
        
        // Scroll para topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
});
