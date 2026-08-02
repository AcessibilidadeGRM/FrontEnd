(
    function () {
        "use strict";
        function getApiBaseUrl() {
            return window.DEVA11Y_API_BASE_URL || "http://127.0.0.1:5000";
        }
    
        function getFormPayload(form) {
            var payload = {};
            var fields = form.querySelectorAll("input[name]");

            Array.prototype.forEach.call(fields, function (field) {
                if (field && field.name) {
                    payload[field.name] = field.value;
                }
            });
            return payload;
        }

        function saveAuthUser(data) {
            try {
                window.localStorage.setItem("deva11y:auth:token", data.token);
                window.localStorage.setItem(
                    "deva11y:auth:user",
                    JSON.stringify({
                        _id: data._id,
                        name: data.name,
                        email: data.email,
                    }),
                );
            } catch (_error) {}
        }

        function setStatus(form, message) {
            var status = form.querySelector("[data-auth-status]");
            if (status) {
                status.textContent = message;
            }
        }

        function initializeAuthForms() {
                if (typeof document.querySelectorAll !== "function") {
                    return;
                }

            var forms = document.querySelectorAll("[data-auth-form]");

            if (!forms || forms.length === 0) {
            return;
            }

            Array.prototype.forEach.call(forms, function (form) {
            if (!form || typeof form.addEventListener !== "function") {
                return;
            }

            form.addEventListener("submit", function (event) {
                event.preventDefault();

                var submitButton = form.querySelector("button[type='submit']");
                var pageType = document.body && document.body.getAttribute("data-page");
                var endpoint =
                pageType === "signup" ? "/v1/auth/signup" : "/v1/auth/login";
                var payload = getFormPayload(form);

                setStatus(form, "Enviando dados...");

                if (submitButton) {
                    submitButton.disabled = true;
                }

                if (typeof window.fetch !== "function") {
                    setStatus(form, "Seu navegador não suporta comunicação com a API.");
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                    return;
                }

                window.fetch(getApiBaseUrl() + endpoint, {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }).then(function (response) {
                    return response.json().then(function (data) {
                        return {
                            ok: response.ok,
                            status: response.status,
                            data: data,
                        };
                    });
                }).then(function (result) {
                    if (!result.ok) {
                        var message = result.data && result.data.message ? result.data.message : "Não foi possível concluir a operação.";
                        setStatus(form, message);
                        return;
                    }

                    if (pageType === "signup") {
                    setStatus(
                        form,
                        "Conta criada com sucesso. Faça login para continuar.",
                    );
                    window.setTimeout(function () {
                        window.location.href = "login.html";
                    }, 900);
                    return;
                    }

                    if (result.data && result.data.token) {
                        saveAuthUser(result.data);
                    }

                    setStatus(form, "Login realizado com sucesso!");

                    window.setTimeout(function () {
                        window.location.href = "post.html";
                    }, 700);
                })
                .catch(function () {
                    setStatus(
                    form,
                    "Não foi possível conectar ao servidor. Verifique se o backend está rodando.",
                    );
                })
                .then(function () {
                    if (submitButton) {
                    submitButton.disabled = false;
                    }
                });
            });
            });
        }

        window.DEVA11YAuth = {
            initializeAuthForms: initializeAuthForms,
        };

        if (
            document.readyState === "loading" &&
            typeof document.addEventListener === "function"
        ) {
            document.addEventListener("DOMContentLoaded", initializeAuthForms);
        } else {
            initializeAuthForms();
        }
    }
)();
