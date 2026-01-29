document.addEventListener('DOMContentLoaded', function() {
    const SPREADSHEET_ID = '14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc';
    const API_KEY = 'AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc';
    
    const recipesContainer = document.getElementById('recipes-container');
    const loadingElement = document.getElementById('loading');
    const noRecipesElement = document.getElementById('no-recipes');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const categoriesContainer = document.querySelector('.categories-scroll');
    const backToTopButton = document.getElementById('back-to-top');
    
    let allRecipes = [];
    let categories = new Set(['todos']);
    let filteredRecipes = [];
    let currentCategory = 'todos';
    let currentSearch = '';
    
    init();
    
    async function init() {
        await loadRecipes();
        setupEventListeners();
    }
    
    async function loadRecipes() {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Receitas%20Sabor%20de%20Casa?key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Erro na API');
            
            const data = await response.json();
            
            if (!data.values) throw new Error('Planilha vazia');
            
            allRecipes = processSheetData(data.values);
            
            if (allRecipes.length === 0) throw new Error('Sem receitas');
            
            extractUniqueCategories();
            renderCategories();
            
            localStorage.setItem('saborDeCasaRecipes', JSON.stringify(allRecipes));
            
            filteredRecipes = [...allRecipes].reverse();
            renderRecipes();
            
            loadingElement.classList.add('hidden');
            
        } catch (error) {
            console.error('Erro:', error);
            loadingElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c;"></i>
                    <p>Erro ao carregar receitas</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
    
    function processSheetData(sheetData) {
        const recipes = [];
        
        if (!sheetData || sheetData.length < 2) return recipes;
        
        const headers = sheetData[0];
        
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row) continue;
            
            const recipe = {
                id: `recipe-${i}`,
                name: (row[0] || '').trim(),
                category: (row[1] || 'Sem categoria').trim(),
                time: (row[2] || '').trim(),
                ingredients: (row[3] || '').trim(),
                instructions: (row[4] || '').trim(),
                imageUrl: processImageUrl(row[5]),
                message: (row[6] || '').trim()
            };
            
            if (recipe.name) {
                recipes.push(recipe);
            }
        }
        
        return recipes;
    }
    
    function processImageUrl(url) {
        if (!url) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
        
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([^\/]+)/);
            if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
        
        return url;
    }
    
    function extractUniqueCategories() {
        categories.clear();
        categories.add('todos');
        
        const uniqueCategories = new Set();
        
        allRecipes.forEach(recipe => {
            if (recipe.category && recipe.category.trim() !== '') {
                uniqueCategories.add(recipe.category.trim());
            }
        });
        
        uniqueCategories.forEach(category => {
            categories.add(category);
        });
    }
    
    function renderCategories() {
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn:not([data-category="todos"])');
        existingButtons.forEach(btn => btn.remove());
        
        const sortedCategories = Array.from(categories)
            .filter(cat => cat !== 'todos')
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        
        sortedCategories.forEach(category => {
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
            const card = createRecipeCard(recipe);
            card.style.animationDelay = `${index * 0.05}s`;
            recipesContainer.appendChild(card);
        });
    }
    
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.onclick = () => openRecipe(recipe.id);
        
        card.innerHTML = `
            <div class="recipe-image" style="background-image: url('${recipe.imageUrl}')">
                ${recipe.time ? `<div class="recipe-time"><i class="far fa-clock"></i> ${recipe.time}</div>` : ''}
            </div>
            <div class="recipe-content">
                <span class="recipe-category">${recipe.category}</span>
                <h3 class="recipe-title">${recipe.name}</h3>
                <p class="recipe-ingredients">${recipe.ingredients.substring(0, 100)}...</p>
            </div>
        `;
        
        return card;
    }
    
    function openRecipe(recipeId) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        if (recipe) {
            localStorage.setItem('currentRecipe', JSON.stringify(recipe));
            window.location.href = `receita.html?id=${recipeId}`;
        }
    }
    
    function filterRecipes() {
        const searchTerm = currentSearch.toLowerCase();
        
        filteredRecipes = allRecipes.filter(recipe => {
            const categoryMatch = currentCategory === 'todos' || 
                recipe.category.toLowerCase() === currentCategory.toLowerCase();
            
            if (!searchTerm) return categoryMatch;
            
            const searchInName = recipe.name.toLowerCase().includes(searchTerm);
            const searchInCategory = recipe.category.toLowerCase().includes(searchTerm);
            const searchInIngredients = recipe.ingredients.toLowerCase().includes(searchTerm);
            
            return categoryMatch && (searchInName || searchInCategory || searchInIngredients);
        });
        
        filteredRecipes = [...filteredRecipes].reverse();
        renderRecipes();
    }
    
    function setupEventListeners() {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value;
            filterRecipes();
        });
        
        searchButton.addEventListener('click', () => {
            currentSearch = searchInput.value;
            filterRecipes();
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
    }
    
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
        
        filteredRecipes = [...allRecipes].reverse();
        renderRecipes();
    };
});
