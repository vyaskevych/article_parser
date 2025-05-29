let articlesData = [];
let isProcessing = false;
let allKeywords = new Set();


async function startParsing() {
    if (isProcessing) return;

    const startNum = parseInt(document.getElementById('startNum').value);
    const endNum = parseInt(document.getElementById('endNum').value);

    if (startNum > endNum) {
        alert('Початковий номер не може бути більшим за кінцевий!');
        return;
    }

    isProcessing = true;
    articlesData = [];
    allKeywords.clear();

    document.getElementById('parseBtn').disabled = true;
    document.getElementById('progress').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    document.getElementById('articlesContainer').innerHTML = '';
    document.getElementById('jsonOutput').style.display = 'none';
    document.getElementById('filterSection').style.display = 'none';


    let processed = 0;
    let found = 0;
    let errors = 0;
    const total = endNum - startNum + 1;

    for (let number = startNum; number <= endNum; number++) {
        try {
            const result = await parseArticle(number);
            if (result) {
                articlesData.push(result);
                found++;
                displayArticle(result);
            }
        } catch (error) {
            console.error(`Помилка при обробці статті ${number}:`, error);
            errors++;
        }

        processed++;
        updateProgress(processed, total, found, errors);

        // Невелика затримка для уникнення блокування браузера
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    updateJsonOutput();
    setupKeywordFilter();
    isProcessing = false;
    document.getElementById('parseBtn').disabled = false;
    document.getElementById('progressText').textContent = 'Парсинг завершено!';
}

async function parseArticle(number) {
    //const url = new URL('http://127.0.0.1:3001/api/allorigins');
    //https://node-proxy-yf6l.onrender.com
    const url = new URL('https://node-proxy-yf6l.onrender.com/api/allorigins');

    url.searchParams.set('number', number);

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Перевіряємо, чи є помилка в API відповіді
        if (!data.success) {
            if (data.error) {
                console.log(`Статття ${number}: ${data.error}`);
            }
            return null;
        }

        if (!data.contents) {
            console.log(`Статття ${number}: немає контенту`);
            return null;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');

        // Перевіряємо наявність анотації
        const annotationHeaders = doc.querySelectorAll('h2');
        let hasAnnotation = false;

        for (const header of annotationHeaders) {
            if (header.textContent.includes('Анотація')) {
                hasAnnotation = true;
                break;
            }
        }

        if (!hasAnnotation) {
            console.log(`Статття ${number}: не знайдено анотацію`);
            return null;
        }

        // Витягуємо заголовок
        const titleElement = doc.querySelector('h1.page_title');
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Витягуємо ключові слова
        const keywordsSection = doc.querySelector('section.item.keywords');
        let keywords = '';
        if (keywordsSection) {
            const keywordsSpan = keywordsSection.querySelector('span.value');
            keywords = keywordsSpan ? keywordsSpan.textContent.trim().replace(/\t+/g, ' ').replace(/\s+/g, ' ') : '';
        }

        // Витягуємо анотацію
        const abstractSection = doc.querySelector('section.item.abstract');
        let abstract = '';
        if (abstractSection) {
            const abstractP = abstractSection.querySelector('p');
            abstract = abstractP ? abstractP.textContent.trim() : '';
        }

        // Повертаємо результат, якщо є хоча б заголовок
        if (title || keywords || abstract) {
            console.log(`Стаття ${number}: успішно оброблено`);
            return {
                number: number,
                title: title,
                keywords: keywords,
                abstract: abstract
            };
        }

        console.log(`Статття ${number}: немає корисного контенту`);
        return null;

    } catch (error) {
        console.error(`Помилка при парсингу статті ${number}:`, error);
        throw error;
    }
}

function updateProgress(processed, total, found, errors) {
    const progress = (processed / total) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent =
        `Оброблено: ${processed}/${total} | Знайдено: ${found} | Помилок: ${errors}`;

    document.getElementById('totalProcessed').textContent = processed;
    document.getElementById('totalFound').textContent = found;
    document.getElementById('totalErrors').textContent = errors;
}

function displayArticle(article) {
    const container = document.getElementById('articlesContainer');
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-card';
    articleDiv.dataset.articleId = article.number;

    // Обробляємо ключові слова та додаємо їх до глобального набору
    const keywordsArray = article.keywords ?
        article.keywords.replace(/[;,]+/g, ',').split(',').map(k => k.trim().replace(/\.$/, '')).filter(k => k) : [];

    keywordsArray.forEach(keyword => {
        if (keyword && keyword.length > 0) {
            allKeywords.add(keyword.toLowerCase());
        }
    });

    const keywordsTags = keywordsArray.map(keyword =>
        `<span class="keyword-tag">${escapeHtml(keyword)}</span>`
    ).join('');

    articleDiv.innerHTML = `
        <div class="article-number">№ ${article.number}</div>
        <div class="article-title"><a href="https://www.csecurity.kubg.edu.ua/index.php/journal/article/view/${article.number}" target="_blank">${escapeHtml(article.title)}</a></div>
        ${article.keywords ? `
            <div class="article-keywords">
                <h4>Ключові слова:</h4>
                <div class="keywords-list">${keywordsTags}</div>
            </div>
        ` : ''}
        ${article.abstract ? `
            <div class="article-abstract">
                <h4>Анотація:</h4>
                <div>${escapeHtml(article.abstract)}</div>
            </div>
        ` : ''}
    `;

    container.appendChild(articleDiv);
}

// Функція для екранування HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функції для роботи з фільтром
function setupKeywordFilter() {
    if (articlesData.length === 0) return;

    // Показуємо секцію фільтра
    document.getElementById('filterSection').style.display = 'block';

    // Заповнюємо datalist унікальними ключовими словами
    const datalist = document.getElementById('keywordsList');
    datalist.innerHTML = '';

    const sortedKeywords = Array.from(allKeywords).sort();
    sortedKeywords.forEach(keyword => {
        const option = document.createElement('option');
        option.value = keyword;
        datalist.appendChild(option);
    });

    // Додаємо обробник подій для фільтра
    const filterInput = document.getElementById('keywordFilter');
    filterInput.addEventListener('input', filterArticles);

    // Оновлюємо статистику
    updateFilterStats();
}

function filterArticles() {
    const filterValue = document.getElementById('keywordFilter').value.toLowerCase().trim();
    const articleCards = document.querySelectorAll('.article-card');

    if (!filterValue) {
        // Показуємо всі статті, якщо фільтр порожній
        articleCards.forEach(card => {
            card.classList.remove('hidden');
        });
    } else {
        // Фільтруємо статті
        articleCards.forEach(card => {
            const articleId = parseInt(card.dataset.articleId);
            const article = articlesData.find(a => a.number === articleId);

            if (article && article.keywords) {
                const articleKeywords = article.keywords.toLowerCase();
                const hasKeyword = articleKeywords.includes(filterValue);

                if (hasKeyword) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            } else {
                card.classList.add('hidden');
            }
        });
    }

    updateFilterStats();
}

function clearFilter() {
    document.getElementById('keywordFilter').value = '';
    filterArticles();
}

function updateFilterStats() {
    const totalArticles = document.querySelectorAll('.article-card').length;
    const visibleArticles = document.querySelectorAll('.article-card:not(.hidden)').length;

    document.getElementById('totalCount').textContent = totalArticles;
    document.getElementById('visibleCount').textContent = visibleArticles;
}


function updateJsonOutput() {
    if (articlesData.length > 0) {
        const jsonContent = JSON.stringify(articlesData, null, 2);
        document.getElementById('jsonContent').textContent = jsonContent;
        document.getElementById('jsonOutput').style.display = 'block';

        // Показуємо фільтр тільки якщо є статті
        document.getElementById('filterSection').style.display = 'block';
        updateFilterStats();
    }
}

function copyToClipboard() {
    const jsonContent = document.getElementById('jsonContent').textContent;
    navigator.clipboard.writeText(jsonContent).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопійовано!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Не вдалося скопіювати: ', err);
        alert('Не вдалося скопіювати в буфер обміну');
    });
}

