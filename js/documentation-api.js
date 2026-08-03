(function () {
  "use strict";

  function getApiBaseUrl() {
    return window.DEVA11Y_API_BASE_URL || "http://127.0.0.1:5000";
  }

  function getAuthToken() {
    try {
      return window.localStorage.getItem("deva11y:auth:token");
    } catch (_error) {
      return null;
    }
  }

  function setStatus(message) {
    var status = document.querySelector("[data-form-status]");
    if (status) {
      status.textContent = message;
    }
  }

  function getCreationForm() {
    return document.querySelector("[data-creation-form]");
  }

  function resetFormState(form) {
    if (!form) {
      return;
    }

    form.reset();

    var editor = form.querySelector("[data-content-editor]");
    if (editor) {
      editor.value = "";
    }

    var wordCounter = form.querySelector("[data-word-count]");
    if (wordCounter) {
      wordCounter.textContent = "0 palavras";
    }

    var characterCounter = form.querySelector("[data-character-count]");
    if (characterCounter) {
      characterCounter.textContent = "0 de 10.000 caracteres";
    }
  }

  function handleContentSubmit(event) {
    if (!event || !event.detail) {
      return;
    }

    var form = getCreationForm();
    if (!form) {
      return;
    }

    var token = getAuthToken();
    if (!token) {
      setStatus("Faça login para enviar a proposta.");
      return;
    }

    var payload = {
      title: String(event.detail.title || "").trim(),
      category: String(event.detail.category || "").trim(),
      content: String(event.detail.content || "").trim()
    };

    if (!payload.title || !payload.content) {
      setStatus("Título e conteúdo são obrigatórios.");
      return;
    }

    var submitButton = form.querySelector("[data-creation-submit]");
    if (submitButton) {
      submitButton.disabled = true;
    }

    setStatus("Enviando proposta... aguarde.");

    if (typeof window.fetch !== "function") {
      setStatus("Seu navegador não suporta envio via API.");
      if (submitButton) {
        submitButton.disabled = false;
      }
      return;
    }

    window.fetch(getApiBaseUrl() + "/v1/article/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return {
            ok: response.ok,
            status: response.status,
            data: data
          };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var message =
            result.data && result.data.message
              ? result.data.message
              : "Não foi possível publicar a proposta.";
          setStatus(message);
          return;
        }

        setStatus("Proposta publicada com sucesso.");
        resetFormState(form);
      })
      .catch(function () {
        setStatus(
          "Não foi possível conectar ao servidor. Verifique se o backend está rodando."
        );
      })
      .finally(function () {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
  }

  function initializeDocumentationApi() {
    var form = getCreationForm();
    if (!form || typeof document.addEventListener !== "function") {
      return;
    }

    document.addEventListener("deva11y:content-submit", handleContentSubmit);
  }

  if (document.readyState === "loading" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", initializeDocumentationApi);
  } else {
    initializeDocumentationApi();
  }
})();
