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
  var streamApiPath =
    (scriptEl && scriptEl.dataset.streamApiPath) ||
    config.streamApiPath ||
    apiPath.replace(/\/chat$/, "/chat/stream");
  var STREAM_API = apiBase.replace(/\/$/, "") + streamApiPath;
  var voiceApiPath =
    (scriptEl && scriptEl.dataset.voiceApiPath) ||
    config.voiceApiPath ||
    apiPath.replace(/\/chat$/, "/chat/voice");
  var VOICE_API = apiBase.replace(/\/$/, "") + voiceApiPath;
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
    config.greeting || "你好，我是 TINA，小水滴样品助手。你可以问我展品信息、知识库资料，或需要进一步查询的问题。";

  var stateLabels = {
    idle: "轻触唤醒",
    notice: "我在这里",
    hover: "一起读懂样品",
    pressed: "正在响应",
    dragging: "跟随你的手势",
    opening: "正在展开对话",
    listening: "等待提问",
    thinking: "正在理解资料",
    searching: "正在检索资料",
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
        --line-soft: rgba(66, 88, 73, 0.14);
        --panel-glass: rgba(251, 250, 244, 0.92);
        --panel-glow: rgba(85, 123, 98, 0.18);
        --panel-depth: rgba(25, 39, 31, 0.18);
        --bubble-shade: rgba(35, 55, 43, 0.09);
        --white-glass: rgba(255, 255, 255, 0.68);
        --success: #3d7757;
        --danger: #a65242;
        --ease-out: cubic-bezier(0.2, 0, 0, 1);
        --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
        --ease-lift: cubic-bezier(0.22, 1, 0.36, 1);
        --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
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
        --line-soft: rgba(79, 63, 52, 0.14);
        --panel-glass: rgba(247, 243, 234, 0.92);
        --panel-glow: rgba(142, 75, 63, 0.15);
        --panel-depth: rgba(48, 37, 30, 0.18);
        --bubble-shade: rgba(79, 63, 52, 0.1);
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
        --line-soft: rgba(57, 85, 66, 0.14);
        --panel-glass: rgba(245, 247, 241, 0.9);
        --panel-glow: rgba(111, 155, 124, 0.2);
        --panel-depth: rgba(22, 45, 31, 0.2);
        --bubble-shade: rgba(57, 85, 66, 0.1);
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
          opacity 260ms var(--ease-out),
          transform 360ms var(--ease-lift);
        will-change: opacity, transform;
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
        filter: drop-shadow(0 18px 18px rgba(37, 56, 43, 0.18));
        isolation: isolate;
        transition:
          filter 320ms var(--ease-out),
          transform 340ms var(--ease-lift);
        transform-origin: 52% 72%;
        will-change: filter, transform;
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
        will-change: opacity, transform;
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
        filter: drop-shadow(12px 20px 28px rgba(35, 55, 43, 0.22));
        transform: translateY(-2px) rotate(-0.8deg);
      }

      #fab[data-state="hover"] #presence {
        opacity: 1;
        transform: translateX(-5px);
      }

      #fab[data-state="hover"] #portrait {
        filter: drop-shadow(12px 24px 34px rgba(35, 55, 43, 0.24));
        transform: translateY(-5px) scale(1.012) rotate(0.35deg);
      }

      #fab[data-state="pressed"] #portrait {
        transform: translateY(1px) scale(0.965);
      }

      #fab[data-state="dragging"] {
        cursor: grabbing;
      }

      #fab[data-state="dragging"] #portrait {
        filter: drop-shadow(14px 28px 38px rgba(35, 55, 43, 0.27));
        transform: rotate(var(--drag-angle, 0deg)) scale(0.985);
      }

      #fab[data-state="opening"] #portrait {
        animation: tina-open 520ms var(--ease-lift);
      }

      #fab[data-state="listening"] #portrait::after {
        border-color: rgba(169, 200, 185, 0.68);
        box-shadow: inset 0 0 18px rgba(169, 200, 185, 0.22);
        animation: tina-listen-ring 1.8s ease-in-out infinite;
      }

      #fab[data-state="searching"] #portrait,
      #fab[data-state="thinking"] #portrait {
        filter: saturate(0.9) brightness(1.06);
      }

      #fab[data-state="searching"] #portrait::after,
      #fab[data-state="thinking"] #portrait::after {
        border-top-color: var(--accent-soft);
        border-right-color: rgba(169, 200, 185, 0.2);
        animation: tina-think 1.15s linear infinite;
      }

      #fab[data-state="answering"] #portrait {
        animation: tina-answer 1.2s var(--ease-in-out) infinite;
      }

      #fab[data-state="success"] #portrait::after {
        border-color: var(--success);
        animation: tina-confirm 760ms var(--ease-lift);
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
        width: min(404px, calc(100vw - 24px));
        height: min(604px, calc(100dvh - 132px));
        min-width: 0;
        min-height: 0;
        display: none;
        flex-direction: column;
        overflow: hidden;
        color: var(--ink);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.34), transparent 34%),
          var(--panel-glass);
        border: 1px solid var(--line-soft);
        border-radius: 16px;
        box-shadow:
          0 26px 70px var(--panel-depth),
          0 8px 26px rgba(25, 39, 31, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.78),
          inset 0 -1px 0 rgba(255, 255, 255, 0.38);
        backdrop-filter: blur(24px) saturate(135%);
        font-family:
          "Segoe UI Variable Text",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei UI",
          sans-serif;
        transform-origin: calc(100% - 64px) calc(100% + 46px);
        will-change: opacity, transform, filter;
      }

      #panel::before {
        position: absolute;
        top: 0;
        right: 18px;
        left: 18px;
        height: 1px;
        background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent), #ffffff 12%), transparent);
        content: "";
        opacity: 0.55;
        pointer-events: none;
      }

      #panel::after {
        position: absolute;
        inset: 1px;
        border: 1px solid rgba(255, 255, 255, 0.34);
        border-radius: 15px;
        content: "";
        pointer-events: none;
      }

      #panel[data-state="thinking"]::before,
      #panel[data-state="searching"]::before,
      #panel[data-state="answering"]::before {
        animation: panel-status-sheen 1.7s var(--ease-out) infinite;
      }

      #panel.open {
        display: flex;
        animation: panel-enter 440ms var(--ease-lift);
      }

      #panel.open #header {
        animation: panel-layer-in 420ms var(--ease-lift) both;
      }

      #panel.open #status {
        animation: panel-layer-in 460ms var(--ease-lift) 35ms both;
      }

      #panel.open #messages {
        animation: panel-layer-in 500ms var(--ease-lift) 60ms both;
      }

      #panel.open #composer {
        animation: panel-composer-in 520ms var(--ease-lift) 80ms both;
      }

      :host([data-variant="oriental-editorial"]) #panel.open {
        animation-name: tina-editorial-panel-enter;
      }

      :host([data-variant="botanical-future"]) #panel.open {
        animation-name: tina-future-panel-enter;
      }

      #header {
        min-height: 74px;
        padding: 13px 12px 12px 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--ink);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.12)),
          color-mix(in srgb, var(--accent-soft), #ffffff 22%);
        border-bottom: 1px solid var(--line-soft);
        transform: translateZ(0);
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
        font-size: 14px;
        font-weight: 760;
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
        color: var(--muted);
        background: rgba(255, 255, 255, 0.48);
        border: 1px solid var(--line-soft);
        border-radius: 10px;
        cursor: pointer;
        transition:
          transform 190ms var(--ease-lift),
          background-color 160ms ease,
          color 160ms ease,
          border-color 160ms ease;
      }

      #close:hover {
        background: rgba(255, 255, 255, 0.88);
        color: var(--ink);
        border-color: var(--line);
        transform: translateY(-1px);
      }

      #close:active {
        transform: translateY(0) scale(0.96);
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
        min-height: 32px;
        padding: 6px 15px;
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--muted);
        background:
          linear-gradient(90deg, color-mix(in srgb, var(--surface), var(--accent-soft) 36%), color-mix(in srgb, var(--surface), #ffffff 20%));
        border-bottom: 1px solid var(--line-soft);
        font-size: 11px;
        font-weight: 680;
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
      #panel[data-state="searching"] #status-dot,
      #panel[data-state="answering"] #status-dot {
        animation: status-pulse 1.3s var(--ease-in-out) infinite;
      }

      #panel[data-state="searching"] #status-dot {
        width: 12px;
        height: 12px;
        flex-basis: 12px;
        background: transparent;
        border: 2px solid color-mix(in srgb, var(--accent), transparent 72%);
        border-top-color: var(--accent);
        box-shadow: none;
        animation: status-spin 0.95s linear infinite;
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
        padding: 10px 15px 18px;
        overflow-y: auto;
        color: var(--ink);
        background:
          radial-gradient(circle at 18% 4%, var(--panel-glow), transparent 26%),
          linear-gradient(180deg, color-mix(in srgb, var(--surface), #ffffff 34%), color-mix(in srgb, var(--surface), var(--accent-soft) 8%) 58%, var(--surface));
        scrollbar-color: #8b9b90 var(--surface);
        scrollbar-width: thin;
        font-size: 15px;
        line-height: 1.67;
        scroll-behavior: smooth;
      }

      .bubble {
        position: relative;
        width: fit-content;
        max-width: 90%;
        margin: 9px 0;
        padding: 12px 14px;
        display: block;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        border: 1px solid transparent;
        border-radius: 12px;
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.48),
          0 10px 26px rgba(35, 55, 43, 0.06);
        transform-origin: 0 100%;
        will-change: opacity, transform;
        animation: bubble-in 520ms var(--ease-lift);
      }

      .bubble::after {
        position: absolute;
        inset: 1px 1px auto;
        height: 45%;
        border-radius: 11px 11px 8px 8px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
        content: "";
        opacity: 0.72;
        pointer-events: none;
      }

      .bubble.bot {
        white-space: normal;
      }

      .bubble::before {
        display: none;
      }

      .bubble.user {
        min-width: 0;
        margin-left: auto;
        color: #ffffff;
        background:
          linear-gradient(145deg, color-mix(in srgb, var(--accent-strong), #111111 8%), var(--accent));
        border-color: color-mix(in srgb, var(--accent-strong), #ffffff 10%);
        border-bottom-right-radius: 5px;
        box-shadow:
          0 14px 30px rgba(35, 55, 43, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.22);
        transform-origin: 100% 100%;
        animation-name: user-bubble-send;
      }

      .bubble.user::before {
        right: 13px;
        left: auto;
        color: rgba(255, 255, 255, 0.72);
        content: "YOU";
      }

      .bubble.bot {
        min-width: 0;
        color: var(--ink);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.54));
        border-color: var(--line-soft);
        border-bottom-left-radius: 5px;
        box-shadow:
          0 14px 32px var(--bubble-shade),
          inset 0 1px 0 rgba(255, 255, 255, 0.82);
        animation-name: bot-bubble-reply;
      }

      .bubble.bot::before {
        color: var(--accent);
        content: "TINA";
      }

      .bubble.loading {
        min-width: 168px;
        background:
          linear-gradient(100deg, rgba(255, 255, 255, 0.42) 20%, rgba(255, 255, 255, 0.94) 46%, rgba(255, 255, 255, 0.42) 72%),
          linear-gradient(180deg, color-mix(in srgb, var(--surface-soft), #ffffff 46%), color-mix(in srgb, var(--surface-soft), #ffffff 24%));
        background-size: 220% 100%;
        animation:
          bot-bubble-reply 560ms var(--ease-lift),
          soft-shimmer 2.1s var(--ease-in-out) infinite;
      }

      .bubble.quiet-loading {
        display: none;
      }

      .answer-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
      }

      .answer-loading-dots {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .answer-loading-dots i {
        width: 5px;
        height: 5px;
        display: block;
        background: var(--accent);
        border-radius: 50%;
        opacity: 0.42;
        animation: answer-dot 1.18s var(--ease-in-out) infinite;
      }

      .answer-loading-dots i:nth-child(2) {
        animation-delay: 120ms;
      }

      .answer-loading-dots i:nth-child(3) {
        animation-delay: 240ms;
      }

      .bubble :is(p, ul, ol, pre, blockquote) {
        margin: 0 0 9px;
      }

      .bubble :is(p, ul, ol, pre, blockquote):last-child {
        margin-bottom: 0;
      }

      .bubble :is(h1, h2, h3) {
        margin: 2px 0 8px;
        font-size: 15px;
        line-height: 1.45;
      }

      .bubble ul,
      .bubble ol {
        padding-left: 1.25em;
      }

      .bubble li + li {
        margin-top: 4px;
      }

      .bubble code {
        padding: 1px 4px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--line-soft);
        border-radius: 4px;
        font-family: "Cascadia Code", Consolas, monospace;
        font-size: 0.92em;
      }

      .bubble pre {
        max-width: 100%;
        padding: 9px;
        overflow-x: auto;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--line-soft);
        border-radius: 8px;
      }

      .bubble pre code {
        padding: 0;
        background: transparent;
        border: 0;
      }

      .bubble a {
        color: var(--accent-strong);
        font-weight: 650;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
      }

      .citation {
        min-width: 20px;
        min-height: 17px;
        margin: 0 2px;
        padding: 0 5px 1px;
        display: inline-grid;
        place-items: center;
        color: var(--accent-strong);
        background: rgba(255, 255, 255, 0.52);
        border: 1px solid color-mix(in srgb, var(--accent), transparent 50%);
        border-radius: 6px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
        font-size: 9px;
        font-weight: 820;
        line-height: 1;
        cursor: pointer;
        vertical-align: super;
        transform: translateY(-1px);
        transition:
          transform 180ms var(--ease-lift),
          color 150ms ease,
          background-color 150ms ease,
          border-color 150ms ease;
      }

      .citation:hover {
        color: #ffffff;
        background: var(--accent-strong);
        border-color: var(--accent-strong);
        transform: translateY(-2px);
      }

      .citation:focus-visible {
        outline: 2px solid var(--accent-soft);
        outline-offset: 2px;
      }

      .reference-card {
        display: grid;
        gap: 8px;
        color: var(--ink);
        animation: reference-rise 240ms var(--ease-lift);
      }

      .reference-card strong {
        font-size: 13px;
        line-height: 1.4;
      }

      .reference-card p {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }

      .reference-card a {
        width: fit-content;
        min-height: 32px;
        padding: 6px 10px;
        display: inline-grid;
        place-items: center;
        color: #ffffff;
        background: var(--accent-strong);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 720;
        text-decoration: none;
        transition:
          background-color 160ms ease,
          transform 180ms var(--ease-lift);
      }

      .reference-card a:hover {
        background: var(--accent);
        transform: translateY(-1px);
      }

      .bubble.tool {
        max-width: 92%;
        width: min(330px, 92%);
        padding: 12px;
        background: rgba(255, 255, 255, 0.5);
        border-color: var(--line-soft);
        animation-duration: 360ms;
      }

      .bubble.tool.transient {
        width: fit-content;
        max-width: min(320px, 92%);
        padding: 10px 12px;
        color: var(--muted);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.42)),
          color-mix(in srgb, var(--surface-soft), #ffffff 34%);
        border-color: color-mix(in srgb, var(--accent), transparent 78%);
        border-radius: 10px;
        box-shadow:
          0 12px 28px rgba(35, 55, 43, 0.07),
          inset 0 1px 0 rgba(255, 255, 255, 0.78);
      }

      .bubble.tool.retiring {
        animation: tool-retire 360ms var(--ease-in-out) forwards;
      }

      .bubble.tool.search-collapsed {
        width: fit-content;
        max-width: min(352px, 94%);
        padding: 0;
        overflow: hidden;
      }

      .bubble.tool.source-links {
        width: fit-content;
        max-width: min(360px, 94%);
        padding: 0;
        overflow: hidden;
        border-color: color-mix(in srgb, var(--accent), transparent 76%);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.48)),
          color-mix(in srgb, var(--surface-raised), #ffffff 18%);
        box-shadow:
          0 14px 34px rgba(35, 55, 43, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .bubble.tool::before {
        display: none;
      }

      .search-status {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 680;
      }

      .search-status strong {
        color: var(--ink);
        font-size: 11px;
        font-weight: 760;
      }

      .search-reason {
        margin-top: 5px;
        color: color-mix(in srgb, var(--muted), #ffffff 12%);
        font-size: 10px;
        line-height: 1.45;
      }

      .search-spinner {
        width: 14px;
        height: 14px;
        flex: 0 0 14px;
        border: 2px solid color-mix(in srgb, var(--accent), transparent 74%);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: status-spin 0.9s linear infinite;
      }

      .thinking-card {
        display: grid;
        gap: 5px;
      }

      .thinking-card__line {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .thinking-card__label {
        color: var(--ink);
        font-size: 12px;
        font-weight: 760;
      }

      .thinking-card__meta {
        max-width: 238px;
        overflow: hidden;
        color: color-mix(in srgb, var(--muted), #ffffff 10%);
        font-size: 10px;
        font-weight: 560;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-toggle {
        width: 100%;
        min-height: 40px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        background: transparent;
        border: 0;
        cursor: pointer;
        text-align: left;
      }

      .search-toggle:hover {
        background: rgba(255, 255, 255, 0.38);
      }

      .source-links .search-toggle {
        min-height: 44px;
        padding: 9px 12px;
      }

      .source-links .search-toggle__dot {
        width: 8px;
        height: 8px;
        flex-basis: 8px;
        background: color-mix(in srgb, var(--accent), #2d6a4f 24%);
      }

      .source-links .search-toggle__text {
        color: var(--ink);
        font-weight: 760;
      }

      .search-toggle:focus-visible {
        outline: 2px solid var(--accent-soft);
        outline-offset: -2px;
      }

      .search-toggle__dot {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        background: var(--accent);
        border-radius: 50%;
        box-shadow: 0 0 12px color-mix(in srgb, var(--accent), transparent 46%);
      }

      .search-toggle__text {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        font-size: 11px;
        font-weight: 720;
        letter-spacing: 0.02em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-toggle__chevron {
        width: 14px;
        height: 14px;
        flex: 0 0 14px;
        transition: transform 180ms var(--ease-lift);
      }

      .search-expanded .search-toggle__chevron {
        transform: rotate(180deg);
      }

      .search-detail {
        display: none;
        padding: 0 12px 12px;
        animation: reference-rise 220ms var(--ease-lift);
      }

      .search-expanded .search-detail {
        display: grid;
        gap: 9px;
      }

      .search-query-list {
        display: grid;
        gap: 6px;
      }

      .search-query-list span {
        min-width: 0;
        padding: 6px 8px;
        overflow: hidden;
        color: color-mix(in srgb, var(--ink), var(--accent) 18%);
        background: color-mix(in srgb, var(--accent-soft), #ffffff 46%);
        border: 1px solid color-mix(in srgb, var(--accent), transparent 72%);
        border-radius: 7px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-results {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }

      .search-result {
        min-width: 0;
        padding: 9px 10px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.48));
        border: 1px solid color-mix(in srgb, var(--accent), transparent 78%);
        border-radius: 8px;
        animation: source-rise 260ms var(--ease-lift) both;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          transform 180ms var(--ease-lift);
      }

      .search-result:nth-child(2) {
        animation-delay: 55ms;
      }

      .search-result:nth-child(3) {
        animation-delay: 110ms;
      }

      .search-result:nth-child(4) {
        animation-delay: 165ms;
      }

      .search-result:nth-child(5) {
        animation-delay: 220ms;
      }

      .search-result:hover {
        background: rgba(255, 255, 255, 0.82);
        border-color: color-mix(in srgb, var(--accent), transparent 54%);
        transform: translateY(-1px);
      }

      .search-result a {
        display: block;
        overflow: hidden;
        color: var(--accent-strong);
        font-size: 12px;
        font-weight: 780;
        letter-spacing: 0.01em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .search-result small {
        display: block;
        margin-top: 3px;
        overflow: hidden;
        color: color-mix(in srgb, var(--muted), #ffffff 8%);
        font-size: 10px;
        font-weight: 620;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .source-tip {
        margin: 1px 0 8px;
        color: color-mix(in srgb, var(--muted), #ffffff 8%);
        font-size: 10px;
        font-weight: 620;
        line-height: 1.45;
      }

      #composer {
        padding:
          12px
          12px
          max(12px, env(safe-area-inset-bottom));
        display: flex;
        gap: 8px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.16)),
          color-mix(in srgb, var(--surface-raised), #ffffff 28%);
        border-top: 1px solid var(--line-soft);
        transition: background-color 220ms ease;
      }

      #composer.recording #input,
      #composer.recording #send {
        display: none;
      }

      #hold-label {
        min-width: 0;
        min-height: 48px;
        flex: 1;
        display: none;
        place-items: center;
        color: var(--accent-strong);
        background: var(--white-glass);
        border: 1px solid color-mix(in srgb, var(--accent), transparent 42%);
        border-radius: 10px;
        font-size: 15px;
        font-weight: 760;
        animation: hold-label-in 180ms var(--ease-lift);
      }

      #composer.recording #hold-label {
        display: grid;
      }

      #composer.canceling #hold-label {
        color: #ffffff;
        background: var(--danger);
        border-color: var(--danger);
      }

      #input {
        min-width: 0;
        min-height: 48px;
        flex: 1;
        padding: 0 12px;
        color: var(--ink);
        caret-color: var(--accent-soft);
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--line-soft);
        border-radius: 10px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          0 6px 18px rgba(35, 55, 43, 0.045);
        font-size: 16px;
        transition:
          border-color 180ms ease,
          background-color 180ms ease,
          box-shadow 220ms ease,
          transform 180ms var(--ease-lift);
      }

      #input::placeholder {
        color: #78837d;
        opacity: 1;
      }

      #input:focus {
        background: #ffffff;
        border-color: var(--accent);
        box-shadow:
          0 0 0 3px color-mix(in srgb, var(--accent-soft), transparent 18%),
          0 10px 24px rgba(35, 55, 43, 0.075);
        transform: translateY(-1px);
      }

      #input:disabled {
        color: var(--muted);
        background: var(--surface-soft);
        cursor: wait;
      }

      #send {
        position: relative;
        min-width: 66px;
        min-height: 48px;
        padding: 0 13px;
        flex: 0 0 auto;
        color: #ffffff;
        background: var(--accent-strong);
        border: 1px solid var(--accent-strong);
        border-radius: 10px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 760;
        overflow: hidden;
        box-shadow:
          0 10px 22px rgba(35, 55, 43, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        transition:
          background-color 180ms ease,
          box-shadow 220ms ease,
          color 160ms ease,
          transform 190ms var(--ease-lift);
      }

      #send::after {
        position: absolute;
        inset: -35% -55%;
        background: linear-gradient(100deg, transparent 35%, rgba(255, 255, 255, 0.32), transparent 65%);
        content: "";
        opacity: 0;
        transform: translateX(-38%);
        pointer-events: none;
      }

      #send:hover {
        background: var(--accent);
        box-shadow:
          0 14px 26px rgba(35, 55, 43, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
        transform: translateY(-1px);
      }

      #send:active {
        transform: scale(0.97) translateY(0);
      }

      #send:active::after {
        opacity: 1;
        animation: send-sheen 420ms var(--ease-out);
      }

      #send:disabled {
        color: #76877b;
        background: #cfd9d1;
        border-color: #cfd9d1;
        cursor: wait;
      }

      #voice {
        width: 48px;
        min-height: 48px;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        color: var(--accent-strong);
        background: rgba(255, 255, 255, 0.66);
        border: 1px solid var(--line-soft);
        border-radius: 10px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          0 6px 18px rgba(35, 55, 43, 0.045);
        cursor: pointer;
        font-size: 18px;
        touch-action: none;
        user-select: none;
        transition:
          transform 190ms var(--ease-lift),
          background-color 180ms ease,
          border-color 160ms ease,
          color 160ms ease;
      }

      #voice svg {
        width: 19px;
        height: 19px;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
      }

      #voice:hover {
        background: #ffffff;
        border-color: var(--accent);
        box-shadow: 0 10px 22px rgba(35, 55, 43, 0.08);
        transform: translateY(-1px);
      }

      #voice:active,
      #voice.recording {
        color: #ffffff;
        background: var(--accent-strong);
        border-color: var(--accent-strong);
        transform: scale(0.96);
      }

      #voice:disabled {
        color: #76877b;
        background: #cfd9d1;
        border-color: #cfd9d1;
        cursor: wait;
      }

      #voice-sheet {
        position: fixed;
        left: 50%;
        bottom: max(112px, calc(env(safe-area-inset-bottom) + 112px));
        z-index: 2147483647;
        width: min(270px, calc(100vw - 48px));
        padding: 18px 16px;
        display: none;
        color: #ffffff;
        text-align: center;
        background: rgba(35, 55, 43, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        box-shadow: 0 22px 52px rgba(35, 55, 43, 0.24);
        backdrop-filter: blur(18px) saturate(120%);
        transform: translateX(-50%);
        pointer-events: none;
      }

      #voice-sheet.show {
        display: block;
        animation: voice-sheet-in 260ms var(--ease-lift);
      }

      #voice-sheet.canceling {
        background: rgba(166, 82, 66, 0.95);
      }

      #voice-wave {
        height: 34px;
        margin-bottom: 12px;
        display: flex;
        align-items: end;
        justify-content: center;
        gap: 5px;
      }

      #voice-wave span {
        width: 5px;
        height: 12px;
        background: #dff3ef;
        border-radius: 999px;
        animation: voice-wave 880ms var(--ease-in-out) infinite;
      }

      #voice-wave span:nth-child(2) { animation-delay: 100ms; }
      #voice-wave span:nth-child(3) { animation-delay: 200ms; }
      #voice-wave span:nth-child(4) { animation-delay: 300ms; }

      #voice-copy {
        font-size: 15px;
        font-weight: 780;
      }

      #voice-hint {
        margin-top: 6px;
        color: rgba(255, 255, 255, 0.78);
        font-size: 12px;
      }

      @keyframes voice-wave {
        0%, 100% { height: 10px; }
        50% { height: 30px; }
      }

      @keyframes voice-sheet-in {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }

      @keyframes panel-enter {
        from {
          opacity: 0;
          filter: blur(4px);
          transform: translateY(12px) scale(0.985);
        }
        to {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0) scale(1);
        }
      }

      @keyframes panel-status-sheen {
        0% {
          opacity: 0.18;
          transform: translateX(-32%);
        }
        50% {
          opacity: 0.58;
        }
        100% {
          opacity: 0.18;
          transform: translateX(32%);
        }
      }

      @keyframes panel-layer-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes panel-composer-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bubble-in {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.986);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes user-bubble-send {
        0% {
          opacity: 0;
          transform: translate3d(18px, 10px, 0) scale(0.96);
        }
        62% {
          opacity: 1;
          transform: translate3d(-2px, -1px, 0) scale(1.01);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
      }

      @keyframes bot-bubble-reply {
        0% {
          opacity: 0;
          transform: translate3d(-14px, 11px, 0) scale(0.968);
          filter: blur(3px);
        }
        66% {
          opacity: 1;
          transform: translate3d(1px, -1px, 0) scale(1.006);
          filter: blur(0);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes send-sheen {
        from {
          transform: translateX(-42%);
        }
        to {
          transform: translateX(42%);
        }
      }

      @keyframes tool-retire {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
          max-height: 120px;
          margin-top: 9px;
          margin-bottom: 9px;
        }
        to {
          opacity: 0;
          transform: translateY(-6px) scale(0.985);
          max-height: 0;
          margin-top: 0;
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      @keyframes reference-rise {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes source-rise {
        from {
          opacity: 0;
          transform: translateY(7px) scale(0.99);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes hold-label-in {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.99);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes soft-shimmer {
        from { background-position: 140% 0; }
        to { background-position: -80% 0; }
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
        from { opacity: 0; filter: blur(4px); transform: translateY(10px) scale(0.986); }
        to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
      }

      @keyframes tina-future-panel-enter {
        from { opacity: 0; filter: blur(6px); transform: translateY(8px) scale(0.982); }
        to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
      }

      @keyframes tina-open {
        0% {
          transform: translateY(1px) scale(0.97);
        }
        64% {
          transform: translateY(-4px) scale(1.018);
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

      @keyframes tina-listen-ring {
        0%,
        100% {
          opacity: 0.68;
          transform: scale(0.985);
        }
        50% {
          opacity: 1;
          transform: scale(1.025);
        }
      }

      @keyframes tina-answer {
        0%,
        100% {
          border-radius: 58% 42% 49% 51% / 62% 46% 54% 38%;
          transform: translateY(0) scale(1);
        }
        50% {
          border-radius: 49% 51% 57% 43% / 55% 60% 40% 45%;
          transform: translateY(-2px) scale(1.006);
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
          opacity: 0.5;
          transform: scale(0.84);
        }
        50% {
          opacity: 1;
          transform: scale(1.12);
        }
      }

      @keyframes status-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes answer-dot {
        0%,
        80%,
        100% {
          opacity: 0.34;
          transform: translateY(0);
        }

        40% {
          opacity: 0.9;
          transform: translateY(-3px);
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
          background: var(--accent-strong);
          box-shadow: none;
          transform: none;
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
        #panel::before,
        #fab #portrait,
        #fab #portrait::after,
        #fab img,
        #presence,
        .bubble,
        .bubble.loading,
        .answer-loading-dots i,
        .search-spinner,
        #voice-sheet.show,
        #voice-wave span,
        .bubble.tool.retiring,
        #panel.open #header,
        #panel.open #status,
        #panel.open #messages,
        #panel.open #composer,
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
        <div id="hold-label">按住说话</div>
        <button id="voice" type="button" title="按住说话" aria-label="按住说话">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        </button>
        <button id="send" type="submit">发送</button>
      </form>
      <div id="voice-sheet" aria-hidden="true">
        <div id="voice-wave"><span></span><span></span><span></span><span></span></div>
        <div id="voice-copy">正在录音</div>
        <div id="voice-hint">上移取消，松手发送</div>
      </div>
      <span id="state-announcer" class="sr-only" aria-live="polite"></span>
    </section>
  `;

  var fab = shadow.getElementById("fab");
  var panel = shadow.getElementById("panel");
  var messages = shadow.getElementById("messages");
  var input = shadow.getElementById("input");
  var holdLabel = shadow.getElementById("hold-label");
  var voice = shadow.getElementById("voice");
  var voiceSheet = shadow.getElementById("voice-sheet");
  var voiceCopy = shadow.getElementById("voice-copy");
  var voiceHint = shadow.getElementById("voice-hint");
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
  var mediaRecorder = null;
  var mediaStream = null;
  var audioChunks = [];
  var voicePointerId = null;
  var voiceStartY = 0;
  var voicePressing = false;
  var voiceCanceled = false;
  var voiceBusy = false;
  var referenceSources = {};
  var referenceBubble = null;
  var activeReferenceId = "";
  var userPinnedToBottom = true;

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
      [
        "notice",
        "opening",
        "thinking",
        "searching",
        "answering",
        "success",
        "error",
      ].indexOf(
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
      !voiceBusy &&
      ["thinking", "searching", "answering", "success", "error"].indexOf(assistantState) < 0
    ) {
      setAssistantState("listening", "可以继续提问");
    }
  });

  input.addEventListener("input", function () {
    if (!send.disabled && !voiceBusy) setAssistantState("listening", "可以继续提问");
  });

  function isNearMessageBottom() {
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 72;
  }

  function scrollMessagesToBottom(force) {
    if (force) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  messages.addEventListener("scroll", function () {
    userPinnedToBottom = isNearMessageBottom();
  });

  function addBubble(text, who) {
    var bubble = document.createElement("div");
    var shouldFollow = userPinnedToBottom || who === "user";
    bubble.className = "bubble " + who;
    bubble.dataset.rawText = text || "";
    renderBubble(bubble);
    messages.appendChild(bubble);
    scrollMessagesToBottom(shouldFollow);
    userPinnedToBottom = isNearMessageBottom();
    return bubble;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_match, label, url) {
        return (
          '<a href="' +
          url +
          '" target="_blank" rel="noopener noreferrer">' +
          label +
          "</a>"
        );
      })
      .replace(/【([KW]\d+)】|\[([KW]\d+)\]/g, function (_match, cnId, bracketId) {
        var sourceId = cnId || bracketId;
        if (!referenceSources[sourceId]) return "【" + sourceId + "】";
        var sourceType = referenceSources[sourceId].type || "";
        return (
          '<button class="citation" type="button" data-source-id="' +
          sourceId +
          '" data-source-type="' +
          escapeHtml(sourceType) +
          '" title="查看参考来源" aria-label="查看参考来源 ' +
          sourceId +
          '">' +
          sourceId +
          "</button>"
        );
      });
  }

  function renderMarkdown(value) {
    var lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    var html = "";
    var paragraph = [];
    var listType = "";
    var inCode = false;
    var codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      html += "<p>" + renderInlineMarkdown(paragraph.join(" ")) + "</p>";
      paragraph = [];
    }

    function closeList() {
      if (!listType) return;
      html += "</" + listType + ">";
      listType = "";
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed.indexOf("```") === 0) {
        if (inCode) {
          html += "<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>";
          codeLines = [];
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          inCode = true;
        }
        return;
      }
      if (inCode) {
        codeLines.push(line);
        return;
      }
      if (!trimmed) {
        flushParagraph();
        closeList();
        return;
      }

      var heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (heading) {
        flushParagraph();
        closeList();
        var level = heading[1].length;
        html += "<h" + level + ">" + renderInlineMarkdown(heading[2]) + "</h" + level + ">";
        return;
      }

      var unordered = /^[-*]\s+(.+)$/.exec(trimmed);
      var ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
      if (unordered || ordered) {
        flushParagraph();
        var nextListType = unordered ? "ul" : "ol";
        if (listType && listType !== nextListType) closeList();
        if (!listType) {
          listType = nextListType;
          html += "<" + listType + ">";
        }
        html += "<li>" + renderInlineMarkdown((unordered || ordered)[1]) + "</li>";
        return;
      }

      paragraph.push(trimmed);
    });

    if (inCode) html += "<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>";
    flushParagraph();
    closeList();
    return html || "<p></p>";
  }

  function renderBubble(bubble) {
    var rawText = bubble.dataset.rawText || "";
    if (bubble.classList.contains("bot")) {
      if (bubble.dataset.loading === "true" && !rawText) {
        bubble.innerHTML =
          '<div class="answer-loading"><span>' +
          escapeHtml(bubble.dataset.loadingText || "正在读取资料") +
          '</span><span class="answer-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
      } else {
        bubble.innerHTML = renderMarkdown(rawText);
      }
    } else {
      bubble.textContent = rawText;
    }
  }

  function setBubbleLoading(bubble, loadingText) {
    if (!bubble) return;
    var shouldFollow = isNearMessageBottom();
    bubble.classList.remove("quiet-loading");
    bubble.dataset.loading = "true";
    bubble.dataset.loadingText = loadingText || "正在读取资料";
    renderBubble(bubble);
    scrollMessagesToBottom(shouldFollow);
  }

  function clearBubbleLoading(bubble) {
    if (!bubble) return;
    delete bubble.dataset.loading;
    delete bubble.dataset.loadingText;
    bubble.classList.remove("loading");
    bubble.classList.remove("quiet-loading");
  }

  function addPendingBubble(loadingText) {
    var bubble = addBubble("", "bot");
    bubble.classList.add("loading");
    setBubbleLoading(bubble, loadingText || "正在读取页面资料");
    return bubble;
  }

  function hostnameForUrl(url) {
    try {
      return new URL(url).hostname;
    } catch (_error) {
      return "";
    }
  }

  function renderSearchThinking(query, label) {
    var queries = query ? String(query).split("\n").filter(Boolean) : [];
    var meta = queries.length
      ? "正在搜索：" + queries[queries.length - 1]
      : "正在判断可用资料";
    return (
      '<div class="thinking-card">' +
      '<div class="thinking-card__line"><span class="search-spinner" aria-hidden="true"></span>' +
      '<strong class="thinking-card__label">' +
      escapeHtml(label || "正在检索网页资料") +
      "</strong></div>" +
      '<div class="thinking-card__meta">' +
      escapeHtml(meta) +
      "</div></div>"
    );
  }

  function uniqueSearchQueries(bubble, query) {
    var existing = (bubble.dataset.searchQueries || "")
      .split("\n")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
    var next = String(query || "").trim();
    if (next && existing.indexOf(next) < 0) existing.push(next);
    bubble.dataset.searchQueries = existing.join("\n");
    return existing;
  }

  function renderSearchSummary(bubble, expanded) {
    if (!bubble) return;
    var queries = (bubble.dataset.searchQueries || "")
      .split("\n")
      .filter(Boolean);
    var results = [];
    try {
      results = JSON.parse(bubble.dataset.searchResults || "[]");
    } catch (_error) {
      results = [];
    }
    var failed = bubble.dataset.searchFailed === "true";
    var count = Number(bubble.dataset.searchCount || results.length || 0);
    var summary = failed
      ? "网页搜索暂不可用"
      : count > 0
        ? "网页检索已收起 · " + count + " 条来源"
        : "网页检索已收起 · 未找到来源";
    var queryHtml = queries.length
      ? '<div class="search-query-list">' +
        queries
          .map(function (item) {
            return "<span>搜索：" + escapeHtml(item) + "</span>";
          })
          .join("") +
        "</div>"
      : "";
    var resultHtml = results.length
      ? '<div class="search-results">' +
        results
          .slice(0, 5)
          .map(function (item) {
            var title = escapeHtml(item.title || hostnameForUrl(item.url) || "网页来源");
            var url = escapeHtml(item.url || "#");
            var host = escapeHtml(hostnameForUrl(item.url || ""));
            return (
              '<div class="search-result"><a href="' +
              url +
              '" target="_blank" rel="noopener noreferrer">' +
              title +
              "</a>" +
              (host ? "<small>" + host + "</small>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : "";
    bubble.className =
      "bubble bot tool search-collapsed" + (expanded ? " search-expanded" : "");
    bubble.innerHTML =
      '<button class="search-toggle" type="button" aria-expanded="' +
      (expanded ? "true" : "false") +
      '">' +
      '<span class="search-toggle__dot" aria-hidden="true"></span>' +
      '<span class="search-toggle__text">' +
      escapeHtml(summary) +
      "</span>" +
      '<svg class="search-toggle__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
      "</svg></button>" +
      '<div class="search-detail">' +
      queryHtml +
      resultHtml +
      "</div>";
  }

  function addSearchBubble(query, anchorBubble, currentBubble) {
    var bubble = currentBubble || document.createElement("div");
    var shouldFollow = isNearMessageBottom();
    var queries = uniqueSearchQueries(bubble, query || "当前问题");
    bubble.className = "bubble bot tool transient";
    bubble.innerHTML =
      renderSearchThinking(queries.join("\n"), "正在检索网页资料");
    if (query) bubble.setAttribute("aria-label", "正在搜索网页资料：" + query);
    if (!bubble.isConnected) {
      if (anchorBubble && anchorBubble.parentNode === messages) {
        messages.insertBefore(bubble, anchorBubble);
      } else {
        messages.appendChild(bubble);
      }
    }
    scrollMessagesToBottom(shouldFollow);
    userPinnedToBottom = isNearMessageBottom();
    return bubble;
  }

  function retireToolBubble(bubble) {
    if (!bubble || !bubble.isConnected) return;
    renderSearchSummary(bubble, false);
  }

  function updateSearchBubble(bubble, results, failed) {
    if (!bubble) return;
    var items = Array.isArray(results) ? results.slice(0, 5) : [];
    bubble.dataset.searchResults = JSON.stringify(items);
    bubble.dataset.searchFailed = failed ? "true" : "false";
    bubble.dataset.searchCount = String(items.length);
    if (failed) {
      scrollMessagesToBottom(isNearMessageBottom());
      retireToolBubble(bubble);
      return;
    }
    scrollMessagesToBottom(isNearMessageBottom());
    retireToolBubble(bubble);
  }

  function sourcesWithUrls(sources) {
    if (!Array.isArray(sources)) return [];
    return sources
      .filter(function (source) {
        return source && source.url && /^https?:\/\//i.test(source.url);
      })
      .slice(0, 5);
  }

  function renderSourceLinksBubble(bubble, sources, expanded) {
    if (!bubble) return;
    var items = sourcesWithUrls(sources);
    bubble.dataset.linkSources = JSON.stringify(items);
    var count = items.length;
    var summary = count
      ? "知识库参考 · " + count + " 个可打开网页"
      : "知识库参考 · 暂无网页链接";
    var resultHtml = items.length
      ? '<p class="source-tip">资料里包含网页入口，可以先看回答，也可以点开原文核对。</p>' +
        '<div class="search-results">' +
        items
          .map(function (item) {
            var title = escapeHtml(item.title || hostnameForUrl(item.url) || "参考网页");
            var url = escapeHtml(item.url || "#");
            var host = escapeHtml(hostnameForUrl(item.url || ""));
            return (
              '<div class="search-result"><a href="' +
              url +
              '" target="_blank" rel="noopener noreferrer">' +
              title +
              "</a>" +
              (host ? "<small>" + host + "</small>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : "";
    bubble.className =
      "bubble bot tool source-links search-collapsed" +
      (expanded ? " search-expanded" : "");
    bubble.innerHTML =
      '<button class="search-toggle source-toggle" type="button" aria-expanded="' +
      (expanded ? "true" : "false") +
      '">' +
      '<span class="search-toggle__dot" aria-hidden="true"></span>' +
      '<span class="search-toggle__text">' +
      escapeHtml(summary) +
      "</span>" +
      '<svg class="search-toggle__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
      "</svg></button>" +
      '<div class="search-detail">' +
      resultHtml +
      "</div>";
  }

  function addKnowledgeThinkingBubble(anchorBubble, currentBubble) {
    var bubble = currentBubble || document.createElement("div");
    var shouldFollow = isNearMessageBottom();
    bubble.className = "bubble bot tool transient";
    bubble.innerHTML = renderSearchThinking("正在匹配本地 QA 与网页入口", "正在读取知识库");
    bubble.setAttribute("aria-label", "正在读取知识库");
    if (!bubble.isConnected) {
      if (anchorBubble && anchorBubble.parentNode === messages) {
        messages.insertBefore(bubble, anchorBubble);
      } else {
        messages.appendChild(bubble);
      }
    }
    scrollMessagesToBottom(shouldFollow);
    userPinnedToBottom = isNearMessageBottom();
    return bubble;
  }

  function updateKnowledgeBubble(bubble, sources) {
    if (!bubble) return;
    renderSourceLinksBubble(bubble, sources || [], false);
    scrollMessagesToBottom(isNearMessageBottom());
  }

  function rememberSources(sources) {
    if (!Array.isArray(sources)) return;
    sources.forEach(function (source) {
      if (source && source.id) referenceSources[source.id] = source;
    });
  }

  function showReference(sourceId) {
    var source = referenceSources[sourceId];
    if (!source) return;
    if (referenceBubble && activeReferenceId === sourceId) {
      referenceBubble.remove();
      referenceBubble = null;
      activeReferenceId = "";
      return;
    }
    if (!referenceBubble) {
      referenceBubble = document.createElement("div");
      referenceBubble.className = "bubble bot tool";
      messages.appendChild(referenceBubble);
    }
    activeReferenceId = sourceId;
    var title = escapeHtml(source.title || sourceId);
    var snippet = escapeHtml(source.snippet || "暂无可展示的来源摘要。");
    var url = source.url || "";
    referenceBubble.innerHTML =
      '<div class="reference-card"><strong>参考来源 ' +
      escapeHtml(sourceId) +
      "：" +
      title +
      "</strong><p>" +
      snippet +
      "</p>" +
      (url
        ? '<a href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener noreferrer">打开原文</a>'
        : "") +
      "</div>";
    scrollMessagesToBottom(true);
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

  function appendToBubble(bubble, text) {
    var shouldFollow = isNearMessageBottom();
    clearBubbleLoading(bubble);
    bubble.dataset.rawText = (bubble.dataset.rawText || "") + text;
    renderBubble(bubble);
    scrollMessagesToBottom(shouldFollow);
  }

  function parseSseBlock(block) {
    var eventName = "message";
    var dataLines = [];
    block.split("\n").forEach(function (line) {
      if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
      if (line.indexOf("data:") === 0) dataLines.push(line.slice(5).trim());
    });
    return { eventName: eventName, data: dataLines.join("\n") };
  }

  async function readAnswerStream(response, state) {
    if (!response.body) throw new Error("当前浏览器不支持流式读取回答");

    var reader = response.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      var blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";
      blocks.forEach(function (block) {
        var parsed = parseSseBlock(block);
        if (!parsed.data) return;
        var payload = JSON.parse(parsed.data);
        if (parsed.eventName === "transcript") {
          addBubble(payload.transcript || "语音问题", "user");
          state.answerBubble = addPendingBubble("正在判断资料来源");
        } else if (parsed.eventName === "routing") {
          setAssistantState("thinking", "正在选择资料来源");
          if (state.answerBubble && !(state.answerBubble.dataset.rawText || "")) {
            var routeText =
              payload.route === "knowledge"
                ? "将读取知识库资料"
                : payload.route === "web"
                  ? "将检索网页资料"
                  : payload.route === "both"
                    ? "将读取知识库并检索网页"
                    : "正在组织页面资料";
            setBubbleLoading(state.answerBubble, routeText);
          }
        } else if (parsed.eventName === "knowledge_reading") {
          setAssistantState("thinking", "正在读取知识库");
          if (state.answerBubble && !(state.answerBubble.dataset.rawText || "")) {
            state.answerBubble.classList.add("quiet-loading");
          }
          state.knowledgeBubble = addKnowledgeThinkingBubble(
            state.answerBubble,
            state.knowledgeBubble,
          );
        } else if (parsed.eventName === "knowledge_done") {
          var knowledgeSources = payload.sources || [];
          rememberSources(knowledgeSources);
          updateKnowledgeBubble(state.knowledgeBubble, knowledgeSources);
          state.knowledgeBubble = null;
          setAssistantState("answering", "已读取知识库，正在组织回答");
          if (state.answerBubble) {
            state.answerBubble.classList.remove("quiet-loading");
            setBubbleLoading(state.answerBubble, "正在整理知识库资料");
          }
        } else if (parsed.eventName === "searching") {
          setAssistantState("searching", "正在搜索网页资料");
          if (state.answerBubble && !(state.answerBubble.dataset.rawText || "")) {
            state.answerBubble.classList.add("quiet-loading");
          } else if (state.answerBubble) {
            setBubbleLoading(state.answerBubble, "正在等待网页检索结果");
          }
          state.searchBubble = addSearchBubble(
            payload.query || "",
            state.answerBubble,
            state.searchBubble,
          );
        } else if (parsed.eventName === "search_done") {
          var count = Number(payload.count || 0);
          updateSearchBubble(state.searchBubble, payload.results || [], Boolean(payload.error));
          state.searchBubble = null;
          setAssistantState(
            "answering",
            payload.error
              ? "网页搜索暂时不可用，正在组织回答"
              : count > 0
                ? "已找到网页资料，正在组织回答"
                : "没有找到匹配来源，正在组织回答",
          );
          if (state.answerBubble) {
            state.answerBubble.classList.remove("quiet-loading");
            setBubbleLoading(state.answerBubble, "正在整理检索结果");
          }
        } else if (parsed.eventName === "sources") {
          rememberSources(payload.sources || []);
          var hasKnowledgeSource = (payload.sources || []).some(function (source) {
            return source && source.type === "knowledge";
          });
          var hasWebSource = (payload.sources || []).some(function (source) {
            return source && source.type === "web";
          });
          if (state.answerBubble && hasKnowledgeSource) {
            setBubbleLoading(state.answerBubble, "已读取知识库，正在组织回答");
          } else if (state.answerBubble && hasWebSource) {
            setBubbleLoading(state.answerBubble, "已读取网页资料，正在组织回答");
          }
          if (state.answerBubble) renderBubble(state.answerBubble);
        } else if (parsed.eventName === "delta") {
          if (!state.answerBubble) state.answerBubble = addPendingBubble("正在组织回答");
          state.answerBubble.classList.remove("quiet-loading");
          appendToBubble(state.answerBubble, payload.content || "");
        } else if (parsed.eventName === "error") {
          throw new Error(payload.detail || "问答服务返回错误");
        }
      });
    }
  }

  async function sendTextFallback(text, bubble) {
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
    var data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(data.detail || "服务返回错误（" + response.status + "）");
    }

    var answer = data.answer || data.reply || "这次没有收到回答，请稍后重试。";
    if (!bubble) bubble = addPendingBubble("正在组织回答");
    for (var index = 0; index < answer.length; index += 1) {
      appendToBubble(bubble, answer[index]);
      if (!reducedMotion) {
        await new Promise(function (resolve) {
          window.setTimeout(resolve, 14);
        });
      }
    }
  }

  function getRecordingMimeType() {
    var candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (var index = 0; index < candidates.length; index += 1) {
      if (MediaRecorder.isTypeSupported(candidates[index])) return candidates[index];
    }
    return "";
  }

  function extensionForMimeType(mimeType) {
    if (mimeType.indexOf("mp4") >= 0) return "m4a";
    if (mimeType.indexOf("wav") >= 0) return "wav";
    return "webm";
  }

  function stopMediaStream() {
    if (!mediaStream) return;
    mediaStream.getTracks().forEach(function (track) {
      track.stop();
    });
    mediaStream = null;
  }

  function setVoiceUi(active, canceling) {
    composer.classList.toggle("recording", active);
    composer.classList.toggle("canceling", Boolean(canceling));
    voice.classList.toggle("recording", active);
    voiceSheet.classList.toggle("show", active);
    voiceSheet.classList.toggle("canceling", Boolean(canceling));
    if (holdLabel) holdLabel.textContent = canceling ? "松手取消" : "按住说话";
    voiceCopy.textContent = canceling ? "松手取消" : "正在录音";
    voiceHint.textContent = canceling ? "松开手指，取消发送" : "上移取消，松手发送";
  }

  async function sendVoice(blob, mimeType) {
    var extension = extensionForMimeType(mimeType || blob.type || "audio/webm");
    var formData = new FormData();
    formData.append("medicine_id", medicineId);
    formData.append("session_id", sessionId);
    formData.append("audio", blob, "voice." + extension);

    var response = await fetch(VOICE_API, { method: "POST", body: formData });
    if (!response.ok) {
      var data = await response.json().catch(function () {
        return {};
      });
      throw new Error(data.detail || "服务返回错误（" + response.status + "）");
    }
    await readAnswerStream(response, { answerBubble: null });
  }

  async function startVoiceRecording() {
    if (!window.isSecureContext) {
      throw new Error("手机录音需要 HTTPS 页面；请用 HTTPS 域名访问。");
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      throw new Error("当前浏览器不支持录音上传。");
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    var mimeType = getRecordingMimeType();
    mediaRecorder = new MediaRecorder(
      mediaStream,
      mimeType ? { mimeType: mimeType } : undefined,
    );
    mediaRecorder.addEventListener("dataavailable", function (event) {
      if (event.data && event.data.size > 0) audioChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", function () {
      var shouldCancel = voiceCanceled;
      var type = mimeType || mediaRecorder.mimeType || "audio/webm";
      var chunks = audioChunks.slice();
      audioChunks = [];
      stopMediaStream();
      setVoiceUi(false, false);
      if (shouldCancel || !chunks.length) {
        voiceBusy = false;
        setAssistantState("notice", shouldCancel ? "已取消语音发送" : "未收到有效语音", 1200);
        return;
      }

      send.disabled = true;
      voice.disabled = true;
      input.disabled = true;
      panel.setAttribute("aria-busy", "true");
      setAssistantState("thinking", "正在识别语音并读取资料");
      void sendVoice(new Blob(chunks, { type: type }), type)
        .then(function () {
          setAssistantState("success", "回答已送达", 1500);
        })
        .catch(function (error) {
          var errorCopy = friendlyError(error, 0);
          addBubble(errorCopy, "bot");
          setAssistantState("error", errorCopy, 2800);
        })
        .finally(function () {
          voiceBusy = false;
          send.disabled = false;
          voice.disabled = false;
          input.disabled = false;
          panel.removeAttribute("aria-busy");
          if (panel.classList.contains("open")) input.focus();
        });
    });
    mediaRecorder.start(1000);
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || send.disabled) return;

    input.value = "";
    addBubble(text, "user");
    var answerBubble = addPendingBubble("正在判断资料来源");
    send.disabled = true;
    input.disabled = true;
    panel.setAttribute("aria-busy", "true");
    setAssistantState(
      "thinking",
      "TINA 正在理解 " + medicineName + " 的资料",
    );

    var responseStatus = 0;
    try {
      var response = await fetch(STREAM_API, {
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
      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          setAssistantState("answering", "正在组织回答");
          setBubbleLoading(answerBubble, "正在组织回答");
          await answeringPause();
          await sendTextFallback(text, answerBubble);
          setAssistantState("success", "回答已送达", 1500);
          return;
        }
        var data = await response.json().catch(function () {
          return {};
        });
        throw new Error(data.detail || "服务返回错误（" + response.status + "）");
      }

      setAssistantState("answering", "正在组织回答");
      await answeringPause();
      await readAnswerStream(response, { answerBubble: answerBubble });
      setAssistantState("success", "回答已送达", 1500);
    } catch (error) {
      var errorCopy = friendlyError(error, responseStatus);
      if (answerBubble && !(answerBubble.dataset.rawText || "")) {
        clearBubbleLoading(answerBubble);
        answerBubble.dataset.rawText = errorCopy;
        renderBubble(answerBubble);
      } else {
        addBubble(errorCopy, "bot");
      }
      setAssistantState("error", errorCopy, 2800);
    } finally {
      send.disabled = false;
      input.disabled = false;
      panel.removeAttribute("aria-busy");
      if (panel.classList.contains("open")) input.focus();
    }
  }

  voice.addEventListener("pointerdown", function (event) {
    if (send.disabled || voice.disabled) return;
    event.preventDefault();
    voicePointerId = event.pointerId;
    voiceStartY = event.clientY;
    voicePressing = true;
    voiceCanceled = false;
    voiceBusy = true;
    voice.setPointerCapture(event.pointerId);
    setVoiceUi(true, false);
    setAssistantState("listening", "正在录音，上移可取消");
    void startVoiceRecording().catch(function (error) {
      voicePressing = false;
      voicePointerId = null;
      voiceCanceled = false;
      voiceBusy = false;
      stopMediaStream();
      setVoiceUi(false, false);
      var errorCopy = friendlyError(error, 0);
      addBubble(errorCopy, "bot");
      setAssistantState("error", errorCopy, 2800);
    });
  });

  voice.addEventListener("pointermove", function (event) {
    if (!voicePressing || voicePointerId !== event.pointerId) return;
    voiceCanceled = voiceStartY - event.clientY > 56;
    setVoiceUi(true, voiceCanceled);
  });

  function finishVoicePress(event, cancel) {
    if (!voicePressing || voicePointerId !== event.pointerId) return;
    voicePressing = false;
    voiceCanceled = cancel || voiceCanceled;
    if (voice.hasPointerCapture(event.pointerId)) {
      voice.releasePointerCapture(event.pointerId);
    }
    voicePointerId = null;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      setAssistantState("thinking", cancel || voiceCanceled ? "正在取消录音" : "正在结束录音");
      mediaRecorder.stop();
    } else {
      voiceBusy = false;
      stopMediaStream();
      setVoiceUi(false, false);
      setAssistantState("notice", cancel || voiceCanceled ? "已取消语音发送" : "录音已结束", 1200);
    }
  }

  voice.addEventListener("pointerup", function (event) {
    finishVoicePress(event, false);
  });

  voice.addEventListener("pointercancel", function (event) {
    finishVoicePress(event, true);
  });

  messages.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var searchToggle = target.closest(".search-toggle");
    if (searchToggle && messages.contains(searchToggle)) {
      event.preventDefault();
      var searchBubble = searchToggle.closest(".bubble.tool.search-collapsed");
      if (!searchBubble) return;
      var expanded = !searchBubble.classList.contains("search-expanded");
      if (searchBubble.classList.contains("source-links")) {
        var linkSources = [];
        try {
          linkSources = JSON.parse(searchBubble.dataset.linkSources || "[]");
        } catch (_error) {
          linkSources = [];
        }
        renderSourceLinksBubble(searchBubble, linkSources, expanded);
      } else {
        renderSearchSummary(searchBubble, expanded);
      }
      return;
    }
    var citation = target.closest(".citation");
    if (!citation || !messages.contains(citation)) return;
    event.preventDefault();
    showReference(citation.dataset.sourceId || "");
  });

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    void sendMessage();
  });

  var removalObserver = new MutationObserver(function () {
    if (host.isConnected) return;
    clearStateTimers();
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    stopMediaStream();
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
