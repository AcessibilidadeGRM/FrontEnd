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
  var VALID_FONT_SCALES = [48, 60, 72, 84, 96];

  function isValidPalette(value) {
    return typeof value === "string" && VALID_PALETTES.indexOf(value) !== -1;
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
      root.setAttribute("data-palette", preferences.palette);
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
        fontScale: preferences.fontScale
      });

      if (event) {
        document.dispatchEvent(event);
      }
    }

    applyPreferences();

    var panel = document.querySelector("[data-a11y-tools]");
    if (!panel || typeof panel.addEventListener !== "function") {
      return;
    }

    var summary = panel.querySelector("summary");
    var paletteButtons = panel.querySelectorAll("[data-palette-option]");
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

        preferences.palette = selectedPalette;
        commitUserPreference("Paleta de cores atualizada.");
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

  function initialize() {
    var initializers = [
      initializePreferences,
      initializeContentSearch,
      initializeExercise,
      initializeCreationForm,
      initializePrintButtons,
      initializeImageFallbacks,
      initializeCurrentYear
    ];

    for (var index = 0; index < initializers.length; index += 1) {
      try {
        initializers[index]();
      } catch (_error) {
        // Cada recurso é independente para manter os demais disponíveis.
      }
    }
  }

  if (document.readyState === "loading" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
}());
