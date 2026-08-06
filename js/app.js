(function () {
  "use strict";

  var STORAGE_KEY = "deva11y:preferences:v1";
  var DEFAULT_PREFERENCES = {
    palette: "palette-01",
    fontScale: 72
  };
  var VALID_PALETTES = [
    "palette-01",
    "palette-02",
    "palette-03",
    "palette-04",
    "palette-05",
    "palette-06",
    "palette-07",
    "palette-08"
  ];
  var COLOR_VISION_MODES = {
    "palette-01": {
      key: "standard",
      name: "Visão Padrão",
      condition: "Visão normal",
      coneStates: ["active", "active", "active"],
      paletteDescription: "Paleta de contraste em branco, azul-escuro e verde-claro.",
      description: "Três cones ativos e espectro visual completo."
    },
    "palette-02": {
      key: "achromatopsia",
      name: "Daltonismo Monocromático",
      condition: "Acromatopsia",
      coneStates: ["absent", "absent", "absent"],
      paletteDescription: "Paleta de contraste em preto, cinza neutro e branco.",
      description: "Cones vermelho, verde e azul ausentes; espectro em escala de cinza."
    },
    "palette-03": {
      key: "protanomaly",
      name: "Deficiência no Eixo Vermelho",
      condition: "Protanomalia",
      coneStates: ["weak", "active", "active"],
      paletteDescription: "Paleta de contraste em azul-violeta, amarelo e branco.",
      description: "Cone vermelho com percepção reduzida; azuis preservados e vermelhos convertidos em ocres escuros."
    },
    "palette-04": {
      key: "protanopia",
      name: "Deficiência no Eixo Vermelho",
      condition: "Protanopia",
      coneStates: ["absent", "active", "active"],
      paletteDescription: "Paleta de contraste em verde-escuro, ciano e branco.",
      description: "Cone vermelho ausente; espectro concentrado em azuis, amarelos e marrons."
    },
    "palette-05": {
      key: "deuteranomaly",
      name: "Deficiência no Eixo Verde",
      condition: "Deuteranomalia",
      coneStates: ["active", "weak", "active"],
      paletteDescription: "Paleta de contraste em cinza-escuro, cinza-claro e branco.",
      description: "Cone verde com percepção reduzida; verdes, amarelos e laranjas aproximados em tons terrosos."
    },
    "palette-06": {
      key: "deuteranopia",
      name: "Deficiência no Eixo Verde",
      condition: "Deuteranopia",
      coneStates: ["active", "absent", "active"],
      paletteDescription: "Paleta de contraste em azul-petróleo, verde-limão e branco.",
      description: "Cone verde ausente; espectro concentrado em azuis, amarelos e dourados escuros."
    },
    "palette-07": {
      key: "tritanomaly",
      name: "Deficiência no Eixo Azul",
      condition: "Tritanomalia",
      coneStates: ["active", "active", "weak"],
      paletteDescription: "Paleta de contraste em verde-petróleo, verde-claro e branco.",
      description: "Cone azul com percepção reduzida; azuis apagados e amarelos deslocados para tons pastéis e rosados."
    },
    "palette-08": {
      key: "tritanopia",
      name: "Deficiência no Eixo Azul",
      condition: "Tritanopia",
      coneStates: ["active", "active", "absent"],
      paletteDescription: "Paleta de contraste em verde-escuro, rosa e branco.",
      description: "Cone azul ausente; espectro concentrado em ciano, magenta e vermelho."
    }
  };
  var COLOR_VISION_FILTER_MATRICES = {
    achromatopsia: "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0",
    protanomaly: "0.385450 0.769005 -0.154455 0 0 0.100526 0.829802 0.069673 0 0 -0.007442 -0.022190 1.029632 0 0 0 0 0 1 0",
    protanopia: "0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0",
    deuteranomaly: "0.498864 0.674741 -0.173604 0 0 0.205199 0.754872 0.039929 0 0 -0.011131 0.030969 0.980162 0 0 0 0 0 1 0",
    deuteranopia: "0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.011820 0.042940 0.968881 0 0 0 0 0 1 0",
    tritanomaly: "1.104996 -0.046633 -0.058363 0 0 -0.032137 0.971635 0.060503 0 0 0.001336 0.317922 0.680742 0 0 0 0 0 1 0",
    tritanopia: "1.255528 -0.076749 -0.178779 0 0 -0.078411 0.930809 0.147602 0 0 0.004733 0.691367 0.303900 0 0 0 0 0 1 0"
  };
  var VALID_FONT_SCALES = [48, 60, 72, 84, 96];
  var LOADER_DURATION = 3500;
  var LOADER_EXIT_FALLBACK_DURATION = 240;
  var SPEECH_CHUNK_MAXIMUM_LENGTH = 180;
  var APP_SCRIPT_URL = findAppScriptUrl();
  var BRAND_LOGO_URL = resolveBrandLogoUrl(APP_SCRIPT_URL);
  var pageLoader = null;
  var loaderShownAt = 0;
  var loaderHideTimer = null;
  var loaderFallbackTimer = null;
  var loaderExitTimer = null;
  var loaderAnnouncementTimer = null;
  var loaderTransitionEndHandler = null;
  var loaderInertSiblings = [];
  var initialLoadingStarted = false;
  var initialLoadingHideRequested = false;
  var loadingLifecycleBound = false;
  var navigationInterceptionBound = false;
  var screenReaderButtons = [];
  var screenReaderReading = false;
  var screenReaderSequence = 0;
  var screenReaderPagehideBound = false;

  function findAppScriptUrl() {
    var currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
      return currentScript.src;
    }

    if (typeof document.getElementsByTagName !== "function") {
      return "";
    }

    var scripts = document.getElementsByTagName("script");

    for (var index = scripts.length - 1; index >= 0; index -= 1) {
      var source = scripts[index].src || "";
      var path = source.replace(/[?#].*$/, "");

      if (/(^|[\/\\])js[\/\\]app\.js$/i.test(path)) {
        return source;
      }
    }

    return "";
  }

  function resolveUrl(relativeUrl, baseUrl) {
    if (typeof window.URL === "function") {
      try {
        return new window.URL(relativeUrl, baseUrl).href;
      } catch (_error) {
        // Usa o elemento de link como alternativa em navegadores antigos.
      }
    }

    if (typeof document.createElement !== "function") {
      return relativeUrl;
    }

    var resolver = document.createElement("a");
    resolver.href = baseUrl;
    var normalizedBase = resolver.href.replace(/[?#].*$/, "");
    var lastSeparator = normalizedBase.lastIndexOf("/");

    resolver.href = lastSeparator === -1
      ? relativeUrl
      : normalizedBase.substring(0, lastSeparator + 1) + relativeUrl;

    return resolver.href;
  }

  function resolveBrandLogoUrl(scriptUrl) {
    if (scriptUrl) {
      return resolveUrl("../assets/images/DevA11Y-logo.png", scriptUrl);
    }

    var path = window.location.pathname || "";
    var relativeUrl = path.indexOf("/html/") !== -1 || path.indexOf("\\html\\") !== -1
      ? "../assets/images/DevA11Y-logo.png"
      : "./assets/images/DevA11Y-logo.png";

    return resolveUrl(relativeUrl, document.baseURI || window.location.href);
  }

  function hasClass(element, className) {
    return (" " + element.className + " ").indexOf(" " + className + " ") !== -1;
  }

  function addClass(element, className) {
    if (element && !hasClass(element, className)) {
      element.className = (element.className ? element.className + " " : "") + className;
    }
  }

  function removeClass(element, className) {
    if (!element) {
      return;
    }

    var classes = String(element.className || "").split(/\s+/);
    var remainingClasses = [];

    for (var index = 0; index < classes.length; index += 1) {
      if (classes[index] && classes[index] !== className) {
        remainingClasses.push(classes[index]);
      }
    }

    element.className = remainingClasses.join(" ");
  }

  function initializeBrandIdentity() {
    if (
      typeof document.querySelectorAll !== "function" ||
      typeof document.createElement !== "function"
    ) {
      return;
    }

    var brands = document.querySelectorAll(".site-header .brand");

    for (var index = 0; index < brands.length; index += 1) {
      var brand = brands[index];
      var logo = typeof brand.querySelector === "function"
        ? brand.querySelector("img.brand__logo")
        : null;

      if (!logo) {
        logo = document.createElement("img");
        logo.className = "brand__logo";
        brand.insertBefore(logo, brand.firstChild);
      }
      if (brand.firstChild !== logo) {
        brand.insertBefore(logo, brand.firstChild);
      }


      logo.setAttribute("alt", "");
      logo.setAttribute("src", BRAND_LOGO_URL);
    }
  }

  function ensurePageLoader() {
    if (
      typeof document.querySelector !== "function" ||
      typeof document.createElement !== "function" ||
      !document.body
    ) {
      return null;
    }

    pageLoader = document.querySelector(".site-loader");

    if (!pageLoader) {
      pageLoader = document.createElement("div");
      pageLoader.className = "site-loader";
      pageLoader.hidden = true;
      pageLoader.setAttribute("hidden", "");
      pageLoader.setAttribute("aria-hidden", "true");
      document.body.appendChild(pageLoader);
    }

    var content = pageLoader.querySelector(".site-loader__content");
    if (!content) {
      content = document.createElement("div");
      content.className = "site-loader__content";
      pageLoader.appendChild(content);
    }

    var logo = pageLoader.querySelector(".site-loader__logo");
    if (!logo) {
      logo = document.createElement("img");
      logo.className = "site-loader__logo";
    }
    logo.setAttribute("alt", "");
    logo.setAttribute("src", BRAND_LOGO_URL);
    content.appendChild(logo);

    var progress = pageLoader.querySelector(".site-loader__progress");
    if (!progress) {
      progress = document.createElement("div");
      progress.className = "site-loader__progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", "Carregamento da página");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");

      var progressValue = document.createElement("span");
      progressValue.className = "site-loader__progress-value";
      progress.appendChild(progressValue);
    }
    content.appendChild(progress);

    var text = pageLoader.querySelector(".site-loader__text");
    if (!text) {
      text = document.createElement("p");
      text.className = "site-loader__text";
    }
    content.appendChild(text);

    pageLoader.setAttribute("role", "status");
    pageLoader.setAttribute("aria-live", "polite");
    pageLoader.setAttribute("aria-atomic", "true");

    return pageLoader;
  }

  function clearLoaderTimers() {
    if (loaderHideTimer !== null) {
      window.clearTimeout(loaderHideTimer);
      loaderHideTimer = null;
    }

    if (loaderFallbackTimer !== null) {
      window.clearTimeout(loaderFallbackTimer);
      loaderFallbackTimer = null;
    }

    if (loaderAnnouncementTimer !== null) {
      window.clearTimeout(loaderAnnouncementTimer);
      loaderAnnouncementTimer = null;
    }
  }

  function cancelLoaderExit() {
    if (loaderExitTimer !== null) {
      window.clearTimeout(loaderExitTimer);
      loaderExitTimer = null;
    }

    if (
      pageLoader &&
      loaderTransitionEndHandler &&
      typeof pageLoader.removeEventListener === "function"
    ) {
      pageLoader.removeEventListener("transitionend", loaderTransitionEndHandler);
    }

    loaderTransitionEndHandler = null;
  }

  function makeLoaderSiblingsInert(loader) {
    if (!document.body || loaderInertSiblings.length > 0) {
      return;
    }

    var children = document.body.children || [];

    for (var index = 0; index < children.length; index += 1) {
      var sibling = children[index];
      if (sibling === loader || typeof sibling.setAttribute !== "function") {
        continue;
      }

      var inertPropertySupported = "inert" in sibling;
      loaderInertSiblings.push({
        element: sibling,
        hadAttribute: typeof sibling.hasAttribute === "function"
          ? sibling.hasAttribute("inert")
          : sibling.getAttribute("inert") !== null,
        attributeValue: sibling.getAttribute("inert"),
        propertySupported: inertPropertySupported,
        propertyValue: inertPropertySupported ? sibling.inert === true : false
      });
      sibling.setAttribute("inert", "");
      if (inertPropertySupported) {
        sibling.inert = true;
      }
    }
  }

  function restoreLoaderSiblings() {
    for (var index = 0; index < loaderInertSiblings.length; index += 1) {
      var state = loaderInertSiblings[index];
      var sibling = state.element;

      if (!sibling || typeof sibling.removeAttribute !== "function") {
        continue;
      }

      if (state.propertySupported) {
        sibling.inert = state.propertyValue;
      }

      if (state.hadAttribute) {
        sibling.setAttribute("inert", state.attributeValue === null ? "" : state.attributeValue);
      } else {
        sibling.removeAttribute("inert");
      }
    }

    loaderInertSiblings = [];
  }

  function finalizePageLoaderHide() {
    cancelLoaderExit();

    if (pageLoader) {
      var text = pageLoader.querySelector(".site-loader__text");
      pageLoader.setAttribute("aria-hidden", "true");
      pageLoader.hidden = true;
      pageLoader.setAttribute("hidden", "");

      if (text) {
        text.textContent = "";
      }
    }

    restoreLoaderSiblings();
    removeClass(document.body, "is-page-loading");
  }

  function hasLoaderExitTransition(loader) {
    if (typeof window.getComputedStyle !== "function") {
      return true;
    }

    var transitionDurations = window.getComputedStyle(loader).transitionDuration.split(",");

    for (var index = 0; index < transitionDurations.length; index += 1) {
      var duration = transitionDurations[index].trim();
      var durationInMilliseconds = 0;

      if (duration.slice(-2) === "ms") {
        durationInMilliseconds = parseFloat(duration);
      } else if (duration.slice(-1) === "s") {
        durationInMilliseconds = parseFloat(duration) * 1000;
      }

      if (durationInMilliseconds > 0) {
        return true;
      }
    }

    return false;
  }

  function hidePageLoader() {
    clearLoaderTimers();

    if (!pageLoader && typeof document.querySelector === "function") {
      pageLoader = document.querySelector(".site-loader");
    }

    if (!pageLoader) {
      restoreLoaderSiblings();
      removeClass(document.body, "is-page-loading");
      return;
    }

    if (loaderExitTimer !== null) {
      return;
    }

    removeClass(pageLoader, "site-loader--visible");

    if (pageLoader.hidden || pageLoader.getAttribute("hidden") !== null) {
      finalizePageLoaderHide();
      return;
    }

    if (!hasLoaderExitTransition(pageLoader)) {
      finalizePageLoaderHide();
      return;
    }

    if (typeof pageLoader.addEventListener === "function") {
      loaderTransitionEndHandler = function (event) {
        if (
          event &&
          event.target === pageLoader &&
          (!event.propertyName || event.propertyName === "opacity")
        ) {
          finalizePageLoaderHide();
        }
      };
      pageLoader.addEventListener("transitionend", loaderTransitionEndHandler);
    }

    loaderExitTimer = window.setTimeout(
      finalizePageLoaderHide,
      LOADER_EXIT_FALLBACK_DURATION
    );
  }

  function showPageLoader() {
    var loader = ensurePageLoader();
    if (!loader) {
      return false;
    }

    clearLoaderTimers();
    cancelLoaderExit();
    loaderShownAt = new Date().getTime();

    if (loader.style && typeof loader.style.setProperty === "function") {
      loader.style.setProperty("--loader-duration", String(LOADER_DURATION) + "ms");
    }

    var text = loader.querySelector(".site-loader__text");
    if (text) {
      text.textContent = "";
    }

    loader.hidden = false;
    loader.removeAttribute("hidden");
    loader.removeAttribute("aria-hidden");
    makeLoaderSiblingsInert(loader);
    addClass(loader, "site-loader--visible");
    addClass(document.body, "is-page-loading");

    loaderAnnouncementTimer = window.setTimeout(function () {
      loaderAnnouncementTimer = null;
      if (text && hasClass(loader, "site-loader--visible")) {
        text.textContent = "Carregando…";
      }
    }, 0);

    loaderFallbackTimer = window.setTimeout(hidePageLoader, LOADER_DURATION);
    return true;
  }

  function requestInitialLoaderHide() {
    if (initialLoadingHideRequested) {
      return;
    }

    initialLoadingHideRequested = true;
    var elapsed = new Date().getTime() - loaderShownAt;
    var remainingDuration = Math.max(0, LOADER_DURATION - elapsed);

    loaderHideTimer = window.setTimeout(hidePageLoader, remainingDuration);
  }

  function initializeInitialLoading() {
    if (!initialLoadingStarted && showPageLoader()) {
      initialLoadingStarted = true;
    }

    if (!initialLoadingStarted) {
      return;
    }

    if (!loadingLifecycleBound && typeof window.addEventListener === "function") {
      window.addEventListener("load", requestInitialLoaderHide);
      window.addEventListener("pageshow", function (event) {
        if (event && event.persisted === true) {
          hidePageLoader();
        }
      });
      loadingLifecycleBound = true;
    }

    if (document.readyState === "complete") {
      requestInitialLoaderHide();
    }
  }

  function findLink(target) {
    var current = target;

    while (current && current !== document) {
      if (current.nodeType === 1 && String(current.tagName).toLowerCase() === "a") {
        return current;
      }
      current = current.parentNode;
    }

    return null;
  }

  function hasDownloadAttribute(link) {
    if (typeof link.hasAttribute === "function") {
      return link.hasAttribute("download");
    }

    return link.getAttribute("download") !== null;
  }

  function normalizedPathname(pathname) {
    if (!pathname) {
      return "/";
    }

    return pathname.charAt(0) === "/" ? pathname : "/" + pathname;
  }

  function getInternalPageHref(link) {
    var hrefAttribute = link.getAttribute("href");
    if (hrefAttribute === null) {
      return null;
    }

    var target = String(link.getAttribute("target") || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    if ((target && target !== "_self") || hasDownloadAttribute(link)) {
      return null;
    }

    var protocol = String(link.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:" && protocol !== "file:") {
      return null;
    }

    if (
      protocol !== String(window.location.protocol || "").toLowerCase() ||
      String(link.host || "").toLowerCase() !== String(window.location.host || "").toLowerCase()
    ) {
      return null;
    }

    var destinationPage = normalizedPathname(link.pathname) + (link.search || "");
    var currentPage = normalizedPathname(window.location.pathname) + (window.location.search || "");

    return destinationPage === currentPage ? null : link.href;
  }

  function navigateAfterPaint(destination) {
    var navigationStarted = false;

    function navigate() {
      if (navigationStarted) {
        return;
      }

      navigationStarted = true;
      try {
        window.location.href = destination;
      } catch (_error) {
        hidePageLoader();
      }
    }

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(navigate);
      });
      window.setTimeout(navigate, 120);
      return;
    }

    window.setTimeout(navigate, 50);
  }

  function initializeNavigationLoading() {
    if (
      navigationInterceptionBound ||
      typeof document.addEventListener !== "function"
    ) {
      return;
    }

    document.addEventListener("click", function (event) {
      if (
        !event ||
        event.defaultPrevented === true ||
        event.returnValue === false ||
        (typeof event.button === "number" && event.button !== 0) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      var link = findLink(event.target);
      var destination = link ? getInternalPageHref(link) : null;
      if (!destination || typeof event.preventDefault !== "function") {
        return;
      }

      event.preventDefault();

      if (!showPageLoader()) {
        window.location.href = destination;
        return;
      }

      navigateAfterPaint(destination);
    });

    navigationInterceptionBound = true;
  }

  function initializeGlobalIdentityAndLoading() {
    try {
      initializeBrandIdentity();
    } catch (_error) {
      // Identidade e loading permanecem independentes.
    }

    try {
      initializeInitialLoading();
    } catch (_error) {
      // Os demais recursos continuam disponíveis sem suporte ao overlay.
    }

    try {
      initializeNavigationLoading();
    } catch (_error) {
      // A navegação nativa permanece disponível.
    }
  }


  function isValidPalette(value) {
    return typeof value === "string" && VALID_PALETTES.indexOf(value) !== -1;
  }

  function getColorVisionMode(palette) {
    return COLOR_VISION_MODES[palette] || COLOR_VISION_MODES[DEFAULT_PREFERENCES.palette];
  }

  function ensureColorVisionFilters() {
    if (
      typeof document.createElementNS !== "function" ||
      typeof document.getElementById !== "function" ||
      !document.body ||
      document.getElementById("deva11y-color-vision-filters")
    ) {
      return;
    }

    var namespace = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("id", "deva11y-color-vision-filters");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");

    var definitions = document.createElementNS(namespace, "defs");
    var filterNames = Object.keys(COLOR_VISION_FILTER_MATRICES);

    for (var index = 0; index < filterNames.length; index += 1) {
      var filterName = filterNames[index];
      var filter = document.createElementNS(namespace, "filter");
      filter.setAttribute("id", "deva11y-color-filter-" + filterName);
      filter.setAttribute("x", "-20%");
      filter.setAttribute("y", "-20%");
      filter.setAttribute("width", "140%");
      filter.setAttribute("height", "140%");
      filter.setAttribute("color-interpolation-filters", "linearRGB");

      var matrix = document.createElementNS(namespace, "feColorMatrix");
      matrix.setAttribute("type", "matrix");
      matrix.setAttribute("values", COLOR_VISION_FILTER_MATRICES[filterName]);
      filter.appendChild(matrix);
      definitions.appendChild(filter);
    }

    svg.appendChild(definitions);
    document.body.appendChild(svg);
  }

  function createVisionFilterLabel(className, text) {
    var label = document.createElement("span");
    label.className = className;
    label.textContent = text;
    return label;
  }

  function enhanceColorVisionControls(paletteButtons) {
    if (!paletteButtons || paletteButtons.length === 0) {
      return;
    }

    var coneNames = ["red", "green", "blue"];

    for (var index = 0; index < paletteButtons.length; index += 1) {
      var button = paletteButtons[index];
      var palette = button.getAttribute("data-palette-option");
      var mode = getColorVisionMode(palette);
      button.textContent = "";
      button.setAttribute("data-color-vision-mode", mode.key);
      button.setAttribute(
        "aria-label",
        mode.name + ", " + mode.condition + ". " +
          mode.paletteDescription + " " + mode.description
      );

      button.appendChild(createVisionFilterLabel("vision-filter__name", mode.name));
      button.appendChild(
        createVisionFilterLabel("vision-filter__condition", mode.condition)
      );

      var icons = createVisionFilterLabel("vision-filter__icons", "");
      icons.setAttribute("aria-hidden", "true");

      for (var coneIndex = 0; coneIndex < coneNames.length; coneIndex += 1) {
        var cone = createVisionFilterLabel("vision-filter__cone", "");
        cone.className +=
          " vision-filter__cone--" + coneNames[coneIndex] +
          " vision-filter__cone--" + mode.coneStates[coneIndex];
        icons.appendChild(cone);
      }

      button.appendChild(icons);

      var paletteLabel = createVisionFilterLabel(
        "vision-filter__preview-label",
        "Paleta de contraste"
      );
      paletteLabel.setAttribute("aria-hidden", "true");
      button.appendChild(paletteLabel);

      var palettePreview = createVisionFilterLabel("vision-filter__palette", "");
      palettePreview.setAttribute("aria-hidden", "true");
      button.appendChild(palettePreview);

      var spectrumLabel = createVisionFilterLabel(
        "vision-filter__preview-label",
        "Espectro percebido"
      );
      spectrumLabel.setAttribute("aria-hidden", "true");
      button.appendChild(spectrumLabel);

      var spectrum = createVisionFilterLabel("vision-filter__spectrum", "");
      spectrum.setAttribute("aria-hidden", "true");
      button.appendChild(spectrum);
    }

    var fieldset = paletteButtons[0].parentNode;
    while (fieldset && String(fieldset.tagName).toLowerCase() !== "fieldset") {
      fieldset = fieldset.parentNode;
    }

    if (!fieldset) {
      return;
    }

    var legend = fieldset.querySelector("legend");
    if (legend) {
      legend.textContent = "Simular visão de cores";
    }

    var help = fieldset.querySelector("[data-color-vision-help]");
    if (!help) {
      help = document.createElement("p");
      help.setAttribute("data-color-vision-help", "");
      help.className = "vision-filter__help";
      help.id = "color-vision-help";
      help.textContent =
        "Cada opção mantém sua paleta de contraste e aplica um filtro de simulação à página inteira.";

      if (legend && legend.parentNode === fieldset) {
        fieldset.insertBefore(help, legend.nextSibling);
      } else {
        fieldset.insertBefore(help, fieldset.firstChild);
      }
    }

    paletteButtons[0].parentNode.setAttribute("aria-describedby", help.id);
  }

  function isValidFontScale(value) {
    return typeof value === "number" && VALID_FONT_SCALES.indexOf(value) !== -1;
  }

  function announce(message) {
    if (typeof document.querySelector !== "function") {
      return;
    }

    var liveRegion = document.querySelector("[data-live-region]");
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  function normalizeSpeechText(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  }

  function splitSpeechText(value, maximumLength) {
    var text = normalizeSpeechText(value);
    var chunks = [];

    while (text.length > maximumLength) {
      var windowText = text.substring(0, maximumLength + 1);
      var breakIndex = -1;
      var punctuationMatches = /[.!?;:](?=\s)/g;
      var match;

      while ((match = punctuationMatches.exec(windowText)) !== null) {
        breakIndex = match.index + 1;
      }

      if (breakIndex < Math.floor(maximumLength * 0.5)) {
        breakIndex = windowText.lastIndexOf(" ", maximumLength);
      }

      if (breakIndex <= 0) {
        breakIndex = maximumLength;
      }

      chunks.push(normalizeSpeechText(text.substring(0, breakIndex)));
      text = normalizeSpeechText(text.substring(breakIndex));
    }

    if (text) {
      chunks.push(text);
    }

    return chunks;
  }

  function updateScreenReaderButtons() {
    for (var index = 0; index < screenReaderButtons.length; index += 1) {
      var button = screenReaderButtons[index];
      button.setAttribute("aria-pressed", screenReaderReading ? "true" : "false");
      button.setAttribute(
        "aria-label",
        screenReaderReading ? "Parar leitura da página" : "Iniciar leitura da página"
      );
      button.textContent = screenReaderReading
        ? "Parar leitura da página"
        : "Iniciar leitura da página";
    }
  }

  function stopPageReading(message) {
    screenReaderSequence += 1;
    screenReaderReading = false;

    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === "function") {
      window.speechSynthesis.cancel();
    }

    updateScreenReaderButtons();

    if (message) {
      announce(message);
    }
  }

  function startPageReading() {
    stopPageReading("");

    var main = document.querySelector("main");
    var pageTitle = normalizeSpeechText(document.title);
    var mainText = main
      ? normalizeSpeechText(
        typeof main.innerText === "string" ? main.innerText : main.textContent
      )
      : "";
    var speechText = pageTitle;

    if (mainText) {
      speechText += (speechText ? ". " : "") + mainText;
    }

    var chunks = splitSpeechText(speechText, SPEECH_CHUNK_MAXIMUM_LENGTH);
    if (chunks.length === 0) {
      announce("Não há conteúdo principal disponível para leitura.");
      return;
    }

    screenReaderReading = true;
    updateScreenReaderButtons();
    announce("Leitura da página iniciada.");

    var sequence = screenReaderSequence;
    var chunkIndex = 0;

    function speakNextChunk() {
      if (!screenReaderReading || sequence !== screenReaderSequence) {
        return;
      }

      if (chunkIndex >= chunks.length) {
        screenReaderReading = false;
        updateScreenReaderButtons();
        announce("Leitura da página concluída.");
        return;
      }

      var utterance = new window.SpeechSynthesisUtterance(chunks[chunkIndex]);
      chunkIndex += 1;
      utterance.lang = "pt-BR";
      utterance.onend = speakNextChunk;
      utterance.onerror = function () {
        if (sequence !== screenReaderSequence) {
          return;
        }

        screenReaderSequence += 1;
        screenReaderReading = false;
        updateScreenReaderButtons();
        announce("A leitura da página foi interrompida.");
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (_error) {
        utterance.onerror();
      }
    }

    speakNextChunk();
  }

  function initializeScreenReader() {
    if (
      typeof document.querySelectorAll !== "function" ||
      typeof document.createElement !== "function"
    ) {
      return;
    }

    var panels = document.querySelectorAll("[data-a11y-tools]");
    var supported = Boolean(
      window.speechSynthesis &&
      typeof window.speechSynthesis.speak === "function" &&
      typeof window.speechSynthesis.cancel === "function" &&
      typeof window.SpeechSynthesisUtterance === "function"
    );

    for (var index = 0; index < panels.length; index += 1) {
      var panel = panels[index];
      var fieldset = panel.querySelector("[data-screen-reader-fieldset]");

      if (!fieldset) {
        fieldset = document.createElement("fieldset");
        fieldset.setAttribute("data-screen-reader-fieldset", "");

        var legend = document.createElement("legend");
        legend.textContent = "Leitor de tela";
        fieldset.appendChild(legend);

        var button = document.createElement("button");
        button.type = "button";
        button.className = "button button--secondary";
        button.setAttribute("data-screen-reader-toggle", "");
        button.setAttribute("aria-pressed", "false");
        fieldset.appendChild(button);

        var container = panel.querySelector(
          ".a11y-fields, .a11y-panel, .a11y-tools__panel"
        ) || panel;
        var closeButton = container.querySelector("[data-a11y-close]");

        if (closeButton && closeButton.parentNode === container) {
          container.insertBefore(fieldset, closeButton);
        } else {
          container.appendChild(fieldset);
        }
      }

      var toggle = fieldset.querySelector("[data-screen-reader-toggle]");
      if (!toggle) {
        continue;
      }

      if (!supported) {
        var supportMessage = fieldset.querySelector("[data-screen-reader-support]");

        if (!supportMessage) {
          supportMessage = document.createElement("p");
          supportMessage.setAttribute("data-screen-reader-support", "");
          supportMessage.id = "screen-reader-support-" + String(index + 1);
          supportMessage.textContent =
            "Leitura em voz alta indisponível: este navegador não oferece suporte à Web Speech API.";
          fieldset.appendChild(supportMessage);
        }

        toggle.disabled = true;
        toggle.setAttribute("aria-pressed", "false");
        toggle.setAttribute("aria-describedby", supportMessage.id);
        toggle.setAttribute("aria-label", "Leitura da página indisponível");
        toggle.textContent = "Leitura da página indisponível";
        continue;
      }

      if (screenReaderButtons.indexOf(toggle) === -1) {
        screenReaderButtons.push(toggle);
      }

      if (toggle.getAttribute("data-screen-reader-bound") !== "true") {
        toggle.setAttribute("data-screen-reader-bound", "true");
        toggle.addEventListener("click", function () {
          if (screenReaderReading) {
            stopPageReading("Leitura da página interrompida.");
          } else {
            startPageReading();
          }
        });
      }
    }

    updateScreenReaderButtons();

    if (
      supported &&
      !screenReaderPagehideBound &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("pagehide", function () {
        stopPageReading("");
      });
      screenReaderPagehideBound = true;
    }
  }

  function createCustomEvent(name, detail) {
    if (typeof window.CustomEvent === "function") {
      return new window.CustomEvent(name, { detail: detail });
    }

    if (typeof document.createEvent === "function") {
      var event = document.createEvent("CustomEvent");
      event.initCustomEvent(name, false, false, detail);
      return event;
    }

    return null;
  }

  function initializePreferences() {
    if (
      !document.documentElement ||
      typeof document.querySelector !== "function" ||
      typeof document.querySelectorAll !== "function"
    ) {
      return;
    }

    var root = document.documentElement;
    var preferences = {
      palette: DEFAULT_PREFERENCES.palette,
      fontScale: DEFAULT_PREFERENCES.fontScale
    };
    var storage = null;

    try {
      if ("localStorage" in window) {
        storage = window.localStorage;
        var storedValue = storage.getItem(STORAGE_KEY);

        if (storedValue) {
          var storedPreferences = JSON.parse(storedValue);

          if (storedPreferences && typeof storedPreferences === "object") {
            if (isValidPalette(storedPreferences.palette)) {
              preferences.palette = storedPreferences.palette;
            }

            if (isValidFontScale(storedPreferences.fontScale)) {
              preferences.fontScale = storedPreferences.fontScale;
            }
          }
        }
      }
    } catch (_error) {
      storage = null;
    }

    function applyPreferences() {
      var colorVisionMode = getColorVisionMode(preferences.palette);
      root.setAttribute("data-palette", preferences.palette);
      root.setAttribute("data-color-vision", colorVisionMode.key);
      root.setAttribute("data-font-scale", String(preferences.fontScale));
    }

    function savePreferences() {
      if (!storage || typeof storage.setItem !== "function") {
        return;
      }

      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (_error) {
        storage = null;
      }
    }

    function dispatchPreferenceChange() {
      if (typeof document.dispatchEvent !== "function") {
        return;
      }

      var event = createCustomEvent("deva11y:preferences-changed", {
        palette: preferences.palette,
        colorVision: getColorVisionMode(preferences.palette).key,
        fontScale: preferences.fontScale
      });

      if (event) {
        document.dispatchEvent(event);
      }
    }

    ensureColorVisionFilters();
    applyPreferences();

    var panel = document.querySelector("[data-a11y-tools]");
    if (!panel || typeof panel.addEventListener !== "function") {
      return;
    }

    var summary = panel.querySelector("summary");
    var paletteButtons = panel.querySelectorAll("[data-palette-option]");
    enhanceColorVisionControls(paletteButtons);
    var decreaseButton = panel.querySelector("[data-font-decrease]");
    var increaseButton = panel.querySelector("[data-font-increase]");
    var fontLabel = panel.querySelector("[data-font-label]");
    var closeButton = panel.querySelector("[data-a11y-close]");

    function updateControls() {
      var index;

      for (index = 0; index < paletteButtons.length; index += 1) {
        var buttonPalette = paletteButtons[index].getAttribute("data-palette-option");
        paletteButtons[index].setAttribute(
          "aria-pressed",
          buttonPalette === preferences.palette ? "true" : "false"
        );
      }

      var scaleIndex = VALID_FONT_SCALES.indexOf(preferences.fontScale);

      if (fontLabel) {
        fontLabel.textContent = String(preferences.fontScale) + "%";
      }

      if (decreaseButton) {
        decreaseButton.disabled = scaleIndex <= 0;
      }

      if (increaseButton) {
        increaseButton.disabled = scaleIndex === VALID_FONT_SCALES.length - 1;
      }
    }

    function commitUserPreference(message) {
      applyPreferences();
      updateControls();
      savePreferences();
      dispatchPreferenceChange();
      announce(message);
    }

    function closePanel() {
      if (!("open" in panel) || !panel.open) {
        return;
      }

      panel.open = false;

      if (summary && typeof summary.focus === "function") {
        summary.focus();
      }
    }

    for (var index = 0; index < paletteButtons.length; index += 1) {
      var paletteButton = paletteButtons[index];

      if (typeof paletteButton.addEventListener !== "function") {
        continue;
      }

      paletteButton.addEventListener("click", function (event) {
        var selectedPalette = event.currentTarget.getAttribute("data-palette-option");

        if (!isValidPalette(selectedPalette) || selectedPalette === preferences.palette) {
          return;
        }

        var selectedMode = getColorVisionMode(selectedPalette);
        preferences.palette = selectedPalette;
        commitUserPreference(
          selectedMode.condition + " ativada. " +
          selectedMode.paletteDescription + " Filtro aplicado à página inteira."
        );
      });
    }

    if (decreaseButton && typeof decreaseButton.addEventListener === "function") {
      decreaseButton.addEventListener("click", function () {
        var currentIndex = VALID_FONT_SCALES.indexOf(preferences.fontScale);

        if (currentIndex <= 0) {
          return;
        }

        preferences.fontScale = VALID_FONT_SCALES[currentIndex - 1];
        commitUserPreference(
          "Tamanho da fonte alterado para " + String(preferences.fontScale) + "%."
        );
      });
    }

    if (increaseButton && typeof increaseButton.addEventListener === "function") {
      increaseButton.addEventListener("click", function () {
        var currentIndex = VALID_FONT_SCALES.indexOf(preferences.fontScale);

        if (currentIndex < 0 || currentIndex >= VALID_FONT_SCALES.length - 1) {
          return;
        }

        preferences.fontScale = VALID_FONT_SCALES[currentIndex + 1];
        commitUserPreference(
          "Tamanho da fonte alterado para " + String(preferences.fontScale) + "%."
        );
      });
    }

    if (closeButton && typeof closeButton.addEventListener === "function") {
      closeButton.addEventListener("click", function () {
        closePanel();
      });
    }

    panel.addEventListener("keydown", function (event) {
      if ((event.key === "Escape" || event.keyCode === 27) && panel.open) {
        event.preventDefault();
        closePanel();
      }
    });

    updateControls();
  }

function getAuthToken() {
      try {
        return window.localStorage.getItem("deva11y:auth:token");
      } catch (_error) {
        return null;
      }
    }

    function updateCreateContentLinkVisibility(token) {
      if (typeof document.querySelectorAll !== "function") {
        return;
      }

      var links = document.querySelectorAll('a[href$="post.html"]');
      var hideLink = !token;

      for (var index = 0; index < links.length; index += 1) {
        var link = links[index];
        if (!link) {
          continue;
        }

        var listItem = link.parentElement;
        if (listItem && listItem.tagName && listItem.tagName.toLowerCase() === "li") {
          listItem.hidden = hideLink;
          if (hideLink) {
            listItem.setAttribute("aria-hidden", "true");
          } else {
            listItem.removeAttribute("aria-hidden");
          }
        } else {
          link.hidden = hideLink;
          if (hideLink) {
            link.setAttribute("aria-hidden", "true");
          } else {
            link.removeAttribute("aria-hidden");
          }
        }
      }
    }

    function normalizeSearchText(value) {
      var normalized = String(value || "");

      if (typeof normalized.normalize === "function") {
        normalized = normalized.normalize("NFD");
      } else {
        normalized = normalized.replace(/[ÁÀÂÃÄáàâãä]/g, "a");
        normalized = normalized.replace(/[ÉÈÊËéèêë]/g, "e");
        normalized = normalized.replace(/[ÍÌÎÏíìîï]/g, "i");
        normalized = normalized.replace(/[ÓÒÔÕÖóòôõö]/g, "o");
        normalized = normalized.replace(/[ÚÙÛÜúùûü]/g, "u");
        normalized = normalized.replace(/[Çç]/g, "c");
      }

      return normalized.replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

  function initializeContentSearch() {
    if (
      typeof document.querySelectorAll !== "function" ||
      typeof document.querySelector !== "function"
    ) {
      return;
    }

    var searchForms = document.querySelectorAll("[data-content-search]");

    for (var formIndex = 0; formIndex < searchForms.length; formIndex += 1) {
      (function (form) {
        if (typeof form.addEventListener !== "function") {
          return;
        }

        var input = form.querySelector("[data-search-input]");
        var status = form.querySelector("[data-search-status]") ||
          document.querySelector("[data-search-status]");
        var submitButton = form.querySelector("[data-search-submit]");
        var items = document.querySelectorAll("[data-search-item]");

        if (
          !input ||
          !status ||
          !submitButton ||
          items.length === 0 ||
          typeof input.addEventListener !== "function"
        ) {
          return;
        }

        function updateSearchResults() {
          var rawQuery = input.value.trim();
          var query = normalizeSearchText(rawQuery);
          var visibleCount = 0;

          for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
            var item = items[itemIndex];
            var matches = query === "" || normalizeSearchText(item.textContent).indexOf(query) !== -1;
            item.hidden = !matches;

            if (matches) {
              visibleCount += 1;
            }
          }

          if (query === "") {
            status.textContent = items.length === 1
              ? "1 conteúdo disponível."
              : String(items.length) + " conteúdos disponíveis.";
          } else if (visibleCount === 0) {
            status.textContent = "Nenhum resultado encontrado.";
          } else {
            status.textContent = visibleCount === 1
              ? "1 resultado encontrado."
              : String(visibleCount) + " resultados encontrados.";
          }
        }

        input.addEventListener("input", updateSearchResults);
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          updateSearchResults();
        });
        submitButton.disabled = false;
        updateSearchResults();
      }(searchForms[formIndex]));
    }
  }

  function initializeExercise() {
    if (typeof document.querySelector !== "function") {
      return;
    }

    var form = document.querySelector("[data-exercise-form]");
    if (!form || typeof form.addEventListener !== "function") {
      return;
    }

    var feedback = form.querySelector("[data-exercise-feedback]") ||
      document.querySelector("[data-exercise-feedback]");
    var resetButton = form.querySelector("[data-exercise-reset]") ||
      document.querySelector("[data-exercise-reset]");
    var radios = form.querySelectorAll('input[name="answer"]');
    var submitButton = form.querySelector("[data-exercise-submit]");

    if (radios.length === 0 || !feedback || !submitButton) {
      return;
    }

    function clearFeedback() {
      feedback.textContent = "";
      feedback.hidden = true;
      feedback.removeAttribute("data-state");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var selectedAnswer = form.querySelector('input[name="answer"]:checked');
      feedback.hidden = false;

      if (!selectedAnswer) {
        feedback.setAttribute("data-state", "warning");
        feedback.textContent = "Selecione uma resposta antes de verificar.";
        return;
      }

      if (selectedAnswer.value === "semantic-role") {
        feedback.setAttribute("data-state", "correct");
        feedback.textContent =
          "Resposta correta! Uma div clicável não comunica o papel de botão nem oferece, por padrão, a interação esperada pelo teclado. Use um elemento button.";
      } else {
        feedback.setAttribute("data-state", "incorrect");
        feedback.textContent =
          "Resposta incorreta. O problema principal é a ausência de um botão semântico, que impede que o controle comunique corretamente seu papel e comportamento.";
      }
    });

    form.addEventListener("reset", clearFeedback);

    if (
      resetButton &&
      typeof resetButton.addEventListener === "function" &&
      String(resetButton.getAttribute("type")).toLowerCase() !== "reset"
    ) {
      resetButton.addEventListener("click", function () {
        if (typeof form.reset === "function") {
          form.reset();
        } else {
          clearFeedback();
        }
      });
    }

    submitButton.disabled = false;
    clearFeedback();
  }

  function initializeCreationForm() {
      if (typeof document.querySelector !== "function") {
        return;
      }

      var form = document.querySelector("[data-creation-form]");
      if (!form || typeof form.addEventListener !== "function") {
        return;
      }

      var editor = form.querySelector("[data-content-editor]");
      var wordCounter = form.querySelector("[data-word-count]") ||
        document.querySelector("[data-word-count]");
      var characterCounter = form.querySelector("[data-character-count]") ||
        document.querySelector("[data-character-count]");
      var status = form.querySelector("[data-form-status]") ||
        document.querySelector("[data-form-status]");
      var titleField = form.querySelector('[name="title"]');
      var categoryField = form.querySelector('[name="category"]');
      var submitButton = form.querySelector("[data-creation-submit]");
      var previewButton = form.querySelector("[data-preview-button]");
      var previewDialog = document.querySelector(".preview-dialog");
      var previewContent = document.querySelector("[data-preview-content]");
      var previewClose = document.querySelector("[data-preview-close]");
      var previewBackdrop = document.querySelector("[data-preview-backdrop]");

      if (
        !editor ||
        !wordCounter ||
        !characterCounter ||
        !status ||
        !titleField ||
        !categoryField ||
        !submitButton ||
        typeof editor.addEventListener !== "function"
      ) {
        return;
      }

      var authToken = getAuthToken();
      if (!authToken) {
        status.textContent =
          "É necessário fazer login para enviar uma proposta. Acesse Entrar para continuar.";
        titleField.disabled = true;
        categoryField.disabled = true;
        editor.disabled = true;
        submitButton.disabled = true;
        return;
      }

      function updateCounters() {
        var content = editor.value;
        var trimmedContent = content.trim();
        var wordCount = trimmedContent === "" ? 0 : trimmedContent.split(/\s+/).length;
        var characterCount = content.length;

        wordCounter.textContent = wordCount === 1 ? "1 palavra" : String(wordCount) + " palavras";
        characterCounter.textContent = String(characterCount) + " de 10.000 caracteres";
      }

      function focusFirstEmptyField() {
        var fields = [titleField, categoryField, editor];

        for (var index = 0; index < fields.length; index += 1) {
          if (String(fields[index].value || "").trim() === "") {
            if (typeof fields[index].focus === "function") {
              fields[index].focus();
            }
            return;
          }
        }
      }

      function openPreview(content) {
        if (!previewDialog || !previewContent) {
          return;
        }

        var markdown = String(content || "");
        var html = markdown
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");

        var parseMarkdown = null;

        if (typeof window.marked === "object" && typeof window.marked.parse === "function") {
          parseMarkdown = window.marked.parse;
        } else if (typeof window.marked === "function") {
          parseMarkdown = window.marked;
        }

        if (parseMarkdown) {
          try {
            html = parseMarkdown(markdown);
          } catch (_error) {
            html = html;
          }
        }

        if (typeof window.DOMPurify === "object" && typeof window.DOMPurify.sanitize === "function") {
          html = window.DOMPurify.sanitize(html);
        }

        previewContent.innerHTML = html;
        previewDialog.hidden = false;

        if (previewClose && typeof previewClose.focus === "function") {
          previewClose.focus();
        }
      }

      function closePreview() {
        if (!previewDialog) {
          return;
        }

        previewDialog.hidden = true;
        if (typeof previewButton.focus === "function") {
          previewButton.focus();
        }
      }

      if (previewButton && typeof previewButton.addEventListener === "function") {
        previewButton.addEventListener("click", function () {
          openPreview(editor.value);
        });
      }

      if (previewClose && typeof previewClose.addEventListener === "function") {
        previewClose.addEventListener("click", closePreview);
      }

      if (previewBackdrop && typeof previewBackdrop.addEventListener === "function") {
        previewBackdrop.addEventListener("click", closePreview);
      }

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && previewDialog && !previewDialog.hidden) {
          closePreview();
        }
      });

      editor.addEventListener("input", updateCounters);
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (typeof form.checkValidity === "function" && !form.checkValidity()) {
          status.textContent = "Preencha todos os campos obrigatórios antes de continuar.";

          if (typeof form.reportValidity === "function") {
            form.reportValidity();
          }
          return;
        }

        var title = String(titleField.value || "");
        var category = String(categoryField.value || "");
        var content = String(editor.value || "");

        if (title.trim() === "" || category.trim() === "" || content.trim() === "") {
          status.textContent = "Preencha todos os campos obrigatórios antes de continuar.";
          focusFirstEmptyField();
          return;
        }

        try {
          var submissionEvent = new CustomEvent("deva11y:content-submit", {
            detail: {
              title: title,
              category: category,
              content: content
            }
          });
          document.dispatchEvent(submissionEvent);
        } catch (_error) {
          status.textContent = "Não foi possível preparar o conteúdo para integração.";
          return;
        }

        status.textContent = "Conteúdo preparado e sinalizado para revisão.";
      });

      updateCounters();
      submitButton.disabled = false;
    }
  function initializePrintButtons() {
    if (typeof document.querySelectorAll !== "function" || typeof window.print !== "function") {
      return;
    }

    var printButtons = document.querySelectorAll("[data-print-document]");

    for (var index = 0; index < printButtons.length; index += 1) {
      if (typeof printButtons[index].addEventListener !== "function") {
        continue;
      }

      printButtons[index].addEventListener("click", function (event) {
        event.preventDefault();
        window.print();
      });
    }
  }

  function initializeImageFallbacks() {
    if (
      typeof document.querySelectorAll !== "function" ||
      typeof document.createElement !== "function"
    ) {
      return;
    }

    var images = document.querySelectorAll("img[data-image-fallback]");

    function showFallback(image) {
      if (image.getAttribute("data-image-error-handled") === "true") {
        return;
      }

      var alternativeText = image.getAttribute("alt") || "";
      var expectedPath = image.getAttribute("src");
      if (!expectedPath) {
        return;
      }

      image.setAttribute("data-image-error-handled", "true");
      image.setAttribute("aria-hidden", "true");
      image.hidden = true;

      var container = image.parentElement;
      var note = container && typeof container.querySelector === "function"
        ? container.querySelector("[data-image-fallback-note]")
        : null;

      var fallbackText = alternativeText === ""
        ? "Imagem indisponível. Caminho esperado: " + expectedPath + "."
        : "Imagem indisponível: " + alternativeText + ". Caminho esperado: " + expectedPath + ".";

      if (note) {
        note.textContent = fallbackText;
        note.hidden = false;
        note.removeAttribute("hidden");
        return;
      }

      note = document.createElement("p");
      note.className = "image-fallback";
      note.setAttribute("data-image-fallback-note", "");
      note.setAttribute("role", "status");
      note.textContent = fallbackText;

      if (image.parentNode) {
        if (image.nextSibling) {
          image.parentNode.insertBefore(note, image.nextSibling);
        } else {
          image.parentNode.appendChild(note);
        }
      }
    }

    for (var index = 0; index < images.length; index += 1) {
      (function (image) {
        if (typeof image.addEventListener !== "function") {
          return;
        }

        image.addEventListener("error", function () {
          showFallback(image);
        });

        if (
          image.complete === true &&
          typeof image.naturalWidth === "number" &&
          image.naturalWidth === 0
        ) {
          showFallback(image);
        }
      }(images[index]));
    }
  }

  function initializeCurrentYear() {
    if (typeof document.querySelectorAll !== "function") {
      return;
    }

    var yearElements = document.querySelectorAll("[data-current-year]");
    var currentYear = new Date().getFullYear();

    if (!isFinite(currentYear)) {
      return;
    }

    for (var index = 0; index < yearElements.length; index += 1) {
      yearElements[index].textContent = String(currentYear);
    }
  }

  function getLoginPageHref() {
    var href = "login.html";
    var path = window.location.pathname || "";

    if (path.indexOf("/html/") === -1 && path.indexOf("\\html\\") === -1) {
      href = "./html/login.html";
    }

    if (path.indexOf("/index.html") !== -1 || path.indexOf("\\index.html") !== -1) {
      href = "./html/login.html";
    }

    return href;
  }

  function clearAuthUser() {
    try {
      window.localStorage.removeItem("deva11y:auth:token");
      window.localStorage.removeItem("deva11y:auth:user");
    } catch (_error) {
      // ignore
    }
  }

  function getIndexPageHref() {
    if (window.location.pathname.indexOf("/html/") !== -1 || window.location.pathname.indexOf("\\html\\") !== -1) {
      return "./../index.html";
    }
    return "index.html";
  }

  function isCreateArticlePage() {
    var path = window.location.pathname || "";
    return path.indexOf("post.html") !== -1 || path.indexOf("\\post.html") !== -1;
  }

  function logoutAndRedirect() {
    clearAuthUser();

    if (isCreateArticlePage()) {
      var destination = getIndexPageHref();

      if (showPageLoader()) {
        navigateAfterPaint(destination);
      } else {
        window.location.href = destination;
      }
      return;
    }

    if (typeof initializeAuthNav === "function") {
      initializeAuthNav();
    }
  }

  function initializeAuthNav() {
    if (typeof document.querySelector !== "function" || typeof document.createElement !== "function") {
      return;
    }

    var body = document.body;
    if (!body) {
      return;
    }

    var pageType = body.getAttribute("data-page");
    var token = getAuthToken();
    updateCreateContentLinkVisibility(token);

    if (pageType === "login" || pageType === "signup") {
      return;
    }

    var headerInner = document.querySelector(".header-inner, .site-header__inner, .site-header > .shell");
    var accessTools = document.querySelector(".a11y-tools, [data-a11y-tools]");

    if (!headerInner) {
      return;
    }

    var existingControl = headerInner.querySelector("[data-auth-nav-control]");
    if (existingControl) {
      existingControl.remove();
    }

    var userJson = null;
    try {
      userJson = window.localStorage.getItem("deva11y:auth:user");
    } catch (_error) {
      userJson = null;
    }

    var user = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch (_error) {
        user = null;
      }
    }

    if (!user || !token) {
      var loginLink = document.createElement("a");
      loginLink.className = "auth-nav-link";
      loginLink.href = "./html/login.html";
      loginLink.textContent = "Entrar";
      loginLink.setAttribute("data-auth-nav-control", "true");

      if (window.location.pathname.indexOf("/html/") !== -1 || window.location.pathname.indexOf("\\html\\") !== -1) {
        loginLink.href = "login.html";
      }

      if (window.location.pathname.indexOf("/index.html") !== -1 || window.location.pathname.indexOf("\\index.html") !== -1) {
        loginLink.href = "./html/login.html";
      }

      if (headerInner && accessTools) {
        headerInner.insertBefore(loginLink, accessTools);
      } else if (headerInner) {
        headerInner.appendChild(loginLink);
      }
      return;
    }

    var profileMenu = document.createElement("div");
    profileMenu.className = "auth-nav-menu";
    profileMenu.setAttribute("data-auth-nav-control", "true");

    var profileButton = document.createElement("button");
    profileButton.className = "auth-nav-profile";
    profileButton.type = "button";
    profileButton.setAttribute("aria-haspopup", "true");
    profileButton.setAttribute("aria-expanded", "false");
    profileButton.setAttribute(
      "aria-label",
      user && user.name ? "Perfil de " + user.name : "Perfil"
    );
    profileButton.setAttribute("title", user && user.name ? user.name : "Perfil");
    profileButton.textContent = user && user.name ? user.name : "Perfil";

    var menuPanel = document.createElement("div");
    menuPanel.className = "auth-nav-menu-panel";
    menuPanel.setAttribute("role", "menu");
    menuPanel.setAttribute("aria-label", "Opções do usuário");
    menuPanel.hidden = true;

    var userEmail = document.createElement("p");
    userEmail.className = "auth-nav-menu-email";
    userEmail.textContent = user && user.email ? user.email : "Email não disponível";
    userEmail.setAttribute("role", "none");

    var logoutButton = document.createElement("button");
    logoutButton.className = "button auth-nav-logout";
    logoutButton.type = "button";
    logoutButton.setAttribute("role", "menuitem");
    logoutButton.textContent = "Sair";

    menuPanel.appendChild(userEmail);
    menuPanel.appendChild(logoutButton);
    profileMenu.appendChild(profileButton);
    profileMenu.appendChild(menuPanel);

    function closeProfileMenu() {
      profileMenu.classList.remove("auth-nav-menu--open");
      profileButton.setAttribute("aria-expanded", "false");
      menuPanel.hidden = true;
    }

    function openProfileMenu() {
      profileMenu.classList.add("auth-nav-menu--open");
      profileButton.setAttribute("aria-expanded", "true");
      menuPanel.hidden = false;
    }

    function toggleProfileMenu() {
      if (profileMenu.classList.contains("auth-nav-menu--open")) {
        closeProfileMenu();
      } else {
        openProfileMenu();
      }
    }

    profileButton.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleProfileMenu();
    });

    logoutButton.addEventListener("click", function () {
      logoutAndRedirect();
    });

    window.addEventListener("click", function (event) {
      if (!profileMenu.contains(event.target)) {
        closeProfileMenu();
      }
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" || event.key === "Esc" || event.keyCode === 27) {
        closeProfileMenu();
      }
    });

    if (headerInner && accessTools) {
      headerInner.insertBefore(profileMenu, accessTools);
    } else if (headerInner) {
      headerInner.appendChild(profileMenu);
    }
  }

  function initialize() {
    var initializers = [
      initializeGlobalIdentityAndLoading,
      initializePreferences,
      initializeScreenReader,
      initializeContentSearch,
      initializeExercise,
      initializeCreationForm,
      initializePrintButtons,
      initializeImageFallbacks,
      initializeCurrentYear,
      initializeAuthNav
    ];

    for (var index = 0; index < initializers.length; index += 1) {
      try {
        initializers[index]();
      } catch (_error) {
        // Cada recurso é independente para manter os demais disponíveis.
      }
    }
  }

  try {
    initializeGlobalIdentityAndLoading();
  } catch (_error) {
    // O carregamento antecipado não impede os recursos iniciados no DOMContentLoaded.
  }

  if (document.readyState === "loading" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
}());
