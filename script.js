// ==UserScript==
// @name        Highlight translated Content
// @namespace   Violentmonkey Scripts
// @match       https://www.crunchyroll.com/*/videos/popular
// @grant       none
// @version     1.0
// @author      dev-quentin
// ==/UserScript==

// Default locale and translations
const defaultLocale = "n/a";
const locales = [
    "n/a", "hi-IN", "ta-IN", "pt-BR", "es-419", "de-DE", "te-IN", "en-US", "es-ES", "ja-JP", "ko-KR", "it-IT", "fr-FR"
];
const translations = {
    "n/a": "All", "hi-IN": "हिंदी", "ta-IN": "தமிழ்", "pt-BR": "Português", "es-419": "Espanol", "de-DE": "Deutsch",
    "te-IN": "తెలుగు", "en-US": "English", "es-ES": "Espanol", "ja-JP": "日本語", "ko-KR": "한국어", "it-IT": "Italiano",
    "fr-FR": "Français"
};

// Retrieve configuration
const config = getConfig();
console.info('Crunchyroll Mod Menu locale: ' + config.locale);

// Array to store all fetched animes
var allAnimes = [];

// Array to store animes with the specified locale
var animesWithLocale = [];

// Target node to observe for changes
const targetNode = document.getElementById("content");
const observer = new MutationObserver(function (mutationList, observer) {
    for (const mutation of mutationList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
                if (node.nodeName === "DIV" && node.className.includes('erc-browse-collection')) {
                    observeCollection(node);
                    observer.disconnect();
                }
            }
        }
    }
});
observer.observe(targetNode, { attributes: false, childList: true, subtree: true });

// Style for browse cards
const style = document.createElement('style');
style.innerHTML = `
.browse-card[data-translated="false"] {
    opacity: 0.25 !important;
}

.browse-card[data-translated="false"]:hover {
    opacity: 1 !important;
}
`;

document.head.appendChild(style);

// Create the mod menu
makeModMenu();
document.addEventListener('keydown', function (event) {
    if (event.key === "Insert") {
        event.preventDefault();
        switchDisplayModMenu();
    }
});

// Proxy XMLHttpRequest to filter animes with specified locale
const originalXMLHttpRequest = window.XMLHttpRequest;
window.XMLHttpRequest = () => { throw new Error('XMLHttpRequest is disabled.') };
window.XMLHttpRequest = class XMLHttpRequestProxy extends originalXMLHttpRequest {

    filterResult = false;
    newResponseText = null;

    constructor() {
        super();
        this.addEventListener('load', this.parseResponse.bind(this));
    }

    open(method, url, async, user, password) {
        if (
            url.includes('content/v2/discover/browse?n=') ||
            url.includes('content/v2/discover/browse?start=')
        ) {
            this.filterResult = true;
        }
        return super.open(method, url, async, user, password);
    }

    parseResponse() {
        if (this.filterResult) {
            this.filterAnime();
        }
    }

    filterAnime() {
        if (!this.filterResult) {
            return;
        }

        const response = JSON.parse(this.responseText);
        if (config.locale === 'n/a') {
            setAnimes(response.data, response.data);
        } else {
            const animes = response.data.filter(anime => {
                return anime.series_metadata.audio_locales.includes(config.locale);
            });
            setAnimes(response.data, animes);
        }
        this.filterResult = false;
    }
}

// Function to update the arrays of animes
function setAnimes(newAnimes, newAnimesWithLocale) {
    // Concatenate the new animes to the existing arrays
    allAnimes = allAnimes.concat(newAnimes);
    animesWithLocale = animesWithLocale.concat(newAnimesWithLocale);

    // Add the IDs of new animes with the specified locale to the array
    for (const anime of newAnimesWithLocale) {
        animesWithLocale.push(anime.id);
    }
    // Remove duplicates from the array of animes with specified locale
    animesWithLocale = Array.from(new Set(animesWithLocale));
}

// Function to fetch the browse card of an anime
function fetchBrowseCard(anime) {
    const foundNode = document.getElementById('anime-' + anime.id);
    if (!foundNode) {
        const link = anime.linked_resource_key.replace('cms:', '') + '/' + anime.slug_title;
        let node = document.querySelector(`a[href$="${link}"]`);
        if (!node) {
            throw new Error('Node not found');
        }

        while (node.className !== 'browse-card') {
            node = node.parentNode;
        }
        return node;
    }
    return foundNode;
}

