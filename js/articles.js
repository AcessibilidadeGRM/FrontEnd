(function () {
  "use strict";

  function getApiBaseUrl() {
    return window.DEVA11Y_API_BASE_URL || "http://127.0.0.1:5000";
  }

  function createArticleUrl(article) {
    if (article && article.id === "documentacao") {
      return "documentacao.html";
    }

    var basePage = "article.html";

    if (article && article.id) {
      return basePage + "?id=" + encodeURIComponent(article.id);
    }

    if (
      article &&
      typeof article.link === "string" &&
      article.link.indexOf("documentacao.html") !== -1
    ) {
      return "documentacao.html";
    }

    if (article && article.title) {
      return basePage + "?title=" + encodeURIComponent(article.title);
    }

    return "#";
  }

  function storeArticleSelection(article) {
    if (!article || typeof window.sessionStorage !== "object") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        "deva11y:selectedArticle",
        JSON.stringify(article),
      );
    } catch (_error) {
      // ignore storage errors
    }
  }

  function createArticleCard(article) {
    var card = document.createElement("a");
    card.className = "article-card";
    card.href = createArticleUrl(article);
    card.setAttribute(
      "aria-label",
      article.title ? "Abrir " + article.title : "Abrir artigo",
    );

    if (!article.link && !article.title) {
      card.className += " article-card--placeholder";
    }

    card.addEventListener("click", function () {
      storeArticleSelection(article);
    });

    var title = document.createElement("h3");
    title.textContent = article.title || "Título não informado";

    var meta = document.createElement("p");
    meta.className = "article-meta";
    meta.textContent = article.category
      ? "Categoria: " + article.category
      : "Categoria não informada";

    var excerpt = document.createElement("p");
    excerpt.className = "article-excerpt";
    excerpt.textContent = article.content
      ? article.content.trim().slice(0, 220) +
        (article.content.length > 220 ? "…" : "")
      : "Sem resumo disponível.";

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(excerpt);

    return card;
  }

  function normalizeArticles(list) {
    var documentacaoArticle = {
      id: "documentacao",
      title: "NVDA: guia de referência para começar e testar interfaces",
      category: "Guia principal",
      content:
        "NVDA é a sigla de NonVisual Desktop Access. Trata-se de um leitor de telas gratuito e de código aberto que transforma informações visuais do Windows e de aplicações compatíveis em fala sintetizada ou em saída para uma linha braille. Seu objetivo é permitir que pessoas cegas ou com baixa visão percebam o conteúdo, entendam a estrutura da interface e operem controles principalmente pelo teclado.",
      link: "documentacao.html",
    };

    var normalized = Array.isArray(list) ? list.slice() : [];
    normalized = normalized.filter(function (item) {
      return String(item.title || "").trim() !== documentacaoArticle.title;
    });
    normalized.unshift(documentacaoArticle);
    return normalized;
  }

  function renderArticleList(articles) {
    var listContainer = document.querySelector("[data-article-list]");
    var emptyMessage = document.querySelector("[data-article-empty]");

    if (!listContainer) {
      return;
    }

    listContainer.innerHTML = "";

    if (!articles || articles.length === 0) {
      if (emptyMessage) {
        emptyMessage.textContent = "Nenhum artigo encontrado.";
        emptyMessage.hidden = false;
      }
      return;
    }

    if (emptyMessage) {
      emptyMessage.hidden = true;
    }

    articles.forEach(function (article) {
      listContainer.appendChild(createArticleCard(article));
    });
  }

  function getSearchQuery() {
    var input = document.querySelector("[data-search-input]");
    return input ? input.value.trim().toLowerCase() : "";
  }

  function filterArticles(articles) {
    var query = getSearchQuery();
    if (!query) {
      return articles;
    }

    return articles.filter(function (article) {
      return (
        String(article.title || "")
          .toLowerCase()
          .indexOf(query) !== -1
      );
    });
  }

  function loadArticles() {
    var endpoint = getApiBaseUrl() + "/v1/article/list";
    var listContainer = document.querySelector("[data-article-list]");
    var emptyMessage = document.querySelector("[data-article-empty]");

    if (listContainer) {
      listContainer.innerHTML = "";
    }

    if (emptyMessage) {
      emptyMessage.textContent = "Carregando artigos...";
      emptyMessage.hidden = false;
    }

    if (typeof window.fetch !== "function") {
      if (emptyMessage) {
        emptyMessage.textContent =
          "Seu navegador não suporta carregamento de artigos.";
      }
      return;
    }

    window
      .fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
      .then(function (response) {
        return response.json().then(function (data) {
          return {
            ok: response.ok,
            data: data,
          };
        });
      })
      .then(function (result) {
        if (!result.ok || !Array.isArray(result.data)) {
          if (emptyMessage) {
            emptyMessage.textContent = "Não foi possível carregar os artigos.";
          }
          return;
        }

        var ordered = normalizeArticles(result.data);
        renderArticleList(ordered);
        window.currentArticles = ordered;
      })
      .catch(function () {
        if (emptyMessage) {
          emptyMessage.textContent = "Não foi possível conectar ao servidor.";
        }
      });
  }

  function initializeSearch() {
    var form = document.querySelector("[data-article-search]");
    if (!form || typeof form.addEventListener !== "function") {
      return;
    }

    var submit = form.querySelector("[data-search-submit]");
    var status = document.querySelector("[data-search-status]");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (status) {
        status.textContent = "Filtrando artigos...";
      }

      var filtered = filterArticles(window.currentArticles || []);
      renderArticleList(filtered);

      if (status) {
        status.textContent =
          filtered.length === 0
            ? "Nenhum artigo encontrado."
            : filtered.length === 1
              ? "1 artigo encontrado."
              : String(filtered.length) + " artigos encontrados.";
      }
    });

    if (submit) {
      submit.disabled = false;
    }
  }

  function initialize() {
    loadArticles();
    initializeSearch();
  }

  if (
    document.readyState === "loading" &&
    typeof document.addEventListener === "function"
  ) {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
