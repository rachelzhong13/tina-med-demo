/*
 * TINA Water Drop Assistant — a QR-context product companion.
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
  var title = config.title || "TINA 智能样品助手";
  var medicineName = config.medicineName || "当前样品";
  var allowedVariants = [
    "botanical-minimal",
    "oriental-editorial",
    "botanical-future",
  ];
  var variant =
    allowedVariants.indexOf(config.variant) >= 0
      ? config.variant
      : "botanical-minimal";
  var mode = config.mode || "botanical-guide";
  var greeting =
    config.greeting || "你好，我是 TINA。轻触我，可以一起读懂这份虚构展品资料。";

  var stateLabels = {
    idle: "轻触唤醒",
    notice: "我在这里",
    hover: "一起读懂样品",
    pressed: "正在响应",
    dragging: "跟随你的手势",
    opening: "正在展开对话",
    listening: "正在聆听",
    thinking: "正在理解资料",
    answering: "正在组织回答",
    success: "回答已送达",
    error: "问答暂不可用",
    sleep: "安静待机",
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
    return Object.keys(contextFromQuery).length
      ? JSON.stringify(contextFromQuery, null, 2)
      : "";
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
  host.dataset.zone = "hero";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        --accent: #557b62;
        --accent-strong: #355a43;
        --accent-soft: #dce8d8;
        --surface: #fbfaf4;
        --surface-raised: #eef3e8;
        --surface-soft: #e6ede1;
        --ink: #23372b;
        --muted: #5c6e62;
        --line: rgba(66, 88, 73, 0.24);
        --success: #3d7757;
        --danger: #a65242;
        color: var(--ink);
      }

      :host([data-variant="oriental-editorial"]) {
        --accent: #8e4b3f;
        --accent-strong: #71372f;
        --accent-soft: #eaded4;
        --surface: #f7f3ea;
        --surface-raised: #e9e3d8;
        --surface-soft: #ede7dd;
        --ink: #2d2924;
        --muted: #6e6258;
        --line: rgba(79, 63, 52, 0.26);
      }

      :host([data-variant="botanical-future"]) {
        --accent: #6f9b7c;
        --accent-strong: #426c50;
        --accent-soft: #d6e4d8;
        --surface: #f5f7f1;
        --surface-raised: #e4ece2;
        --surface-soft: #dce7dd;
        --ink: #1e3326;
        --muted: #52695a;
        --line: rgba(57, 85, 66, 0.25);
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
        right: max(17px, env(safe-area-inset-right));
        bottom: max(17px, env(safe-area-inset-bottom));
        z-index: 2147483647;
        width: 112px;
        height: 112px;
        padding: 0;
        display: grid;
        place-items: center;
        color: var(--ink);
        background: transparent;
        border: 0;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }

      #presence {
        position: absolute;
        right: 101px;
        bottom: 22px;
        min-width: 86px;
        display: grid;
        justify-items: end;
        gap: 2px;
        color: var(--ink);
        opacity: 0;
        pointer-events: none;
        text-align: right;
        transition:
          opacity 220ms ease,
          transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #presence::after {
        width: 42px;
        height: 1px;
        margin-top: 5px;
        display: block;
        background: linear-gradient(90deg, transparent, var(--accent));
        content: "";
      }

      #presence strong {
        font-family:
          "Aptos Display",
          "Segoe UI Variable Display",
          "PingFang SC",
          "Microsoft YaHei UI",
          sans-serif;
        font-size: 12px;
        font-weight: 780;
        letter-spacing: 0.16em;
      }

      #presence small {
        color: var(--muted);
        font-size: 10px;
        font-weight: 620;
        white-space: nowrap;
      }

      #portrait {
        position: relative;
        width: 106px;
        height: 106px;
        display: block;
        overflow: visible;
        background: transparent;
        border: 0;
        border-radius: 0;
        filter: drop-shadow(0 16px 18px rgba(37, 56, 43, 0.24));
        isolation: isolate;
        transition:
          filter 240ms ease,
          transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #portrait::before {
        display: none;
      }

      #portrait::after {
        position: absolute;
        z-index: 3;
        inset: 10px 9px 7px;
        border: 1px solid transparent;
        border-radius: 48% 52% 44% 56% / 58% 48% 52% 42%;
        content: "";
        pointer-events: none;
      }

      #portrait img {
        position: absolute;
        top: -20%;
        left: -20%;
        width: 140%;
        height: 140%;
        max-width: none;
        display: block;
        object-fit: cover;
        pointer-events: none;
      }

      #header-avatar img {
        position: absolute;
        top: -20%;
        left: -20%;
        width: 140%;
        height: 140%;
        display: block;
        object-fit: cover;
        pointer-events: none;
      }

      /* The source artwork already contains the dialogue bubble and herb;
         keep one unmodified copy in the floating entry to avoid a doubled
         branch while the full artwork remains available in the panel. */
      #portrait .herb-layer { display: none; }

      #fab:focus-visible {
        outline: 3px solid var(--accent-soft);
        outline-offset: 4px;
        border-radius: 48%;
      }

      #fab[data-state="idle"] #portrait {
        animation: tina-breathe 7.6s ease-in-out infinite;
      }

      #fab[data-state="idle"] #fab-image {
        animation: tina-inner-light 9s ease-in-out infinite;
      }

      :host([data-variant="botanical-minimal"]) #fab[data-state="idle"] #portrait {
        animation: tina-minimal-idle 8.4s ease-in-out infinite;
      }

      :host([data-variant="botanical-minimal"]) #portrait .herb-layer {
        animation: tina-minimal-herb 10s ease-in-out infinite;
      }

      :host([data-variant="oriental-editorial"]) #fab[data-state="idle"] #portrait {
        animation: tina-editorial-idle 11s step-end infinite;
      }

      :host([data-variant="oriental-editorial"]) #fab[data-state="idle"] #fab-image {
        animation: tina-editorial-ink 11s step-end infinite;
      }

      :host([data-variant="oriental-editorial"]) #portrait .herb-layer {
        animation: tina-editorial-herb 11s step-end infinite;
      }

      :host([data-variant="botanical-future"]) #fab[data-state="idle"] #portrait {
        animation: tina-future-idle 5.8s ease-in-out infinite;
      }

      :host([data-variant="botanical-future"]) #fab[data-state="idle"] #fab-image {
        animation: tina-future-light 4.6s ease-in-out infinite;
      }

      :host([data-variant="botanical-future"]) #portrait .herb-layer {
        animation: tina-future-herb 6.8s ease-in-out infinite;
      }

      #fab[data-state="notice"] #portrait {
        filter: drop-shadow(14px 22px 30px rgba(0, 0, 0, 0.24));
        transform: translateY(-3px) rotate(-1.5deg);
      }

      #fab[data-state="hover"] #presence {
        opacity: 1;
        transform: translateX(-3px);
      }

      #fab[data-state="hover"] #portrait {
        filter: drop-shadow(16px 25px 34px rgba(0, 0, 0, 0.27));
        transform: translateY(-4px) rotate(1deg);
      }

      #fab[data-state="pressed"] #portrait {
        transform: scaleX(1.045) scaleY(0.94);
      }

      #fab[data-state="dragging"] {
        cursor: grabbing;
      }

      #fab[data-state="dragging"] #portrait {
        filter: drop-shadow(18px 28px 38px rgba(0, 0, 0, 0.3));
        transform: rotate(var(--drag-angle, 0deg)) scaleX(1.06) scaleY(0.94);
      }

      #fab[data-state="opening"] #portrait {
        animation: tina-open 440ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="listening"] #portrait::after {
        border-color: rgba(169, 200, 185, 0.68);
        box-shadow: inset 0 0 18px rgba(169, 200, 185, 0.22);
      }

      #fab[data-state="thinking"] #portrait {
        filter: saturate(0.9) brightness(1.06);
      }

      #fab[data-state="thinking"] #portrait::after {
        border-top-color: var(--accent-soft);
        border-right-color: rgba(169, 200, 185, 0.2);
        animation: tina-think 1.15s linear infinite;
      }

      #fab[data-state="answering"] #portrait {
        animation: tina-answer 680ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="success"] #portrait::after {
        border-color: var(--success);
        animation: tina-confirm 620ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #fab[data-state="error"] #portrait {
        filter: saturate(0.64) brightness(0.82);
      }

      #fab[data-state="error"] #portrait::after {
        border-color: var(--danger);
      }

      #fab[data-state="sleep"] #portrait {
        filter: saturate(0.64) brightness(0.72);
        transform: scale(0.975);
      }

      #fab[data-state="sleep"] #presence {
        opacity: 0.38;
      }

      :host([data-zone="content"]) #presence {
        opacity: 0 !important;
        transform: translateX(8px);
      }

      #panel {
        position: fixed;
        right: 18px;
        bottom: 126px;
        z-index: 2147483647;
        width: min(392px, calc(100vw - 24px));
        height: min(590px, calc(100dvh - 132px));
        min-width: 0;
        min-height: 0;
        display: none;
        flex-direction: column;
        overflow: hidden;
        color: var(--ink);
        background: color-mix(in srgb, var(--surface), transparent 2%);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow:
          18px 30px 70px rgba(30, 43, 35, 0.3),
          inset 1px 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(18px) saturate(116%);
        font-family:
          "Segoe UI Variable Text",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei UI",
          sans-serif;
      }

      #panel.open {
        display: flex;
        animation: panel-enter 320ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      :host([data-variant="oriental-editorial"]) #panel.open {
        animation-name: tina-editorial-panel-enter;
      }

      :host([data-variant="botanical-future"]) #panel.open {
        animation-name: tina-future-panel-enter;
      }

      #header {
        min-height: 78px;
        padding: 13px 12px 13px 15px;
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
        gap: 12px;
      }

      #header-avatar {
        position: relative;
        width: 50px;
        height: 50px;
        flex: 0 0 50px;
        overflow: visible;
        background: transparent;
        border: 0;
        border-radius: 0;
      }

      #header-copy {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      #assistant-title,
      #medicine-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #assistant-title {
        font-family:
          "Aptos Display",
          "Segoe UI Variable Display",
          "PingFang SC",
          "Microsoft YaHei UI",
          sans-serif;
        font-size: 15px;
        font-weight: 700;
      }

      #medicine-name {
        color: var(--muted);
        font-size: 11px;
        font-weight: 600;
      }

      #close {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        padding: 0;
        display: grid;
        place-items: center;
        color: var(--ink);
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid var(--line);
        border-radius: 4px;
        cursor: pointer;
        transition:
          background-color 160ms ease,
          border-color 160ms ease;
      }

      #close:hover {
        background: rgba(255, 255, 255, 0.88);
        border-color: var(--line);
      }

      #close svg {
        width: 19px;
        height: 19px;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-width: 1.5;
      }

      #close:focus-visible,
      #send:focus-visible,
      #input:focus-visible {
        outline: 3px solid var(--accent-soft);
        outline-offset: 2px;
      }

      #status {
        min-height: 34px;
        padding: 7px 15px;
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--muted);
        background: var(--surface-soft);
        border-bottom: 1px solid var(--line);
        font-size: 11px;
        font-weight: 650;
      }

      #status-dot {
        width: 6px;
        height: 6px;
        flex: 0 0 6px;
        background: var(--accent);
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(169, 200, 185, 0.34);
      }

      #panel[data-state="listening"] #status-dot {
        box-shadow: 0 0 16px rgba(169, 200, 185, 0.72);
      }

      #panel[data-state="thinking"] #status-dot,
      #panel[data-state="answering"] #status-dot {
        animation: status-pulse 1.1s ease-in-out infinite;
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
        padding: 8px 15px 18px;
        overflow-y: auto;
        color: var(--ink);
        background: var(--surface);
        scrollbar-color: #8b9b90 var(--surface);
        scrollbar-width: thin;
        font-size: 15px;
        line-height: 1.67;
      }

      .bubble {
        position: relative;
        max-width: 88%;
        margin: 10px 0;
        padding: 25px 13px 12px;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        border: 1px solid var(--line);
        border-radius: 15px;
      }

      .bubble::before {
        position: absolute;
        top: 8px;
        left: 13px;
        color: #69756e;
        font-size: 9px;
        font-weight: 760;
        letter-spacing: 0.12em;
      }

      .bubble.user {
        margin-left: auto;
        color: #ffffff;
        background: var(--accent-strong);
        border-color: var(--accent-strong);
      }

      .bubble.user::before {
        right: 13px;
        left: auto;
        color: rgba(255, 255, 255, 0.72);
        content: "YOU";
      }

      .bubble.bot {
        color: var(--ink);
        background: var(--surface-soft);
      }

      .bubble.bot::before {
        color: var(--accent);
        content: "TINA";
      }

      #composer {
        padding:
          11px
          11px
          max(11px, env(safe-area-inset-bottom));
        display: flex;
        gap: 8px;
        background: var(--surface-raised);
        border-top: 1px solid var(--line);
      }

      #input {
        min-width: 0;
        min-height: 48px;
        flex: 1;
        padding: 0 12px;
        color: var(--ink);
        caret-color: var(--accent-soft);
        background: #ffffff;
        border: 1px solid var(--line);
        border-radius: 12px;
        font-size: 16px;
        transition:
          border-color 160ms ease,
          background-color 160ms ease;
      }

      #input::placeholder {
        color: #78837d;
        opacity: 1;
      }

      #input:focus {
        background: #ffffff;
        border-color: var(--accent);
      }

      #input:disabled {
        color: var(--muted);
        background: var(--surface-soft);
        cursor: wait;
      }

      #send {
        min-width: 66px;
        min-height: 48px;
        padding: 0 13px;
        flex: 0 0 auto;
        color: #ffffff;
        background: var(--accent-strong);
        border: 1px solid var(--accent-strong);
        border-radius: 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 760;
        transition:
          background-color 160ms ease,
          color 160ms ease,
          transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #send:hover {
        background: var(--accent);
      }

      #send:active {
        transform: scale(0.97);
      }

      #send:disabled {
        color: #76877b;
        background: #cfd9d1;
        border-color: #cfd9d1;
        cursor: wait;
      }

      @keyframes panel-enter {
        from {
          opacity: 0.78;
          filter: blur(5px);
          transform: translateY(14px) scale(0.985);
          clip-path: inset(0 0 10% 0 round 16px);
        }
        to {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0) scale(1);
          clip-path: inset(0 0 0 0 round 16px);
        }
      }

      @keyframes tina-breathe {
        0%,
        100% {
          transform: translateY(0) scaleX(1) scaleY(1);
        }
        50% {
          transform: translateY(-3px) scaleX(1.006) scaleY(1.012);
        }
      }

      @keyframes tina-herb-sway {
        0%, 100% { transform: rotate(-0.6deg) translateY(0); }
        50% { transform: rotate(1.1deg) translateY(-1px); }
      }

      @keyframes tina-inner-light {
        0%, 100% { filter: brightness(1) saturate(1); }
        50% { filter: brightness(1.035) saturate(1.025); }
      }

      @keyframes tina-minimal-idle {
        0%, 100% { transform: translateY(0) rotate(-0.35deg); }
        50% { transform: translateY(-3px) rotate(0.45deg); }
      }

      @keyframes tina-minimal-herb {
        0%, 100% { transform: rotate(-0.7deg); }
        50% { transform: rotate(1deg) translateY(-1px); }
      }

      @keyframes tina-editorial-idle {
        0%, 82%, 100% { transform: translate(0, 0); }
        84% { transform: translate(1px, 0); }
        86% { transform: translate(-1px, 1px); }
        88% { transform: translate(0, 0); }
      }

      @keyframes tina-editorial-ink {
        0%, 82%, 100% { filter: contrast(1) saturate(1); }
        84% { filter: contrast(1.025) saturate(0.96); }
        88% { filter: contrast(1) saturate(1); }
      }

      @keyframes tina-editorial-herb {
        0%, 82%, 100% { transform: translate(0, 0); }
        84% { transform: translate(1px, -1px); }
        88% { transform: translate(0, 0); }
      }

      @keyframes tina-future-idle {
        0%, 100% { transform: translateY(0); box-shadow: 10px 18px 38px rgba(37, 56, 43, 0.28), 0 0 0 rgba(111, 155, 124, 0); }
        50% { transform: translateY(-4px); box-shadow: 12px 23px 43px rgba(37, 56, 43, 0.3), 0 0 22px rgba(111, 155, 124, 0.18); }
      }

      @keyframes tina-future-light {
        0%, 100% { filter: brightness(0.99) saturate(1); }
        50% { filter: brightness(1.06) saturate(1.04); }
      }

      @keyframes tina-future-herb {
        0%, 100% { opacity: 0.82; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-2px); }
      }

      @keyframes tina-editorial-panel-enter {
        from { opacity: 0; clip-path: inset(0 100% 0 0 round 16px); transform: translateX(-8px); }
        to { opacity: 1; clip-path: inset(0 0 0 0 round 16px); transform: translateX(0); }
      }

      @keyframes tina-future-panel-enter {
        from { opacity: 0.3; filter: blur(8px); transform: scale(0.97); }
        to { opacity: 1; filter: blur(0); transform: scale(1); }
      }

      @keyframes tina-open {
        0% {
          transform: scaleX(1.04) scaleY(0.94);
        }
        58% {
          transform: scaleX(0.985) scaleY(1.045) translateY(-3px);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes tina-think {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes tina-answer {
        0%,
        100% {
          border-radius: 58% 42% 49% 51% / 62% 46% 54% 38%;
          transform: translateY(0);
        }
        50% {
          border-radius: 49% 51% 57% 43% / 55% 60% 40% 45%;
          transform: translateY(-3px);
        }
      }

      @keyframes tina-confirm {
        0% {
          opacity: 0.3;
          transform: scale(0.91);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes status-pulse {
        0%,
        100% {
          opacity: 0.45;
          transform: scale(0.78);
        }
        50% {
          opacity: 1;
          transform: scale(1.18);
        }
      }

      @media (hover: none) {
        #presence {
          display: none;
        }

        #close:hover {
          background: rgba(255, 255, 255, 0.035);
          border-color: var(--line);
        }

        #send:hover {
          background: var(--accent-soft);
        }
      }

      @media (max-width: 520px) {
        #fab {
          right: max(12px, env(safe-area-inset-right));
          bottom: max(12px, env(safe-area-inset-bottom));
          width: 100px;
          height: 100px;
        }

        #portrait {
          width: 96px;
          height: 96px;
        }

        #presence {
          right: 92px;
          bottom: 16px;
          min-width: 78px;
        }

        #panel {
          border-radius: 13px;
        }

        :host([data-zone="content"]) #fab {
          width: 92px;
          height: 92px;
        }

        :host([data-zone="content"]) #portrait {
          width: 88px;
          height: 88px;
        }
      }

      @media (max-width: 350px) {
        #presence {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #panel.open,
        #fab #portrait,
        #fab #portrait::after,
        #fab img,
        #presence,
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
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      data-state="idle"
    >
      <span id="presence" aria-hidden="true">
        <strong>TINA</strong>
        <small id="presence-copy">轻触唤醒</small>
      </span>
      <span id="portrait">
        <img id="fab-image" alt="" />
        <img id="herb-image" class="herb-layer" alt="" aria-hidden="true" />
      </span>
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
  var herbImage = shadow.getElementById("herb-image");
  var headerImage = shadow.getElementById("header-image");
  var assistantTitle = shadow.getElementById("assistant-title");
  var medicineNameElement = shadow.getElementById("medicine-name");
  var fabLabel = shadow.getElementById("fab-label");
  var presenceCopy = shadow.getElementById("presence-copy");

  fabImage.src = iconUrl;
  herbImage.src = iconUrl;
  headerImage.src = iconUrl;
  assistantTitle.textContent = title;
  medicineNameElement.textContent = medicineName + " · 当前样品";
  input.placeholder = "问我关于" + medicineName + "的问题";
  input.setAttribute("aria-label", "询问" + medicineName);
  fabLabel.textContent = "打开" + title;
  fab.setAttribute("aria-label", "打开" + title + "。可拖动，方向键也可移动位置");
  panel.setAttribute("aria-label", title + "，当前样品：" + medicineName);
  close.setAttribute("aria-label", "关闭" + title);

  var dragState = null;
  var movedDuringPointer = false;
  var assistantState = "idle";
  var stateResetTimer = 0;
  var sleepTimer = 0;
  var noticeTimer = 0;
  var noticeShown = false;
  var userPositioned = false;
  var lifecycle = new AbortController();
  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function clearStateTimers() {
    window.clearTimeout(stateResetTimer);
    window.clearTimeout(sleepTimer);
    window.clearTimeout(noticeTimer);
    stateResetTimer = 0;
    sleepTimer = 0;
    noticeTimer = 0;
  }

  function restingState() {
    return panel.classList.contains("open") && shadow.activeElement === input
      ? "listening"
      : "idle";
  }

  function scheduleSleep() {
    window.clearTimeout(sleepTimer);
    if (panel.classList.contains("open")) return;
    sleepTimer = window.setTimeout(function () {
      setAssistantState("sleep");
    }, 24000);
  }

  function scheduleNotice() {
    if (noticeShown || reducedMotion) return;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () {
      if (panel.classList.contains("open") || assistantState !== "idle") return;
      noticeShown = true;
      setAssistantState("notice", "TINA 已准备好回答当前样品问题", 1900);
    }, 1800);
  }

  function setAssistantState(nextState, detail, resetAfter) {
    window.clearTimeout(stateResetTimer);
    assistantState = nextState;
    host.dataset.state = nextState;
    fab.dataset.state = nextState;
    panel.dataset.state = nextState;
    var copy = detail || stateLabels[nextState] || "";
    statusCopy.textContent = copy;
    presenceCopy.textContent = stateLabels[nextState] || "轻触唤醒";
    if (
      detail &&
      ["notice", "opening", "thinking", "answering", "success", "error"].indexOf(
        nextState,
      ) >= 0
    ) {
      stateAnnouncer.textContent = detail;
    }
    if (resetAfter) {
      stateResetTimer = window.setTimeout(function () {
        setAssistantState(restingState());
        if (!panel.classList.contains("open")) scheduleSleep();
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

  function placeFabForContext() {
    var inHero = window.scrollY < 80;
    host.dataset.zone = inHero ? "hero" : "content";
    if (userPositioned || window.innerWidth > 520) return;

    var bounds = getViewportBounds();
    var nextLeft = bounds.right - fab.offsetWidth;
    var nextTop = bounds.bottom - fab.offsetHeight;
    if (inHero) {
      var stage = document.querySelector(".product-visual");
      if (stage) {
        var stageRect = stage.getBoundingClientRect();
        nextTop = stageRect.bottom - fab.offsetHeight * 0.82;
      }
    }

    nextTop = Math.max(
      bounds.top,
      Math.min(nextTop, bounds.bottom - fab.offsetHeight),
    );
    fab.style.left = nextLeft + "px";
    fab.style.top = nextTop + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
  }

  function positionPanelNearFab() {
    if (!panel.classList.contains("open")) return;

    var gap = 13;
    var bounds = getViewportBounds();
    var fabRect = fab.getBoundingClientRect();
    var availableWidth = Math.max(1, bounds.right - bounds.left);
    var availableHeight = Math.max(1, bounds.bottom - bounds.top);
    var desiredWidth = Math.min(392, availableWidth);
    var desiredHeight = Math.min(590, availableHeight);
    var minUsefulWidth = 250;
    var minUsefulHeight = 280;

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

    left = Math.max(bounds.left, Math.min(left, bounds.right - panelWidth));
    top = Math.max(bounds.top, Math.min(top, bounds.bottom - panelHeight));

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
      noticeShown = true;
      if (window.innerWidth <= 520 && !userPositioned) {
        var bounds = getViewportBounds();
        host.dataset.zone = "content";
        fab.style.left = bounds.right - fab.offsetWidth + "px";
        fab.style.top = bounds.bottom - fab.offsetHeight + "px";
        fab.style.right = "auto";
        fab.style.bottom = "auto";
      }
      setAssistantState("opening", "正在展开 " + medicineName + " 的对话");
      positionPanelNearFab();
      window.requestAnimationFrame(function () {
        input.focus();
      });
      stateResetTimer = window.setTimeout(function () {
        setAssistantState("listening", "可以询问 " + medicineName);
      }, reducedMotion ? 0 : 340);
    } else {
      setAssistantState("idle");
      if (!userPositioned) window.requestAnimationFrame(placeFabForContext);
      scheduleSleep();
    }
  }

  function releasePointer(pointerId) {
    if (fab.hasPointerCapture(pointerId)) {
      fab.releasePointerCapture(pointerId);
    }
    dragState = null;
    fab.style.removeProperty("--drag-angle");
  }

  fab.addEventListener("pointerenter", function () {
    wakeAssistant();
    if (!dragState && assistantState === "idle") setAssistantState("hover");
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
      userPositioned = true;
      var angle = Math.max(-7, Math.min(7, deltaX / 8));
      fab.style.setProperty("--drag-angle", angle + "deg");
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
      setAssistantState("pressed", null, 110);
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

  fab.addEventListener("keydown", function (event) {
    var movement = {
      ArrowUp: [0, -12],
      ArrowDown: [0, 12],
      ArrowLeft: [-12, 0],
      ArrowRight: [12, 0],
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    userPositioned = true;
    var rect = fab.getBoundingClientRect();
    fab.style.left = rect.left + movement[0] + "px";
    fab.style.top = rect.top + movement[1] + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
    clampFabToViewport();
    setAssistantState("notice", "小水滴位置已调整", 800);
    if (panel.classList.contains("open")) positionPanelNearFab();
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
    placeFabForContext();
    clampFabToViewport();
    if (panel.classList.contains("open")) positionPanelNearFab();
  }

  window.addEventListener("resize", handleViewportChange, {
    signal: lifecycle.signal,
  });

  window.addEventListener("scroll", handleViewportChange, {
    passive: true,
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

  input.addEventListener("focus", function () {
    if (
      panel.classList.contains("open") &&
      ["thinking", "answering", "success", "error"].indexOf(assistantState) < 0
    ) {
      setAssistantState("listening", "正在聆听你的问题");
    }
  });

  input.addEventListener("input", function () {
    if (!send.disabled) setAssistantState("listening", "正在聆听你的问题");
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
      window.setTimeout(resolve, reducedMotion ? 0 : 260);
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
      "TINA 正在理解 " + medicineName + " 的资料",
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

      setAssistantState("answering", "正在组织回答");
      await answeringPause();
      addBubble(data.answer || data.reply || "这次没有收到回答，请稍后重试。", "bot");
      setAssistantState("success", "回答已送达", 1500);
    } catch (error) {
      var errorCopy = friendlyError(error, responseStatus);
      addBubble(errorCopy, "bot");
      setAssistantState("error", errorCopy, 2800);
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
  window.requestAnimationFrame(placeFabForContext);
  scheduleNotice();
  scheduleSleep();
})();