// Function to observe changes in the collection of browse cards
function observeCollection(collectionNode) {
    const config = { attributes: false, childList: true, subtree: true };

    const callback = function (mutationList, observer) {
        for (const anime of allAnimes) {
            const node = fetchBrowseCard(anime);
            if (node && !node.getAttribute('id')) {
                node.setAttribute('id', 'anime-' + anime.id);
            }

            if (animesWithLocale.includes(anime.id)) {
                node.setAttribute('data-translated', 'true');
            } else {
                node.setAttribute('data-translated', 'false');
            }
        }
    }

    const observer = new MutationObserver(callback);
    observer.observe(collectionNode, config);
}

// Function to retrieve configuration from sessionStorage
function getConfig() {
    const config = sessionStorage.getItem('config');
    if (config) {
        return JSON.parse(config);
    }

    return {
        locale: defaultLocale,
    };
}

// Function to store configuration in sessionStorage
function setConfig(config) {
    sessionStorage.setItem('config', JSON.stringify(config));
}

// Function to create the mod menu
function makeModMenu() {

    const div = document.createElement('div');
    div.setAttribute('id', 'popup1');
    div.setAttribute('class', 'overlay');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.bottom = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.background = 'rgba(0, 0, 0, 0.7)';
    div.style.transition = 'opacity 500ms';
    div.style.visibility = 'hidden';
    div.style.opacity = '0';
    div.style.zIndex = '100';

    const div2 = document.createElement('div');
    div2.setAttribute('class', 'popup');
    div2.style.margin = '70px auto';
    div2.style.padding = '20px';
    div2.style.background = '#fff';
    div2.style.borderRadius = '5px';
    div2.style.width = '30%';
    div2.style.position = 'relative';
    div2.style.transition = 'all 5s ease-in-out';

    const h2 = document.createElement('h2');
    h2.innerText = 'Crunchyroll Mod Menu';
    h2.style.marginTop = '0';
    h2.style.color = '#333';

    const div3 = document.createElement('div');
    div3.setAttribute('class', 'content');
    div3.style.maxHeight = '30%';
    div3.style.overflow = 'auto';
    div3.style.color = '#333';

    const figure = document.createElement('figure');

    const legend = document.createElement('legend');
    legend.innerHTML = "<label for='locale-select'><strong>Select the locale :</strong></label>";

    const select = document.createElement('select');
    select.setAttribute('id', 'locale-select');
    select.setAttribute('name', 'locale-select');
    select.style.margin = '15px auto';
    select.style.background = '#fff';
    select.style.borderRadius = '5px';
    select.style.width = '30%';

    for (const locale of locales) {
        const option = document.createElement('option');
        option.value = locale;
        option.innerText = translations[locale];
        option.selected = config.locale === locale;
        select.appendChild(option);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.innerText = 'Apply';
    button.style.cursor = 'pointer';
    button.style.marginLeft = '15px';
    button.style.background = '#fff';
    button.style.border = '1px solid #333';
    button.style.borderRadius = '5px';
    button.style.width = '15%';

    button.addEventListener('click', function () {
        const selectedLocale = select.value;
        setConfig({ locale: selectedLocale });
        window.location.reload();
    })
    
    figure.appendChild(legend);
    figure.appendChild(select);
    figure.appendChild(button);

    div3.appendChild(figure);

    const p1 = document.createElement('p');
    p1.style.position = "absolute";
    p1.style.right = "10px";
    p1.style.bottom = "3px";
    p1.style.margin = "0";
    p1.innerHTML = "<strong>Made by :</strong> <i>dev-quentin</i>";

    div3.appendChild(p1);

    div2.appendChild(h2);
    div2.appendChild(div3);

    div.appendChild(div2);

    document.body.appendChild(div);
}

// Function to switch the display of the mod menu
function switchDisplayModMenu() {
    const div = document.getElementById('popup1');
    const selectLocale = document.getElementById('locale-select');
    
    if (div.style.visibility === 'visible') {
        div.style.visibility = 'hidden';
        div.style.opacity = '0';
        div.blur();
    } else {
        div.style.visibility = 'visible';
        div.style.opacity = '1';
        div.focus();
    }

    selectLocale.value = config.locale;
}