// Функція для очищення даних від табуляцій та заміни крапки з комою
function cleanDataForCSV(text) {
    if (!text) return '';
    return text
        //.replace(/\t+/g, ' ')  // Замінюємо табуляції на пробіли
        .replace(/;/g, ',')   // Замінюємо ; на ,
        .replace(/\r?\n/g, ' ') // Замінюємо переноси рядків на пробіли
        .trim();
}

// Функція для створення CSV контенту
function generateCSV() {
    if (articlesData.length === 0) {
        alert('Немає даних для експорту!');
        return;
    }

    // Заголовки CSV
    const headers = 'keywords;abstract;key\n';

    // Генеруємо рядки CSV
    const csvRows = articlesData.map(article => {
        const keywords = cleanDataForCSV(article.keywords);
        const abstract = cleanDataForCSV(article.abstract);
        const key = article.number;

        return `"${keywords}";"${abstract}";"${key}"`;
    });

    const csvContent = headers + csvRows.join('\n');
    return csvContent;
}

// Функція для завантаження CSV файлу
function downloadCSV() {
    const csvContent = generateCSV();
    if (!csvContent) return;

    // Створюємо Blob з CSV контентом
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Створюємо URL для завантаження
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `csecurity_articles_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';

    // Додаємо посилання до DOM і клікаємо по ньому
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Звільняємо пам'ять
    URL.revokeObjectURL(url);

    console.log('CSV файл завантажено успішно');
}

// Додаткова функція для перевірки стану сервера
async function checkServerStatus() {
    try {
        const response = await fetch('https://node-proxy-yf6l.onrender.com/api/stats');
        const stats = await response.json();
        console.log('Статистика сервера:', stats);
    } catch (error) {
        console.error('Сервер недоступний:', error);
    }
}

// Перевіряємо стан сервера при завантаженні сторінки
document.addEventListener('DOMContentLoaded', checkServerStatus);



// ===== LUNR.JS ПОШУК =====
let searchIndex = null;
let currentSearchQuery = '';
let searchResults = []; // Зберігаємо результати пошуку з score

// Створення індексу для пошуку
function createSearchIndex() {
    if (articlesData.length === 0) return;

    searchIndex = lunr(function () {
        this.use(lunr.multiLanguage('uk', 'en'));

        this.ref('number');
        this.field('title', { boost: 2 });
        this.field('keywords', { boost: 3 });
        this.field('abstract', { boost: 1 });

        articlesData.forEach(doc => this.add(doc));
    });
}

// Пошук статей
function searchArticles() {
    const query = document.getElementById('searchInput').value.trim();
    currentSearchQuery = query;

    if (!query) {
        // Якщо запит порожній, очищаємо результати пошуку
        searchResults = [];
        const articleCards = document.querySelectorAll('.article-card');
        articleCards.forEach(card => {
            card.classList.remove('search-hidden');
        });
        applyBothFilters();
        return;
    }

    if (!searchIndex) {
        console.error('Індекс пошуку не створено');
        return;
    }

    try {
        const results = searchIndex.search(query);
        searchResults = results; // Зберігаємо повні результати з score

        const foundNumbers = new Set(results.map(r => parseInt(r.ref)));

        // Застосовуємо результати пошуку
        const articleCards = document.querySelectorAll('.article-card');
        articleCards.forEach(card => {
            const articleId = parseInt(card.dataset.articleId);

            if (foundNumbers.has(articleId)) {
                card.classList.remove('search-hidden');

                // Додаємо score як data-атрибут для сортування
                const result = results.find(r => parseInt(r.ref) === articleId);
                if (result) {
                    card.dataset.searchScore = result.score.toFixed(3);
                }
            } else {
                card.classList.add('search-hidden');
                card.dataset.searchScore = '0';
            }
        });

        // Застосовуємо обидва фільтри та сортування
        applyBothFilters();
        applySorting();

    } catch (error) {
        console.error('Помилка пошуку:', error);
    }
}

// Застосування обох фільтрів одночасно
function applyBothFilters() {
    const keywordFilterValue = document.getElementById('keywordFilter').value.toLowerCase().trim();
    const articleCards = document.querySelectorAll('.article-card');

    articleCards.forEach(card => {
        const articleId = parseInt(card.dataset.articleId);
        const article = articlesData.find(a => a.number === articleId);

        let showBySearch = true;
        let showByKeyword = true;

        // Перевірка пошукового фільтра
        if (currentSearchQuery) {
            showBySearch = !card.classList.contains('search-hidden');
        }

        // Перевірка фільтра ключових слів
        if (keywordFilterValue && article && article.keywords) {
            const articleKeywords = article.keywords.toLowerCase();
            showByKeyword = articleKeywords.includes(keywordFilterValue);
        }

        // Показуємо картку тільки якщо вона проходить обидва фільтри
        if (showBySearch && showByKeyword) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    updateFilterStats();
}

// Очищення пошуку
function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearchQuery = '';
    searchResults = [];

    // Прибираємо search-hidden клас та score з усіх карток
    const articleCards = document.querySelectorAll('.article-card');
    articleCards.forEach(card => {
        card.classList.remove('search-hidden');
        card.dataset.searchScore = '0';
    });

    // Скидаємо сортування на замовчування
    document.getElementById('sortSelect').value = 'default';

    // Застосовуємо фільтр ключових слів та сортування
    applyBothFilters();
    applySorting();
}

// Функція сортування
function applySorting() {
    const sortValue = document.getElementById('sortSelect').value;
    const container = document.getElementById('articlesContainer');
    const cards = Array.from(container.children);

    cards.sort((a, b) => {
        switch (sortValue) {
            case 'relevance':
                // Сортування за релевантністю (вищий score спочатку)
                const scoreA = parseFloat(a.dataset.searchScore) || 0;
                const scoreB = parseFloat(b.dataset.searchScore) || 0;
                return scoreB - scoreA;

            case 'title':
                // Сортування за назвою (А-Я)
                const titleA = a.querySelector('.article-title').textContent.toLowerCase();
                const titleB = b.querySelector('.article-title').textContent.toLowerCase();
                return titleA.localeCompare(titleB, 'uk');

            case 'default':
            default:
                // Сортування за номером статті
                const numA = parseInt(a.dataset.articleId);
                const numB = parseInt(b.dataset.articleId);
                return numA - numB;
        }
    });

    // Перевставляємо картки в новому порядку
    cards.forEach(card => container.appendChild(card));
}

// Модифікована функція фільтрації за ключовими словами
function filterArticles() {
    applyBothFilters();
}

// Модифікована функція очищення фільтра
function clearFilter() {
    document.getElementById('keywordFilter').value = '';
    applyBothFilters();
}

// Модифікована функція setupKeywordFilter
function setupKeywordFilter() {
    if (articlesData.length === 0) return;

    // Показуємо секцію фільтра
    document.getElementById('filterSection').style.display = 'block';

    // Створюємо індекс для пошуку
    createSearchIndex();

    // Заповнюємо datalist унікальними ключовими словами
    const datalist = document.getElementById('keywordsList');
    datalist.innerHTML = '';

    const sortedKeywords = Array.from(allKeywords).sort();
    sortedKeywords.forEach(keyword => {
        const option = document.createElement('option');
        option.value = keyword;
        datalist.appendChild(option);
    });

    // Додаємо обробники подій
    const filterInput = document.getElementById('keywordFilter');
    const searchInput = document.getElementById('searchInput');

    filterInput.addEventListener('input', filterArticles);
    searchInput.addEventListener('input', searchArticles);

    // Оновлюємо статистику
    updateFilterStats();
}