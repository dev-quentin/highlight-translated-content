// ==UserScript==
// @name        Highlight translated Content
// @namespace   Violentmonkey Scripts
// @match       https://www.crunchyroll.com/*
// @grant       none
// @version     1.0
// @author      dev-quentin
// ==/UserScript==

// Declaration of constants
const defaultLocale = "n/a";
const locales = ["n/a", "hi-IN", "ta-IN", "pt-BR", "es-419", "de-DE", "te-IN", "en-US", "es-ES", "ja-JP", "ko-KR", "it-IT", "fr-FR", "ms-MY", "ar-SA", "id-ID", "th-TH", "ru-RU", "vi-VN"];
const translations = { "n/a": "All", "hi-IN": "हिंदी", "ta-IN": "தமிழ்", "pt-BR": "Português (Brasil)", "es-419": "Espanol (América Latina)", "de-DE": "Deutsch", "te-IN": "తెలుగు", "en-US": "English (US)", "es-ES": "Espanol (Espana)", "ja-JP": "日本語", "ko-KR": "한국어", "it-IT": "Italiano", "fr-FR": "Français", "ms-MY": "Melayu", "ar-SA": "عربي", "id-ID": "Indonesia", "th-TH": "ไทย", "ru-RU": "Русский", "vi-VN": "Vietnamese" };
const rtlLocales = ["ar-SA"];

// Variable declaration
let allOverlays = [];
let allAnimes = [];
let animesWithLocale = [];
let observerContent = null;

// Configuration recovery
const config = getConfig();
console.info('Crunchyroll Mod Menu locale: ' + translations[config.locale]);


// Style for browse cards
const style = document.createElement('style');
const opacityNotTranslated = config.hiddenNotTranslated ? '0' : '0.25';
const opacityHoverNotTranslated = config.hiddenNotTranslated ? '0' : '1';

style.innerHTML = `
.browse-card[data-translated="false"] {
    opacity: ${opacityNotTranslated} !important;
}

.browse-card[data-translated="false"]:hover {
    opacity: ${opacityHoverNotTranslated} !important;
}`;

document.head.appendChild(style);

// Mod menu creation
makeModMenu();
document.addEventListener('keydown', function (event) {
    if (event.key === "Insert") {
        event.preventDefault();
        switchDisplayModMenu();
    }
});

// XMLHttpRequest overload to filter animations by locale
const originalXMLHttpRequest = window.XMLHttpRequest;
window.XMLHttpRequest = () => { throw new Error('XMLHttpRequest is disabled.') };
window.XMLHttpRequest = class XMLHttpRequestProxy extends originalXMLHttpRequest {
    filterResult = false;

    constructor() {
        super();
        this.addEventListener('load', this.parseResponse.bind(this));
    }

    open(method, url, async, user, password) {
        if (url.includes('content/v2/discover/browse?n=') || url.includes('content/v2/discover/browse?start=')) {
            this.filterResult = true;
        }
        return super.open(method, url, async, user, password);
    }

    parseResponse() {
        if (this.filterResult) {
            this.filterAnime();
            setTimeout(parseAnimes, 1000);
        }
    }

    filterAnime() {
        if (!this.filterResult) return;

        const response = JSON.parse(this.responseText);
        if (config.locale === 'n/a') {
            setAnimes(response.data, response.data);
        } else {
            const animes = response.data.filter(anime => anime.series_metadata.audio_locales.includes(config.locale));
            setAnimes(response.data, animes);
        }
        this.filterResult = false;
    }
}

// Configuration recovery
function getConfig() {
    const config = sessionStorage.getItem('config');
    if (config) {
        return JSON.parse(config);
    }

    return {
        locale: defaultLocale,
        hiddenNotTranslated: false,
    };
}

// Save configuration
function setConfig(config) {
    sessionStorage.setItem('config', JSON.stringify(config));
}


// Updating anime tables
function setAnimes(newAnimes, newAnimesWithLocale) {
    allAnimes = allAnimes.concat(newAnimes);
    animesWithLocale = animesWithLocale.concat(newAnimesWithLocale);

    for (const anime of newAnimesWithLocale) {
        animesWithLocale.push(anime.id);
    }
    animesWithLocale = Array.from(new Set(animesWithLocale));
}

// Find node in collection
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
            if (!node) {
                throw new Error('Node not found');
            }
        }
        return node;
    }
    return foundNode;
}

function parseAnimes() {
    for (const anime of allAnimes) {
        const node = fetchBrowseCard(anime);
        if (node && !node.getAttribute('id')) {
            node.setAttribute('id', 'anime-' + anime.id);
        }

        if (animesWithLocale.includes(anime.id)) {
            node.setAttribute('data-translated', 'true');
        } else {
            node.setAttribute('data-translated', 'false');
            if (config.hiddenNotTranslated) {
                addOverlay(node);
            }
        }
    }
}

