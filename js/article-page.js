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

  function renderArticle(article) {
    var titleElement = document.getElementById("titulo-artigo");
    var metaElement = document.getElementById("article-meta");
    var bodyElement = document.getElementById("article-body");

    if (!titleElement || !metaElement || !bodyElement) {
      return;
    }

    if (!article || typeof article !== "object") {
      titleElement.textContent = "Artigo não encontrado";
      metaElement.textContent = "Não foi possível carregar os detalhes do artigo.";
      bodyElement.innerHTML = "<p>Volte para <a href=\"artigos.html\">Artigos</a> e selecione um item.</p>";
      return;
    }

    titleElement.textContent = article.title || "Título não informado";
    metaElement.textContent = article.category ? "Categoria: " + article.category : "Categoria não informada";

    var content = article.content || "Conteúdo não disponível.";
    bodyElement.innerHTML = "";

    var paragraphs = String(content).split(/\n\n+/);
    paragraphs.forEach(function (paragraph) {
      var p = document.createElement("p");
      p.textContent = paragraph;
      bodyElement.appendChild(p);
    });

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
    renderArticle(article);
  }

  if (document.readyState === "loading" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
