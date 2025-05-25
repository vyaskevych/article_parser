let articlesData = [];
let isProcessing = false;

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

    document.getElementById('parseBtn').disabled = true;
    document.getElementById('progress').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    document.getElementById('articlesContainer').innerHTML = '';
    document.getElementById('jsonOutput').style.display = 'none';

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
            keywords = keywordsSpan ? keywordsSpan.textContent.trim() : '';
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
            console.log(`Статття ${number}: успішно оброблено`);
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

    // Обробляємо ключові слова
    const keywordsArray = article.keywords ? 
        article.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
    
    const keywordsTags = keywordsArray.map(keyword =>
        `<span class="keyword-tag">${escapeHtml(keyword)}</span>`
    ).join('');

    articleDiv.innerHTML = `
        <div class="article-number">№ ${article.number}</div>
        <div class="article-title">${escapeHtml(article.title)}</div>
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

function updateJsonOutput() {
    if (articlesData.length > 0) {
        const jsonContent = JSON.stringify(articlesData, null, 2);
        document.getElementById('jsonContent').textContent = jsonContent;
        document.getElementById('jsonOutput').style.display = 'block';
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