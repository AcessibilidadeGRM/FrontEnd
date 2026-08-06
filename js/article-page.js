(function () {
  "use strict";

  function getQueryParam(name) {
    if (!window.location.search) {
      return null;
    }

    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function getSavedArticle() {
    if (typeof window.sessionStorage !== "object") {
      return null;
    }

    try {
      var stored = window.sessionStorage.getItem("deva11y:selectedArticle");
      return stored ? JSON.parse(stored) : null;
    } catch (_error) {
      return null;
    }
  }

  function isMarkdownEnabled() {
    return typeof window.marked === "function" || typeof window.marked === "object";
  }

  function sanitizeHtml(html) {
    if (typeof window.DOMPurify === "object" && typeof window.DOMPurify.sanitize === "function") {
      return window.DOMPurify.sanitize(html);
    }
    return html;
  }

  function renderMarkdown(content) {
    var raw = String(content || "");

    if (isMarkdownEnabled()) {
      try {
        return sanitizeHtml(window.marked.parse(raw));
      } catch (_error) {
        // fallback to plain text if marked fails
      }
    }

    return raw
      .split(/\n\n+/)
      .map(function (paragraph) {
        return "<p>" +
          String(paragraph)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>") +
          "</p>";
      })
      .join("");
  }

  function slugify(text) {
    var base = String(text || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "");

    return base || "secao";
  }

  function buildTableOfContents(bodyElement) {
    var tocAside = document.querySelector("[data-article-toc]");
    var tocList = document.querySelector("[data-article-toc-list]");

    if (!tocAside || !tocList) {
      return;
    }

    tocList.innerHTML = "";

    var headings = bodyElement.querySelectorAll("h1, h2, h3");
    var usedIds = Object.create(null);

    if (headings.length === 0) {
      tocAside.hidden = true;
      return;
    }

    headings.forEach(function (heading) {
      var slug = slugify(heading.textContent);
      var id = slug;
      var count = usedIds[slug] || 0;

      while (document.getElementById(id)) {
        count += 1;
        id = slug + "-" + count;
      }

      usedIds[slug] = count;
      heading.id = id;

      var item = document.createElement("li");
      item.className = "article-toc__item article-toc__item--" + heading.tagName.toLowerCase();

      var link = document.createElement("a");
      link.href = "#" + id;
      link.textContent = heading.textContent;

      item.appendChild(link);
      tocList.appendChild(item);
    });

    tocAside.hidden = false;
  }

  function renderArticle(article, authorName) {
    var titleElement = document.getElementById("titulo-artigo");
    var metaElement = document.getElementById("article-meta");
    var bodyElement = document.getElementById("article-body");
    var authorElement = document.getElementById("article-author");
    var tocAside = document.querySelector("[data-article-toc]");

    if (!titleElement || !metaElement || !bodyElement || !authorElement) {
      return;
    }

    if (!article || typeof article !== "object") {
      titleElement.textContent = "Artigo não encontrado";
      metaElement.textContent = "Não foi possível carregar os detalhes do artigo.";
      bodyElement.innerHTML = "<p>Volte para <a href=\"artigos.html\">Artigos</a> e selecione um item.</p>";
      authorElement.textContent = "";
      if (tocAside) {
        tocAside.hidden = true;
      }
      return;
    }

    titleElement.textContent = article.title || "Título não informado";
    metaElement.textContent = article.category ? "Categoria: " + article.category : "Categoria não informada";
    authorElement.textContent = authorName ? "Autor: " + authorName : "Autor não informado";

    var content = article.content || "Conteúdo não disponível.";
    bodyElement.innerHTML = renderMarkdown(content);

    if (Array.isArray(article.sections) && article.sections.length > 0) {
      article.sections.forEach(function (section) {
        var sectionTitle = document.createElement("h2");
        sectionTitle.textContent = section.title || "";
        bodyElement.appendChild(sectionTitle);

        var sectionText = document.createElement("p");
        sectionText.textContent = section.text || "";
        bodyElement.appendChild(sectionText);
      });
    }

    buildTableOfContents(bodyElement);
  }

  function loadAuthorName(authorId, callback) {
    if (!authorId || !callback || typeof callback !== "function") {
      callback(null);
      return;
    }

    var endpoint = "http://127.0.0.1:5000/v1/user/" + encodeURIComponent(authorId);

    if (typeof window.fetch !== "function") {
      callback(null);
      return;
    }

    window.fetch(endpoint, {
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
        if (!result.ok || !result.data || !result.data.name) {
          callback(null);
          return;
        }

        callback(result.data.name);
      })
      .catch(function () {
        callback(null);
      });
  }

    function determineArticle() {
    var savedArticle = getSavedArticle();
    var queryId = getQueryParam("id");
    var queryTitle = getQueryParam("title");

    if (queryId === "documentacao") {
        return {
            id: "documentacao",
            title: "NVDA: guia de referência para começar e testar interfaces",
            category: "Guia principal",
            content:
            "NVDA é a sigla de NonVisual Desktop Access. Trata-se de um leitor de telas gratuito e de código aberto que transforma informações visuais do Windows e de aplicações compatíveis em fala sintetizada ou em saída para uma linha braille. Seu objetivo é permitir que pessoas cegas ou com baixa visão percebam o conteúdo, entendam a estrutura da interface e operem controles principalmente pelo teclado."
        };
    }

    if (savedArticle && queryId && String(savedArticle.id) === String(queryId)) {
      return savedArticle;
    }

    if (savedArticle && queryTitle && String(savedArticle.title) === String(queryTitle)) {
      return savedArticle;
    }

    return savedArticle;
  }

  function initialize() {
    var article = determineArticle();

    if (!article || typeof article !== "object") {
      renderArticle(null);
      return;
    }

    if (article.author) {
      loadAuthorName(article.author, function (authorName) {
        renderArticle(article, authorName);
      });
      return;
    }

    renderArticle(article, null);
  }

  if (document.readyState === "loading" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