function observeCollection(collectionNode) {
    const observer = new MutationObserver(function (mutationList, observer) {
        parseAnimes();
    });
    observer.observe(collectionNode, { attributes: false, childList: true, subtree: true });
}

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
    legend.innerHTML = "<strong>Parameters :</strong>";

    const div4 = document.createElement('div');

    const selectLable = document.createElement('label');
    selectLable.setAttribute("for", "locale-select");
    selectLable.innerHTML = "<strong>Select language :</strong>";

    const select = document.createElement('select');
    select.setAttribute('id', 'locale-select');
    select.setAttribute('name', 'locale-select');
    select.style.margin = '15px auto';
    select.style.background = '#fff';
    select.style.borderRadius = '5px';
    select.style.width = '50%';

    for (const locale of locales) {
        const option = document.createElement('option');
        option.value = locale;
        option.innerText = translations[locale];
        option.selected = config.locale === locale;
        if (rtlLocales.includes(locale)) {
            option.setAttribute('dir', 'rtl');
        }
        select.appendChild(option);
    }

    const div5 = document.createElement('div');

    const checkLable = document.createElement('label');
    checkLable.setAttribute("for", "hidden-not-translated");
    checkLable.innerHTML = "<strong>Hide not translated :</strong>";

    const check = document.createElement('input');
    check.setAttribute('id', 'hidden-not-translated');
    check.setAttribute('name', 'hidden-not-translated');
    check.setAttribute('type', 'checkbox');
    check.style.margin = '15px auto';
    check.checked = config.hiddenNotTranslated ? true : false;

    const div6 = document.createElement('div');
    div6.style.display = 'flex';
    div6.style.justifyContent = 'end';
    div6.style.marginBottom = '20px';

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
        setConfig({
            locale: selectedLocale,
            hiddenNotTranslated: check.checked,
        });

        window.location.reload();
    })

    div4.appendChild(selectLable);
    div4.appendChild(select);

    div5.appendChild(checkLable);
    div5.appendChild(check);

    div6.appendChild(button);

    figure.appendChild(legend);
    figure.appendChild(div4);
    figure.appendChild(div5);
    figure.appendChild(div6);

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

function switchDisplayModMenu() {
    const div = document.getElementById('popup1');

    if (div.style.visibility === 'visible') {
        div.style.visibility = 'hidden';
        div.style.opacity = '0';
        div.blur();
    } else {
        div.style.visibility = 'visible';
        div.style.opacity = '1';
        div.focus();
    }

    const selectLocale = document.getElementById('locale-select');
    selectLocale.value = config.locale;

    const check = document.getElementById('hidden-not-translated');
    check.checked = config.hiddenNotTranslated ? true : false;
}

function addOverlay(node) {
    const anime = allAnimes.find(anime => anime.id === node.id.replace('anime-', ''));

    const img = document.createElement('img');
    img.style.top = node.offsetTop + 'px';
    img.style.left = node.offsetLeft + 'px';
    img.style.position = 'absolute';
    img.style.border = '1px solid #333';

    img.loading = "lazy";
    img.title = anime.title;
    img.src = `https://placehold.co/${node.offsetWidth}x${node.offsetHeight}/000000/FFF?text=Not+Translated`;

    document.body.appendChild(img);

    allOverlays.push(img);
}

function buildEnvironment() {
    const collectionNode = document.querySelector('div.erc-browse-collection');
    if (collectionNode) {
        observeCollection(collectionNode);
        return true;
    }

    const targetNode = document.getElementById("content");
    const callback = function (mutationList, observer) {
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
    };
    observerContent = new MutationObserver(callback);
    observerContent.observe(targetNode, { attributes: false, childList: true, subtree: true });
}

// Overloading history.pushState to detect URL changes
const originalPushState = history.pushState;
history.pushState = function (state) {
    const result = originalPushState.apply(history, arguments);
    if (typeof history.onpushstate === 'function') {
        history.onpushstate({ state: state });
    }
    return result;
};

history.onpushstate = function (event) {
    const destinationURL = document.location.href;
    if (destinationURL.includes('/videos/popular')) {
        buildEnvironment();
    } else {
        allAnimes = [];
        animesWithLocale = [];

        for (const overlay of allOverlays) {
            document.body.removeChild(overlay);
        }
        if (observerContent) {
            observerContent.disconnect();
        }
    }
};

// Initial construction of the environment
if (window.location.href.includes('/videos/popular')) {
    buildEnvironment();
} else {
    allAnimes = [];
    animesWithLocale = [];

    for (const overlay of allOverlays) {
        document.body.removeChild(overlay);
    }
    if (observerContent) {
        observerContent.disconnect();
    }
}
