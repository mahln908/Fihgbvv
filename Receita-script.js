// Configurações
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/14dMXRPrTP6SCldqhprh2wulLtZJZSL3XQpawWISATVc/values/Receitas%20Sabor%20de%20Casa?key=AIzaSyBqhpdzVXugN1GgkRUUHJ4Yo5JvjvY_wBc`;

// Elementos DOM
const recipeDetail = document.getElementById('recipe-detail');
const loadingElement = document.getElementById('loading');
const recipeError = document.getElementById('recipe-error');
const themeToggle = document.getElementById('theme-toggle');

// Carregar receita
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadRecipe();
});

// Inicializar tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Atualizar ícone do botão
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (savedTheme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

// Alternar tema
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

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

// Carregar receita da API
async function loadRecipe() {
    try {
        // Obter ID da receita do localStorage
        const recipeId = localStorage.getItem('selectedRecipeId');
        
        if (!recipeId) {
            throw new Error('Nenhuma receita selecionada');
        }
        
        const response = await fetch(SHEET_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.values || data.values.length <= 1) {
            throw new Error('Planilha vazia ou formato inválido');
        }
        
        // Processar dados da planilha
        const recipe = findRecipeById(data.values, parseInt(recipeId));
        
        if (!recipe) {
            throw new Error('Receita não encontrada');
        }
        
        // Renderizar receita
        renderRecipe(recipe);
        
    } catch (error) {
        console.error('Erro ao carregar receita:', error);
        showError();
    }
}

// Encontrar receita por ID
function findRecipeById(sheetData, recipeId) {
    // A primeira linha contém os cabeçalhos
    const headers = sheetData[0].map(header => header.toLowerCase());
    
    // Inverter a ordem (para corresponder ao carregamento de baixo para cima)
    const reversedData = sheetData.slice(1).reverse();
    
    // Encontrar receita pelo ID (índice + 1)
    const rowIndex = recipeId - 1;
    
    if (rowIndex >= 0 && rowIndex < reversedData.length) {
        const row = reversedData[rowIndex];
        const recipe = {};
        
        headers.forEach((header, i) => {
            recipe[header] = row[i] || '';
        });
        
        recipe.id = recipeId;
        
        return recipe;
    }
    
    return null;
}

// Renderizar receita
function renderRecipe(recipe) {
    // Esconder loading
    loadingElement.style.display = 'none';
    
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
    
    // Verificar se a receita está salva
    const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
    const isSaved = savedRecipes.includes(recipe.id);
    
    recipeDetail.innerHTML = `
        <article class="recipe-full">
            <div class="recipe-header">
                <div class="recipe-image-large">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="recipe-header-content">
                    <div class="recipe-header-top">
                        <h1 class="recipe-title-large">${recipe.nome || 'Receita sem nome'}</h1>
                        <button id="save-recipe-btn" class="save-recipe-btn-large" title="${isSaved ? 'Remover dos salvos' : 'Salvar receita'}">
                            <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                        </button>
                    </div>
                    <div class="recipe-meta-large">
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${recipe.categoria || 'Sem categoria'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="far fa-clock"></i>
                            <span>${recipe.tempo || 'Não especificado'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-user-friends"></i>
                            <span>${recipe.rendimento || 'Não especificado'}</span>
                        </div>
                    </div>
                    <p class="recipe-description">${recipe.mensagem || ''}</p>
                </div>
            </div>
            
            <div class="recipe-body">
                <div class="recipe-section">
                    <h2><i class="fas fa-list"></i> Ingredientes</h2>
                    <div class="ingredients-list">
                        ${formatIngredients(recipe.ingrediente)}
                    </div>
                </div>
                
                <div class="recipe-section">
                    <h2><i class="fas fa-list-ol"></i> Modo de Preparo</h2>
                    <div class="instructions">
                        ${formatInstructions(recipe.mododepreparo)}
                    </div>
                </div>
                
                ${recipe.url ? `
                <div class="recipe-section">
                    <h2><i class="fas fa-link"></i> Link da Receita</h2>
                    <div class="recipe-link">
                        <a href="${recipe.url}" target="_blank" class="external-link">
                            <i class="fas fa-external-link-alt"></i>
                            Ver receita original
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="recipe-actions-full">
                <button id="print-recipe" class="action-btn">
                    <i class="fas fa-print"></i>
                    Imprimir
                </button>
                <button id="share-recipe" class="action-btn">
                    <i class="fas fa-share-alt"></i>
                    Compartilhar
                </button>
                <a href="index.html" class="action-btn">
                    <i class="fas fa-arrow-left"></i>
                    Voltar
                </a>
            </div>
        </article>
    `;
    
    // Mostrar receita
    recipeDetail.style.display = 'block';
    
    // Configurar eventos
    setupRecipeEvents(recipe);
}

// Formatar ingredientes
function formatIngredients(ingredientsText) {
    if (!ingredientsText) {
        return '<p class="no-info">Ingredientes não disponíveis</p>';
    }
    
    // Tentar separar por vírgulas, pontos e vírgulas, ou quebras de linha
    const separators = /[,;]|\n/;
    const ingredients = ingredientsText.split(separators).filter(item => item.trim() !== '');
    
    if (ingredients.length === 0) {
        return `<p>${ingredientsText}</p>`;
    }
    
    return `
        <ul>
            ${ingredients.map(ing => `<li>${ing.trim()}</li>`).join('')}
        </ul>
    `;
}

// Formatar instruções
function formatInstructions(instructionsText) {
    if (!instructionsText) {
        return '<p class="no-info">Modo de preparo não disponível</p>';
    }
    
    // Tentar separar por números, pontos ou quebras de linha
    const steps = instructionsText.split(/(\d+\.|\n|•)/).filter(step => 
        step.trim() !== '' && !/^\d+\.$/.test(step)
    );
    
    if (steps.length === 0) {
        return `<p>${instructionsText}</p>`;
    }
    
    return `
        <ol>
            ${steps.map(step => `<li>${step.trim()}</li>`).join('')}
        </ol>
    `;
}

// Configurar eventos da receita
function setupRecipeEvents(recipe) {
    // Botão salvar
    const saveButton = document.getElementById('save-recipe-btn');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            toggleSaveRecipe(recipe.id, saveButton);
        });
    }
    
    // Botão imprimir
    const printButton = document.getElementById('print-recipe');
    if (printButton) {
        printButton.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Botão compartilhar
    const shareButton = document.getElementById('share-recipe');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            shareRecipe(recipe);
        });
    }
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

