/* client/js/auth.js
 * Field-level errors + password rules checklist + local validation
 */
(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- UI helpers ----------
  const setText = (el, text) => {
    if (el) el.textContent = text || "";
  };

  function setPanelError(panelId, message) {
    const el = $(panelId);
    if (!el) return;
    el.classList.toggle("show", Boolean(message));
    setText(el, message);
  }

  function setFieldError(inputId, message) {
    const input = $(inputId);
    const err = $(inputId + "Error");

    if (err) {
      err.classList.toggle("show", Boolean(message));
      setText(err, message);
    }

    if (input) {
      const wrapper = input.closest(".input-wrapper");
      if (wrapper) wrapper.classList.toggle("is-invalid", Boolean(message));
      input.setAttribute("aria-invalid", message ? "true" : "false");
    }
  }

  function clearRegisterUIErrors() {
    ["registerUsername", "registerEmail", "registerPassword", "registerPasswordConfirm"]
      .forEach((id) => setFieldError(id, ""));
    setPanelError("registerError", "");
  }

  function clearLoginUIErrors() {
    ["loginUsername", "loginPassword"].forEach((id) => setFieldError(id, ""));
    setPanelError("loginError", "");
  }

  // ---------- Password rules (realtime checklist) ----------
  function passwordRules(pw) {
    return {
      len: typeof pw === "string" && pw.length >= 6,
      lower: /[a-z]/.test(pw || ""),
      upper: /[A-Z]/.test(pw || ""),
      digit: /[0-9]/.test(pw || ""),
    };
  }

  function updatePasswordRulesUI(pw) {
    const list = $("registerPasswordRulesList");
    if (!list) return;

    const rules = passwordRules(pw);
    for (const li of list.querySelectorAll("li[data-rule]")) {
      const key = li.getAttribute("data-rule");
      const ok = Boolean(rules[key]);
      li.classList.toggle("ok", ok);
      li.classList.toggle("bad", !ok);
    }
  }

  // ---------- Local validation ----------
  function validateRegisterLocal() {
    const username = ($("registerUsername")?.value || "").trim();
    const email = ($("registerEmail")?.value || "").trim();
    const password = $("registerPassword")?.value || "";
    const confirm = $("registerPasswordConfirm")?.value || "";

    const errors = {};

    // Username
    if (!username) errors.registerUsername = "Vui lòng nhập tên đăng nhập.";
    else if (username.length < 3 || username.length > 20) errors.registerUsername = "Tên đăng nhập phải từ 3–20 ký tự.";
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.registerUsername = "Tên đăng nhập chỉ gồm chữ, số và dấu gạch dưới (_).";

    // Email (optional)
    if (email) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) errors.registerEmail = "Email không hợp lệ.";
    }

    // Password
    if (!password) errors.registerPassword = "Vui lòng nhập mật khẩu.";
    else {
      const r = passwordRules(password);
      if (!r.len) errors.registerPassword = "Mật khẩu phải có ít nhất 6 ký tự.";
      else if (!r.lower) errors.registerPassword = "Mật khẩu phải có ít nhất 1 chữ thường (a-z).";
      else if (!r.upper) errors.registerPassword = "Mật khẩu phải có ít nhất 1 chữ hoa (A-Z).";
      else if (!r.digit) errors.registerPassword = "Mật khẩu phải có ít nhất 1 chữ số (0-9).";
    }

    // Confirm
    if (!confirm) errors.registerPasswordConfirm = "Vui lòng xác nhận mật khẩu.";
    else if (password && confirm !== password) errors.registerPasswordConfirm = "Mật khẩu xác nhận không khớp.";

    return { ok: Object.keys(errors).length === 0, errors };
  }

  function validateLoginLocal() {
    const username = ($("loginUsername")?.value || "").trim();
    const password = $("loginPassword")?.value || "";
    const errors = {};
    if (!username) errors.loginUsername = "Vui lòng nhập tên đăng nhập.";
    if (!password) errors.loginPassword = "Vui lòng nhập mật khẩu.";
    return { ok: Object.keys(errors).length === 0, errors };
  }

  function applyErrors(map) {
    for (const [k, v] of Object.entries(map || {})) setFieldError(k, v);
  }

  // ---------- API ----------
  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      const err = new Error("Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function normalizeServerErrors(data) {
    // Prefer backend format: { error, errors:[{field,message}] }
    const out = { panel: "", fields: {} };

    if (!data) {
      out.panel = "Có lỗi xảy ra. Vui lòng thử lại.";
      return out;
    }

    if (Array.isArray(data.errors) && data.errors.length) {
      for (const e of data.errors) {
        const field = (e.field || e.param || e.path || "").toString();
        const msg = (e.message || e.msg || "").toString();
        if (!field || !msg) continue;

        const map = {
          username: "registerUsername",
          email: "registerEmail",
          password: "registerPassword",
        };
        const inputId = map[field] || field;

        if (inputId.startsWith("register") || inputId.startsWith("login")) {
          // chỉ set 1 lỗi/field (lỗi đầu tiên)
          if (!out.fields[inputId]) out.fields[inputId] = msg;
        }
      }

      out.panel = (data.error || "Thông tin chưa đúng yêu cầu. Vui lòng kiểm tra lại.").toString();
      return out;
    }

    out.panel = (data.error || data.message || "Có lỗi xảy ra.").toString();
    return out;
  }

  // ---------- Wire up ----------
  const registerForm = $("registerFormElement");
  const loginForm = $("loginFormElement");

  // Realtime checklist password
  const regPw = $("registerPassword");
  if (regPw) {
    regPw.addEventListener("input", () => {
      updatePasswordRulesUI(regPw.value || "");
      // clear lỗi field password khi user gõ
      setFieldError("registerPassword", "");
      setPanelError("registerError", "");
    });
    updatePasswordRulesUI(regPw.value || "");
  }

  // Auto clear errors on typing (UI mượt)
  ["registerUsername", "registerEmail", "registerPasswordConfirm"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      setFieldError(id, "");
      setPanelError("registerError", "");
    });
  });

  ["loginUsername", "loginPassword"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      setFieldError(id, "");
      setPanelError("loginError", "");
    });
  });

  // Register submit
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearRegisterUIErrors();

      const v = validateRegisterLocal();
      if (!v.ok) {
        applyErrors(v.errors);
        setPanelError("registerError", "Thông tin đăng ký chưa đúng yêu cầu. Sửa lỗi đỏ rồi thử lại.");
        return;
      }

      const payload = {
        username: ($("registerUsername")?.value || "").trim(),
        email: ($("registerEmail")?.value || "").trim(),
        password: $("registerPassword")?.value || "",
      };

      try {
        const data = await postJson("/api/register", payload);
        if (data?.token) {
          // store both localStorage and sessionStorage so BattleshipState picks them up
          localStorage.setItem("token", data.token);
          sessionStorage.setItem("bs_token", data.token);
        }
        if (data?.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("username", data.user.username);
          localStorage.setItem("isGuest", String(data.user.isGuest || false));

          sessionStorage.setItem("bs_userId", data.user.id);
          sessionStorage.setItem("bs_username", data.user.username);
          sessionStorage.setItem("bs_isGuest", String(data.user.isGuest || false));
        }
        window.location.href = "/hub";
      } catch (err) {
        const normalized = normalizeServerErrors(err.data);
        applyErrors(normalized.fields);
        setPanelError("registerError", normalized.panel || "Đăng ký thất bại.");
      }
    });
  }

  // Login submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearLoginUIErrors();

      const v = validateLoginLocal();
      if (!v.ok) {
        applyErrors(v.errors);
        setPanelError("loginError", "Vui lòng nhập đủ thông tin.");
        return;
      }

      const payload = {
        username: ($("loginUsername")?.value || "").trim(),
        password: $("loginPassword")?.value || "",
      };

      try {
        const data = await postJson("/api/login", payload);
        if (data?.token) {
          localStorage.setItem("token", data.token);
          sessionStorage.setItem("bs_token", data.token);
        }
        if (data?.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("username", data.user.username);
          localStorage.setItem("isGuest", String(data.user.isGuest || false));

          sessionStorage.setItem("bs_userId", data.user.id);
          sessionStorage.setItem("bs_username", data.user.username);
          sessionStorage.setItem("bs_isGuest", String(data.user.isGuest || false));
        }
        window.location.href = "/hub";
      } catch (err) {
        const normalized = normalizeServerErrors(err.data);
        setPanelError("loginError", normalized.panel || "Đăng nhập thất bại.");
      }
    });
  }

  // init checklist (safe)
  updatePasswordRulesUI($("registerPassword")?.value || "");
})();
