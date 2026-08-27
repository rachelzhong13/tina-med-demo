/*
 * TINA Water Drop Assistant — embeddable, QR-context product Q&A widget.
 *
 * The host may provide window.WATER_DROP_ASSISTANT_CONFIG before loading:
 * apiBase, apiPath, iconUrl, title, medicineId, medicineName, sessionId,
 * context, variant, mode and greeting.
 */
(function () {
  "use strict";

  if (document.getElementById("water-drop-root")) return;

  var scriptEl = document.currentScript;
  var config = window.WATER_DROP_ASSISTANT_CONFIG || {};
  var apiBase =
    (scriptEl && scriptEl.dataset.apiBase) ||
    config.apiBase ||
    "http://localhost:8000";
  var apiPath =
    (scriptEl && scriptEl.dataset.apiPath) || config.apiPath || "/chat";
  var API = apiBase.replace(/\/$/, "") + apiPath;
  var medicineId =
    (scriptEl && scriptEl.dataset.medicineId) || config.medicineId || "";
  var iconUrl =
    (scriptEl && scriptEl.dataset.iconUrl) ||
    config.iconUrl ||
    (scriptEl
      ? new URL("water-drop-icon.png", scriptEl.src).toString()
      : "water-drop-icon.png");
  var title = config.title || "TINA 样品助手";
  var medicineName = config.medicineName || "当前样品";
  var allowedVariants = ["clinical", "companion", "editorial"];
  var variant =
    allowedVariants.indexOf(config.variant) >= 0 ? config.variant : "clinical";
  var mode = config.mode || "supporting";
  var greeting =
    config.greeting || "你好，我可以帮你读懂这份虚构展品资料。";

  var modeLabels = {
    supporting: "资料核对",
    character: "陪伴讲解",
    "editorial-mark": "目录问答",
  };

  var stateLabels = {
    idle: "可以提问",
    hover: "点击小水滴提问",
    pressed: "正在响应",
    dragging: "正在移动小水滴",
    opening: "正在打开对话",
    thinking: "TINA 正在思考",
    answering: "正在整理回答",
    success: "回答已送达",
    error: "问答服务暂不可用",
    sleep: "小水滴正在休息",
  };

  function collectContext() {
    var source = config.context || window.__ASSISTANT_CONTEXT__;
    if (source) {
      try {
        return typeof source === "string"
          ? source
          : JSON.stringify(source, null, 2);
      } catch (_error) {
        return "";
      }
    }

    var metas = {};
    document.querySelectorAll('meta[name^="product-"]').forEach(function (meta) {
      metas[meta.name.replace("product-", "")] = meta.content;
    });
    if (Object.keys(metas).length) return JSON.stringify(metas, null, 2);

    var params = new URLSearchParams(location.search);
    var contextFromQuery = {};
    params.forEach(function (value, key) {
      if (key !== "__assistant") contextFromQuery[key] = value;
    });
    if (Object.keys(contextFromQuery).length) {
      return JSON.stringify(contextFromQuery, null, 2);
    }

    return "";
  }

  var context = collectContext();
  var sessionId =
    config.sessionId ||
    (scriptEl && scriptEl.dataset.sessionId) ||
    localStorage.getItem("__assistant_sid") ||
    Math.random().toString(36).slice(2) + Date.now();
  localStorage.setItem("__assistant_sid", sessionId);

  var host = document.createElement("div");
  host.id = "water-drop-root";
  host.dataset.variant = variant;
  host.dataset.mode = mode;
  host.dataset.state = "idle";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        --accent: #08788e;
        --accent-strong: #07566a;
        --accent-soft: #dcebed;
        --surface: #fbfdfd;
        --surface-soft: #edf5f5;
        --ink: #102e39;
        --muted: #506d76;
        --line: #a9bec3;
        --success: #317254;
        --danger: #a33a32;
        color: var(--ink);
      }

      :host([data-variant="companion"]) {
        --accent: #527d5b;
        --accent-strong: #315d43;
        --accent-soft: #dce8d1;
        --surface: #fbfaf4;
        --surface-soft: #eef3e8;
        --ink: #22372c;
        --muted: #536258;
        --line: #bdc8b9;
      }

      :host([data-variant="editorial"]) {
        --accent: #d3392e;
        --accent-strong: #a62520;
        --accent-soft: #f1d43b;
        --surface: #f7f5ee;
        --surface-soft: #ece9df;
        --ink: #171717;
        --muted: #5f5c55;
        --line: #252525;
      }

      * {
        box-sizing: border-box;
      }

      button,
      input {
        font: inherit;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      #safe-area-probe {
        position: fixed;
        inset: 0;
        padding:
          env(safe-area-inset-top)
          env(safe-area-inset-right)
          env(safe-area-inset-bottom)
          env(safe-area-inset-left);
        visibility: hidden;
        pointer-events: none;
      }

      #fab {
        position: fixed;
        right: max(20px, env(safe-area-inset-right));
        bottom: max(20px, env(safe-area-inset-bottom));
        z-index: 2147483647;
        width: 76px;
        height: 76px;
        padding: 0;
        display: grid;
        place-items: center;
        color: var(--ink);
        background: transparent;
        border: 0;
        border-radius: 24px;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }

      #portrait {
        position: relative;
        width: 76px;
        height: 76px;
        display: block;
        overflow: hidden;
        background: #dfe9d7;
        border: 2px solid rgba(255, 255, 255, 0.88);
        border-radius: 22px 22px 28px 28px;
        box-shadow: 0 13px 28px rgba(37, 56, 43, 0.28);
        transition:
          transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
          filter 180ms ease,
          box-shadow 180ms ease;
      }

      #portrait::after {
        position: absolute;
        inset: 3px;
        border: 2px solid transparent;
        border-radius: inherit;
        content: "";
        pointer-events: none;
      }

      #portrait img,
      #header-avatar img {
        position: absolute;
        top: -32%;
        left: -23%;
        width: 155%;
        height: 155%;
        max-width: none;
        display: block;
        object-fit: cover;
        pointer-events: none;
      }

      #fab:focus-visible {
        outline: 3px solid var(--accent);
        outline-offset: 4px;
      }

      #fab[data-state="hover"] #portrait {
        box-shadow: 0 17px 32px rgba(37, 56, 43, 0.32);
        transform: translateY(-3px);
      }

      #fab[data-state="pressed"] #portrait {
        transform: scale(0.96);
      }

      #fab[data-state="dragging"] {
        cursor: grabbing;
      }

      #fab[data-state="dragging"] #portrait {
        box-shadow: 0 20px 38px rgba(37, 56, 43, 0.34);
        transform: scale(1.035);
      }

      #fab[data-state="opening"] #portrait {
        animation: water-drop-open 420ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="thinking"] #portrait::after {
        border-top-color: var(--accent);
        animation: water-drop-think 900ms linear infinite;
      }

      #fab[data-state="answering"] #portrait {
        animation: water-drop-answer 420ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="success"] #portrait::after {
        border-color: var(--success);
        animation: water-drop-confirm 520ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="error"] #portrait {
        filter: saturate(0.72);
        box-shadow: 0 13px 28px rgba(137, 55, 47, 0.28);
      }

      #fab[data-state="error"] #portrait::after {
        border-color: var(--danger);
      }

      #fab[data-state="sleep"] #portrait {
        filter: saturate(0.7) brightness(0.84);
        transform: scale(0.97);
      }

      :host([data-mode="character"]) #fab[data-state="idle"] #portrait {
        animation: water-drop-breathe 5.2s ease-in-out infinite;
      }

      #panel {
        position: fixed;
        right: 20px;
        bottom: 112px;
        z-index: 2147483647;
        width: min(372px, calc(100vw - 32px));
        height: min(540px, calc(100dvh - 144px));
        min-width: 0;
        min-height: 0;
        display: none;
        flex-direction: column;
        overflow: hidden;
        color: var(--ink);
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 26px 64px rgba(30, 43, 35, 0.28);
        font-family:
          "Aptos",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          sans-serif;
      }

      #panel.open {
        display: flex;
        animation: panel-enter 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      :host([data-variant="editorial"]) #panel {
        border-radius: 4px;
        box-shadow: 14px 18px 0 rgba(211, 57, 46, 0.34);
      }

      #header {
        min-height: 72px;
        padding: 12px 12px 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--ink);
        background: var(--accent-soft);
        border-bottom: 1px solid var(--line);
      }

      #header-identity {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 11px;
      }

      #header-avatar {
        position: relative;
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        overflow: hidden;
        background: #dfe9d7;
        border: 1px solid rgba(255, 255, 255, 0.9);
        border-radius: 13px 13px 16px 16px;
      }

      :host([data-variant="editorial"]) #header-avatar {
        border-radius: 2px;
      }

      #header-copy {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      #assistant-title,
      #medicine-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #assistant-title {
        font-size: 15px;
        font-weight: 800;
      }

      #medicine-name {
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }

      #close {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        padding: 0;
        display: grid;
        place-items: center;
        color: var(--ink);
        background: rgba(255, 255, 255, 0.58);
        border: 1px solid color-mix(in srgb, var(--line), transparent 25%);
        border-radius: 12px;
        cursor: pointer;
        transition:
          background-color 140ms ease,
          border-color 140ms ease;
      }

      :host([data-variant="editorial"]) #close {
        border-radius: 2px;
      }

      #close:hover {
        background: rgba(255, 255, 255, 0.86);
      }

      #close:active {
        background: rgba(255, 255, 255, 1);
      }

      #close svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-width: 1.8;
      }

      #close:focus-visible,
      #send:focus-visible,
      #input:focus-visible {
        outline: 3px solid var(--accent);
        outline-offset: 2px;
      }

      #status {
        min-height: 34px;
        padding: 7px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        background: var(--surface-soft);
        border-bottom: 1px solid color-mix(in srgb, var(--line), transparent 35%);
        font-size: 12px;
        font-weight: 700;
      }

      #status-dot {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        background: var(--accent);
        border-radius: 50%;
      }

      #panel[data-state="thinking"] #status-dot,
      #panel[data-state="answering"] #status-dot {
        animation: status-pulse 900ms ease-in-out infinite;
      }

      #panel[data-state="success"] #status-dot {
        background: var(--success);
      }

      #panel[data-state="error"] #status-dot {
        background: var(--danger);
      }

      #messages {
        flex: 1;
        min-height: 0;
        padding: 14px;
        overflow-y: auto;
        color: var(--ink);
        background: var(--surface);
        scrollbar-color: var(--line) var(--surface);
        scrollbar-width: thin;
        font-size: 15px;
        line-height: 1.62;
      }

      .bubble {
        max-width: 88%;
        margin: 8px 0;
        padding: 10px 12px;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        border-radius: 14px;
      }

      .bubble.user {
        margin-left: auto;
        color: #153b36;
        background: #dcefeb;
        border: 1px solid #9bc7bf;
        border-bottom-right-radius: 5px;
      }

      .bubble.bot {
        color: var(--ink);
        background: var(--surface-soft);
        border: 1px solid color-mix(in srgb, var(--line), transparent 12%);
        border-bottom-left-radius: 5px;
      }

      :host([data-variant="editorial"]) .bubble {
        border-radius: 2px;
      }

      #composer {
        padding:
          10px
          10px
          max(10px, env(safe-area-inset-bottom));
        display: flex;
        gap: 8px;
        background: var(--surface);
        border-top: 1px solid var(--line);
      }

      #input {
        min-width: 0;
        min-height: 48px;
        flex: 1;
        padding: 0 12px;
        color: var(--ink);
        background: #ffffff;
        border: 1px solid var(--line);
        border-radius: 12px;
        font-size: 16px;
      }

      #input::placeholder {
        color: var(--muted);
        opacity: 1;
      }

      #input:focus {
        border-color: var(--accent);
      }

      #input:disabled {
        color: var(--muted);
        background: var(--surface-soft);
        cursor: wait;
      }

      #send {
        min-width: 68px;
        min-height: 48px;
        padding: 0 14px;
        flex: 0 0 auto;
        color: #ffffff;
        background: var(--accent-strong);
        border: 0;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 800;
        transition:
          background-color 140ms ease,
          opacity 140ms ease;
      }

      :host([data-variant="editorial"]) #input,
      :host([data-variant="editorial"]) #send,
      :host([data-variant="editorial"]) #close {
        border-radius: 2px;
      }

      #send:hover {
        background: var(--accent);
      }

      #send:active {
        opacity: 0.82;
      }

      #send:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      @keyframes panel-enter {
        from {
          opacity: 0;
          transform: translateY(12px);
          clip-path: inset(0 0 16% 0 round 18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
          clip-path: inset(0 0 0 0 round 18px);
        }
      }

      @keyframes water-drop-open {
        0% {
          transform: scale(0.96);
        }
        58% {
          transform: scale(1.045);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes water-drop-think {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes water-drop-answer {
        0%,
        100% {
          transform: translateY(0);
        }
        48% {
          transform: translateY(-4px);
        }
      }

      @keyframes water-drop-confirm {
        0% {
          opacity: 0;
          transform: scale(0.86);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes water-drop-breathe {
        0%,
        78%,
        100% {
          transform: translateY(0);
        }
        88% {
          transform: translateY(-2px);
        }
      }

      @keyframes status-pulse {
        0%,
        100% {
          opacity: 0.45;
          transform: scale(0.82);
        }
        50% {
          opacity: 1;
          transform: scale(1.18);
        }
      }

      @media (hover: none) {
        #close:hover {
          background: rgba(255, 255, 255, 0.58);
        }

        #send:hover {
          background: var(--accent-strong);
        }
      }

      @media (max-width: 520px) {
        #fab {
          right: max(14px, env(safe-area-inset-right));
          bottom: max(14px, env(safe-area-inset-bottom));
          width: 68px;
          height: 68px;
        }

        #portrait {
          width: 68px;
          height: 68px;
          border-radius: 20px 20px 25px 25px;
        }

        #panel {
          border-radius: 16px;
        }

        #header {
          min-height: 68px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #panel.open,
        #fab #portrait,
        #fab #portrait::after,
        #status-dot {
          animation: none !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>

    <div id="safe-area-probe" aria-hidden="true"></div>

    <button
      id="fab"
      type="button"
      aria-controls="panel"
      aria-expanded="false"
      data-state="idle"
    >
      <span id="portrait"><img id="fab-image" alt="" /></span>
      <span id="fab-label" class="sr-only"></span>
    </button>

    <section
      id="panel"
      role="dialog"
      aria-modal="false"
      aria-hidden="true"
      data-state="idle"
    >
      <header id="header">
        <div id="header-identity">
          <span id="header-avatar" aria-hidden="true">
            <img id="header-image" alt="" />
          </span>
          <span id="header-copy">
            <strong id="assistant-title"></strong>
            <span id="medicine-name"></span>
          </span>
        </div>
        <button id="close" type="button">
          <span class="sr-only">关闭对话</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div id="status" role="status">
        <span id="status-dot" aria-hidden="true"></span>
        <span id="status-copy"></span>
      </div>

      <div
        id="messages"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="对话内容"
      ></div>

      <form id="composer" novalidate>
        <label class="sr-only" for="input">输入关于当前样品的问题</label>
        <input
          id="input"
          type="text"
          autocomplete="off"
          enterkeyhint="send"
          maxlength="2000"
        />
        <button id="send" type="submit">发送</button>
      </form>
      <span id="state-announcer" class="sr-only" aria-live="polite"></span>
    </section>
  `;

  var fab = shadow.getElementById("fab");
  var panel = shadow.getElementById("panel");
  var messages = shadow.getElementById("messages");
  var input = shadow.getElementById("input");
  var send = shadow.getElementById("send");
  var close = shadow.getElementById("close");
  var composer = shadow.getElementById("composer");
  var statusCopy = shadow.getElementById("status-copy");
  var stateAnnouncer = shadow.getElementById("state-announcer");
  var safeAreaProbe = shadow.getElementById("safe-area-probe");
  var fabImage = shadow.getElementById("fab-image");
  var headerImage = shadow.getElementById("header-image");
  var assistantTitle = shadow.getElementById("assistant-title");
  var medicineNameElement = shadow.getElementById("medicine-name");
  var fabLabel = shadow.getElementById("fab-label");

  fabImage.src = iconUrl;
  headerImage.src = iconUrl;
  assistantTitle.textContent = title;
  medicineNameElement.textContent =
    medicineName + " · " + (modeLabels[mode] || "样品问答");
  input.placeholder = "询问" + medicineName + "…";
  input.setAttribute("aria-label", "询问" + medicineName);
  fabLabel.textContent = "打开" + title;
  fab.setAttribute("aria-label", "打开" + title);
  panel.setAttribute("aria-label", title + "，当前样品：" + medicineName);
  close.setAttribute("aria-label", "关闭" + title);

  var dragState = null;
  var movedDuringPointer = false;
  var assistantState = "idle";
  var stateResetTimer = 0;
  var sleepTimer = 0;
  var lifecycle = new AbortController();
  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function clearStateTimers() {
    window.clearTimeout(stateResetTimer);
    window.clearTimeout(sleepTimer);
    stateResetTimer = 0;
    sleepTimer = 0;
  }

  function scheduleSleep() {
    window.clearTimeout(sleepTimer);
    if (panel.classList.contains("open")) return;
    sleepTimer = window.setTimeout(function () {
      setAssistantState("sleep");
    }, 18000);
  }

  function setAssistantState(nextState, detail, resetAfter) {
    window.clearTimeout(stateResetTimer);
    assistantState = nextState;
    host.dataset.state = nextState;
    fab.dataset.state = nextState;
    panel.dataset.state = nextState;
    statusCopy.textContent = detail || stateLabels[nextState] || "";
    if (
      detail &&
      ["opening", "thinking", "answering", "success", "error"].indexOf(
        nextState,
      ) >= 0
    ) {
      stateAnnouncer.textContent = detail;
    }
    if (resetAfter) {
      stateResetTimer = window.setTimeout(function () {
        setAssistantState("idle");
        scheduleSleep();
      }, resetAfter);
    }
  }

  function wakeAssistant() {
    window.clearTimeout(sleepTimer);
    if (assistantState === "sleep") setAssistantState("idle");
  }

  function getSafeInsets() {
    var style = getComputedStyle(safeAreaProbe);
    return {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    };
  }

  function getViewportBounds() {
    var viewport = window.visualViewport;
    var insets = getSafeInsets();
    var offsetLeft = viewport ? viewport.offsetLeft : 0;
    var offsetTop = viewport ? viewport.offsetTop : 0;
    var width = viewport ? viewport.width : window.innerWidth;
    var height = viewport ? viewport.height : window.innerHeight;

    return {
      left: offsetLeft + Math.max(12, insets.left),
      top: offsetTop + Math.max(12, insets.top),
      right: offsetLeft + width - Math.max(12, insets.right),
      bottom: offsetTop + height - Math.max(12, insets.bottom),
    };
  }

  function clampFabToViewport() {
    if (!fab.style.left || !fab.style.top) return;
    var bounds = getViewportBounds();
    var rect = fab.getBoundingClientRect();
    var nextLeft = Math.max(
      bounds.left,
      Math.min(parseFloat(fab.style.left), bounds.right - rect.width),
    );
    var nextTop = Math.max(
      bounds.top,
      Math.min(parseFloat(fab.style.top), bounds.bottom - rect.height),
    );
    fab.style.left = nextLeft + "px";
    fab.style.top = nextTop + "px";
  }

  function positionPanelNearFab() {
    if (!panel.classList.contains("open")) return;

    var gap = 14;
    var bounds = getViewportBounds();
    var fabRect = fab.getBoundingClientRect();
    var availableWidth = Math.max(1, bounds.right - bounds.left);
    var availableHeight = Math.max(1, bounds.bottom - bounds.top);
    var desiredWidth = Math.min(372, availableWidth);
    var desiredHeight = Math.min(540, availableHeight);
    var minUsefulWidth = 240;
    var minUsefulHeight = 260;

    var spaces = {
      top: fabRect.top - bounds.top - gap,
      bottom: bounds.bottom - fabRect.bottom - gap,
      left: fabRect.left - bounds.left - gap,
      right: bounds.right - fabRect.right - gap,
    };

    var placement = "top";
    if (spaces.top >= minUsefulHeight) {
      placement = "top";
    } else if (spaces.bottom >= minUsefulHeight) {
      placement = "bottom";
    } else if (
      spaces.right >= minUsefulWidth ||
      spaces.left >= minUsefulWidth
    ) {
      placement = spaces.right >= spaces.left ? "right" : "left";
    } else {
      Object.keys(spaces).forEach(function (side) {
        if (spaces[side] > spaces[placement]) placement = side;
      });
    }

    var panelWidth = desiredWidth;
    var panelHeight = desiredHeight;
    var left;
    var top;

    if (placement === "top" || placement === "bottom") {
      panelHeight = Math.max(1, Math.min(desiredHeight, spaces[placement]));
      left = fabRect.left + fabRect.width / 2 - panelWidth / 2;
      top =
        placement === "top"
          ? fabRect.top - gap - panelHeight
          : fabRect.bottom + gap;
    } else {
      panelWidth = Math.max(1, Math.min(desiredWidth, spaces[placement]));
      left =
        placement === "left"
          ? fabRect.left - gap - panelWidth
          : fabRect.right + gap;
      top = fabRect.top + fabRect.height / 2 - panelHeight / 2;
    }

    left = Math.max(
      bounds.left,
      Math.min(left, bounds.right - panelWidth),
    );
    top = Math.max(
      bounds.top,
      Math.min(top, bounds.bottom - panelHeight),
    );

    panel.style.width = panelWidth + "px";
    panel.style.height = panelHeight + "px";
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function setPanelOpen(open) {
    panel.classList.toggle("open", open);
    fab.setAttribute("aria-label", (open ? "关闭" : "打开") + title);
    fab.setAttribute("aria-expanded", String(open));
    fabLabel.textContent = (open ? "关闭" : "打开") + title;
    panel.setAttribute("aria-hidden", String(!open));

    if (open) {
      setAssistantState("opening", "正在打开 " + medicineName + " 的对话");
      positionPanelNearFab();
      window.requestAnimationFrame(function () {
        input.focus();
      });
      stateResetTimer = window.setTimeout(function () {
        setAssistantState("idle", "可以继续询问 " + medicineName);
      }, reducedMotion ? 0 : 320);
    } else {
      setAssistantState("idle");
      scheduleSleep();
    }
  }

  function releasePointer(pointerId) {
    if (fab.hasPointerCapture(pointerId)) {
      fab.releasePointerCapture(pointerId);
    }
    dragState = null;
  }

  fab.addEventListener("pointerenter", function () {
    wakeAssistant();
    if (!dragState && assistantState === "idle") {
      setAssistantState("hover");
    }
  });

  fab.addEventListener("pointerleave", function () {
    if (!dragState && assistantState === "hover") {
      setAssistantState("idle");
      scheduleSleep();
    }
  });

  fab.addEventListener("focus", function () {
    wakeAssistant();
    if (assistantState === "idle") setAssistantState("hover");
  });

  fab.addEventListener("blur", function () {
    if (!dragState && assistantState === "hover") {
      setAssistantState("idle");
      scheduleSleep();
    }
  });

  fab.addEventListener("pointerdown", function (event) {
    wakeAssistant();
    var rect = fab.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    movedDuringPointer = false;
    setAssistantState("pressed");
    fab.setPointerCapture(event.pointerId);
  });

  fab.addEventListener("pointermove", function (event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    var deltaX = event.clientX - dragState.startX;
    var deltaY = event.clientY - dragState.startY;
    if (Math.hypot(deltaX, deltaY) > 5) {
      movedDuringPointer = true;
      setAssistantState("dragging");
    }
    if (!movedDuringPointer) return;

    var bounds = getViewportBounds();
    var nextLeft = event.clientX - dragState.offsetX;
    var nextTop = event.clientY - dragState.offsetY;
    var maxLeft = bounds.right - fab.offsetWidth;
    var maxTop = bounds.bottom - fab.offsetHeight;

    nextLeft = Math.max(bounds.left, Math.min(nextLeft, maxLeft));
    nextTop = Math.max(bounds.top, Math.min(nextTop, maxTop));

    fab.style.left = nextLeft + "px";
    fab.style.top = nextTop + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";

    if (panel.classList.contains("open")) positionPanelNearFab();
  });

  fab.addEventListener("pointerup", function (event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    var wasDragging = movedDuringPointer;
    releasePointer(event.pointerId);
    if (wasDragging) {
      setAssistantState("idle");
      scheduleSleep();
    } else {
      setAssistantState("pressed", null, 100);
    }
  });

  fab.addEventListener("pointercancel", function (event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    releasePointer(event.pointerId);
    movedDuringPointer = false;
    setAssistantState("idle");
    scheduleSleep();
  });

  fab.addEventListener("click", function () {
    if (movedDuringPointer) {
      movedDuringPointer = false;
      return;
    }
    setPanelOpen(!panel.classList.contains("open"));
  });

  close.addEventListener("click", function () {
    setPanelOpen(false);
    fab.focus();
  });

  document.addEventListener(
    "pointerdown",
    function (event) {
      if (!panel.classList.contains("open")) return;
      if (event.composedPath().indexOf(host) !== -1) return;
      setPanelOpen(false);
    },
    { signal: lifecycle.signal },
  );

  function handleViewportChange() {
    clampFabToViewport();
    if (panel.classList.contains("open")) positionPanelNearFab();
  }

  window.addEventListener("resize", handleViewportChange, {
    signal: lifecycle.signal,
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange, {
      signal: lifecycle.signal,
    });
    window.visualViewport.addEventListener("scroll", handleViewportChange, {
      signal: lifecycle.signal,
    });
  }

  shadow.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && panel.classList.contains("open")) {
      setPanelOpen(false);
      fab.focus();
    }
  });

  function addBubble(text, who) {
    var bubble = document.createElement("div");
    bubble.className = "bubble " + who;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function friendlyError(error, status) {
    if (status === 503) {
      return "问答服务尚未配置。样品资料仍可正常阅读，请稍后再试。";
    }
    if (status === 504) {
      return "这次回答等待超时了。请稍后重试，或换一个更短的问题。";
    }
    if (status === 409) {
      return "当前对话与样品不匹配，请刷新二维码页面后重试。";
    }
    var message = error && error.message ? error.message : "";
    if (/Failed to fetch|NetworkError/i.test(message)) {
      return "暂时没有连上问答服务。样品资料仍可正常阅读，请检查网络后重试。";
    }
    return message
      ? "暂时无法回答：" + message
      : "暂时无法回答，请稍后重试。";
  }

  function answeringPause() {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, reducedMotion ? 0 : 220);
    });
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || send.disabled) return;

    input.value = "";
    addBubble(text, "user");
    send.disabled = true;
    input.disabled = true;
    panel.setAttribute("aria-busy", "true");
    setAssistantState(
      "thinking",
      "TINA 正在阅读 " + medicineName + " 的资料",
    );

    var responseStatus = 0;
    try {
      var response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: medicineId,
          session_id: sessionId,
          message: text,
          context: context,
        }),
      });
      responseStatus = response.status;
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        throw new Error(data.detail || "服务返回错误（" + response.status + "）");
      }

      setAssistantState("answering", "正在整理回答");
      await answeringPause();
      addBubble(data.answer || data.reply || "这次没有收到回答，请稍后重试。", "bot");
      setAssistantState("success", "回答已送达", 1400);
    } catch (error) {
      var errorCopy = friendlyError(error, responseStatus);
      addBubble(errorCopy, "bot");
      setAssistantState("error", errorCopy, 2600);
    } finally {
      send.disabled = false;
      input.disabled = false;
      panel.removeAttribute("aria-busy");
      if (panel.classList.contains("open")) input.focus();
    }
  }

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    void sendMessage();
  });

  var removalObserver = new MutationObserver(function () {
    if (host.isConnected) return;
    clearStateTimers();
    lifecycle.abort();
    removalObserver.disconnect();
  });
  removalObserver.observe(document.body, { childList: true });

  addBubble(greeting, "bot");
  setAssistantState("idle", "正在阅读：" + medicineName);
  scheduleSleep();
})();