// Compartilhar receita
function shareRecipe(recipe) {
    if (navigator.share) {
        navigator.share({
            title: recipe.nome || 'Receita Sabor de Casa',
            text: `Confira esta receita: ${recipe.nome}`,
            url: window.location.href,
        })
        .catch(error => console.log('Erro ao compartilhar:', error));
    } else {
        // Fallback para copiar link
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                alert('Link copiado para a área de transferência!');
            })
            .catch(error => console.log('Erro ao copiar link:', error));
    }
}

// Mostrar erro
function showError() {
    loadingElement.style.display = 'none';
    recipeError.style.display = 'block';
}

// Adicionar estilos específicos para a página de receita
const style = document.createElement('style');
style.textContent = `
    .recipe-full {
        background-color: var(--light-color);
        border-radius: 15px;
        overflow: hidden;
        box-shadow: var(--shadow);
        padding: 30px;
        margin-top: 20px;
    }
    
    .recipe-header {
        display: flex;
        flex-direction: column;
        margin-bottom: 40px;
    }
    
    @media (min-width: 768px) {
        .recipe-header {
            flex-direction: row;
            gap: 40px;
        }
    }
    
    .recipe-image-large {
        width: 100%;
        height: 250px;
        background-color: var(--gray-color);
        background-image: linear-gradient(45deg, #f1f1f1 25%, transparent 25%), 
                          linear-gradient(-45deg, #f1f1f1 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #f1f1f1 75%), 
                          linear-gradient(-45deg, transparent 75%, #f1f1f1 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    @media (min-width: 768px) {
        .recipe-image-large {
            width: 300px;
        }
    }
    
    .recipe-image-large i {
        font-size: 5rem;
        color: var(--primary-color);
    }
    
    .recipe-header-content {
        flex: 1;
    }
    
    .recipe-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
    }
    
    .recipe-title-large {
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        color: var(--secondary-color);
        line-height: 1.2;
        margin-right: 20px;
    }
    
    .save-recipe-btn-large {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        font-size: 1.8rem;
        padding: 5px;
        transition: var(--transition);
        flex-shrink: 0;
    }
    
    .save-recipe-btn-large:hover {
        transform: scale(1.1);
    }
    
    .recipe-meta-large {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: var(--gray-color);
        padding: 8px 15px;
        border-radius: 20px;
    }
    
    .meta-item i {
        color: var(--primary-color);
    }
    
    .recipe-description {
        font-size: 1.1rem;
        line-height: 1.6;
        color: var(--dark-color);
        font-style: italic;
        padding: 15px;
        background-color: var(--gray-color);
        border-radius: 10px;
        border-left: 4px solid var(--primary-color);
    }
    
    .recipe-body {
        margin-bottom: 40px;
    }
    
    .recipe-section {
        margin-bottom: 40px;
    }
    
    .recipe-section h2 {
        font-family: 'Playfair Display', serif;
        font-size: 1.8rem;
        color: var(--secondary-color);
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--border-color);
    }
    
    .ingredients-list ul, .instructions ol {
        padding-left: 25px;
    }
    
    .ingredients-list li, .instructions li {
        margin-bottom: 10px;
        line-height: 1.6;
    }
    
    .no-info {
        color: #666;
        font-style: italic;
    }
    
    .recipe-link {
        margin-top: 10px;
    }
    
    .external-link {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        background-color: var(--primary-color);
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: 600;
        transition: var(--transition);
    }
    
    .external-link:hover {
        background-color: #c0392b;
    }
    
    .recipe-actions-full {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 20px;
        padding-top: 30px;
        border-top: 1px solid var(--border-color);
    }
    
    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 25px;
        background-color: var(--light-color);
        color: var(--dark-color);
        border: 2px solid var(--primary-color);
        border-radius: 50px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        text-decoration: none;
        font-family: inherit;
        font-size: 1rem;
    }
    
    .action-btn:hover {
        background-color: var(--primary-color);
        color: white;
    }
    
    @media (max-width: 768px) {
        .recipe-full {
            padding: 20px;
        }
        
        .recipe-title-large {
            font-size: 2rem;
        }
        
        .recipe-meta-large {
            flex-direction: column;
            gap: 10px;
        }
    }
`;
document.head.appendChild(style);
