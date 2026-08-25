/*
 * Water Drop Assistant - embeddable product Q&A widget.
 *
 * Optional host config before loading this script:
 * window.WATER_DROP_ASSISTANT_CONFIG = {
 *   apiBase: "/TINAapimed",
 *   iconUrl: "/widget/water-drop-icon.png",
 *   title: "商品 AI 助手",
 *   context: product
 * };
 */
(function () {
  "use strict";

  if (document.getElementById("water-drop-root")) return;

  var scriptEl = document.currentScript;
  var config = window.WATER_DROP_ASSISTANT_CONFIG || {};
  var apiBase = (scriptEl && scriptEl.dataset.apiBase) || config.apiBase || "http://localhost:8000";
  var apiPath = (scriptEl && scriptEl.dataset.apiPath) || config.apiPath || "/chat";
  var API = apiBase.replace(/\/$/, "") + apiPath;
  var medicineId = (scriptEl && scriptEl.dataset.medicineId) || config.medicineId || "";
  var iconUrl =
    (scriptEl && scriptEl.dataset.iconUrl) ||
    config.iconUrl ||
    (scriptEl ? new URL("water-drop-icon.png", scriptEl.src).toString() : "water-drop-icon.png");
  var title = config.title || "商品 AI 助手";

  function collectContext() {
    var source = config.context || window.__ASSISTANT_CONTEXT__;
    if (source) {
      try {
        return typeof source === "string" ? source : JSON.stringify(source, null, 2);
      } catch (e) {
        return "";
      }
    }

    var metas = {};
    document.querySelectorAll('meta[name^="product-"]').forEach(function (m) {
      metas[m.name.replace("product-", "")] = m.content;
    });
    if (Object.keys(metas).length) return JSON.stringify(metas, null, 2);

    var params = new URLSearchParams(location.search);
    var ctx = {};
    params.forEach(function (v, k) {
      if (k !== "__assistant") ctx[k] = v;
    });
    if (Object.keys(ctx).length) return JSON.stringify(ctx, null, 2);

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
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      #fab {
        position: fixed;
        right: max(24px, env(safe-area-inset-right));
        bottom: max(24px, env(safe-area-inset-bottom));
        width: 72px;
        height: 72px;
        border: none;
        border-radius: 0;
        padding: 0;
        background: transparent;
        cursor: pointer;
        box-shadow: none;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
        z-index: 2147483647;
        touch-action: none;
        user-select: none;
        transition: transform .18s ease, filter .18s ease;
      }

      #fab:hover {
        transform: translateY(-2px);
        filter: drop-shadow(0 16px 24px rgba(70, 91, 60, .28));
      }

      #fab:active {
        transform: translateY(0) scale(.98);
      }

      #fab:focus-visible,
      #close:focus-visible,
      #send:focus-visible {
        outline: 3px solid rgba(111, 147, 95, .4);
        outline-offset: 2px;
      }

      #fab img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        pointer-events: none;
        filter: drop-shadow(0 14px 22px rgba(70, 91, 60, .24));
      }

      #panel {
        position: fixed;
        right: 24px;
        bottom: 112px;
        width: min(360px, calc(100vw - 32px));
        height: min(520px, calc(100dvh - 144px));
        background: #fbfcf4;
        border: 1px solid rgba(184, 199, 154, .7);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(47, 55, 42, .24);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483647;
        color: #263021;
      }

      #panel.open {
        display: flex;
      }

      #hdr {
        min-height: 58px;
        padding: 13px 16px;
        background: linear-gradient(135deg, #f7f5df 0%, #dcebc9 46%, #a9c29d 100%);
        border-bottom: 1px solid rgba(157, 176, 127, .45);
        color: #26351f;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 15px;
        font-weight: 700;
      }

      #hdr img {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, .8);
        box-shadow: 0 4px 12px rgba(86, 103, 62, .18);
      }

      #hdr-identity {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #hdr-identity span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #close {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        padding: 0;
        color: #405238;
        background: rgba(255, 255, 255, .42);
        border: 1px solid rgba(132, 156, 108, .34);
        border-radius: 12px;
        cursor: pointer;
        font: 24px/1 Arial, sans-serif;
      }

      #close:hover {
        background: rgba(255, 255, 255, .72);
      }

      #msgs {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        font-size: 13px;
        line-height: 1.6;
        background:
          radial-gradient(circle at 18% 0%, rgba(255, 255, 238, .95), transparent 32%),
          linear-gradient(180deg, #fbfcf4 0%, #f0f7e7 100%);
      }

      .bubble {
        margin: 8px 0;
        padding: 9px 11px;
        border-radius: 14px;
        max-width: 86%;
        white-space: pre-wrap;
        word-break: break-word;
        box-shadow: 0 5px 16px rgba(69, 82, 58, .08);
      }

      .user {
        margin-left: auto;
        background: #dff3ef;
        border: 1px solid rgba(137, 194, 185, .55);
        color: #173d38;
        border-bottom-right-radius: 5px;
      }

      .bot {
        background: rgba(255, 255, 248, .96);
        border: 1px solid rgba(210, 219, 190, .8);
        color: #2e3729;
        border-bottom-left-radius: 5px;
      }

      #bar {
        display: flex;
        gap: 8px;
        padding: 10px;
        border-top: 1px solid rgba(188, 201, 163, .65);
        background: rgba(250, 252, 241, .96);
      }

      #inp {
        flex: 1;
        min-width: 0;
        height: 40px;
        border: 1px solid #cddcb8;
        border-radius: 12px;
        padding: 0 12px;
        background: #fffef8;
        color: #263021;
        font-size: 13px;
        outline: none;
      }

      #inp:focus {
        border-color: #8fb37d;
        box-shadow: 0 0 0 3px rgba(160, 190, 139, .24);
      }

      #send {
        width: 68px;
        height: 40px;
        border: none;
        border-radius: 12px;
        background: #6f935f;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        flex: 0 0 auto;
      }

      #send:hover {
        background: #5f824f;
      }

      #send:disabled {
        cursor: wait;
        opacity: .65;
      }

      @media (max-width: 520px) {
        #fab {
          right: max(16px, env(safe-area-inset-right));
          bottom: max(16px, env(safe-area-inset-bottom));
          width: 64px;
          height: 64px;
        }

        #panel {
          right: max(12px, env(safe-area-inset-right));
          bottom: max(92px, calc(env(safe-area-inset-bottom) + 80px));
          height: min(510px, calc(100dvh - 120px));
          border-radius: 20px;
        }

        #inp {
          font-size: 16px;
        }
      }
    </style>

    <button id="fab" title="${title}" aria-label="打开${title}" aria-controls="panel" aria-expanded="false">
      <img src="${iconUrl}" alt="" />
    </button>

    <div id="panel" role="dialog" aria-label="${title}" aria-hidden="true">
      <div id="hdr">
        <span id="hdr-identity">
          <img src="${iconUrl}" alt="" />
          <span>${title}</span>
        </span>
        <button id="close" type="button" aria-label="关闭${title}">×</button>
      </div>
      <div id="msgs" aria-live="polite"></div>
      <div id="bar">
        <input id="inp" placeholder="询问这个商品..." />
        <button id="send">发送</button>
      </div>
    </div>
  `;

  var fab = shadow.getElementById("fab");
  var panel = shadow.getElementById("panel");
  var msgs = shadow.getElementById("msgs");
  var inp = shadow.getElementById("inp");
  var send = shadow.getElementById("send");
  var close = shadow.getElementById("close");
  var dragState = null;
  var movedDuringPointer = false;

  function setPanelOpen(open) {
    panel.classList.toggle("open", open);
    fab.setAttribute("aria-label", (open ? "关闭" : "打开") + title);
    fab.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    if (open) {
      positionPanelNearFab();
      requestAnimationFrame(function () {
        inp.focus();
      });
    }
  }

  function positionPanelNearFab() {
    var gap = 16;
    var margin = 12;
    var fabRect = fab.getBoundingClientRect();
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var desiredWidth = Math.min(360, viewportWidth - margin * 2);
    var desiredHeight = Math.min(520, viewportHeight - margin * 2);
    var minUsefulWidth = 240;
    var minUsefulHeight = 260;

    var spaces = {
      top: fabRect.top - margin - gap,
      bottom: viewportHeight - fabRect.bottom - margin - gap,
      left: fabRect.left - margin - gap,
      right: viewportWidth - fabRect.right - margin - gap,
    };

    var placement = "top";
    if (spaces.top >= minUsefulHeight) {
      placement = "top";
    } else if (spaces.bottom >= minUsefulHeight) {
      placement = "bottom";
    } else if (spaces.right >= minUsefulWidth || spaces.left >= minUsefulWidth) {
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
      top = placement === "top" ? fabRect.top - gap - panelHeight : fabRect.bottom + gap;
    } else {
      panelWidth = Math.max(1, Math.min(desiredWidth, spaces[placement]));
      left = placement === "left" ? fabRect.left - gap - panelWidth : fabRect.right + gap;
      top = fabRect.top + fabRect.height / 2 - panelHeight / 2;
    }

    left = Math.max(margin, Math.min(left, viewportWidth - panelWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - panelHeight - margin));

    panel.style.width = panelWidth + "px";
    panel.style.height = panelHeight + "px";
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  fab.addEventListener("pointerdown", function (e) {
    var rect = fab.getBoundingClientRect();
    dragState = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
    };
    movedDuringPointer = false;
    fab.setPointerCapture(e.pointerId);
  });

  fab.addEventListener("pointermove", function (e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    if (Math.hypot(dx, dy) > 4) movedDuringPointer = true;

    var margin = 8;
    var nextLeft = e.clientX - dragState.offsetX;
    var nextTop = e.clientY - dragState.offsetY;
    var maxLeft = window.innerWidth - fab.offsetWidth - margin;
    var maxTop = window.innerHeight - fab.offsetHeight - margin;

    nextLeft = Math.max(margin, Math.min(nextLeft, maxLeft));
    nextTop = Math.max(margin, Math.min(nextTop, maxTop));

    fab.style.left = nextLeft + "px";
    fab.style.top = nextTop + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";

    if (panel.classList.contains("open")) positionPanelNearFab();
  });

  fab.addEventListener("pointerup", function (e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    fab.releasePointerCapture(e.pointerId);
    dragState = null;
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

  document.addEventListener("pointerdown", function (e) {
    if (!panel.classList.contains("open")) return;
    if (e.composedPath().indexOf(host) !== -1) return;
    setPanelOpen(false);
  });

  window.addEventListener("resize", function () {
    if (panel.classList.contains("open")) positionPanelNearFab();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      if (panel.classList.contains("open")) positionPanelNearFab();
    });
  }

  shadow.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      setPanelOpen(false);
      fab.focus();
    }
  });

  function addBubble(text, who) {
    var el = document.createElement("div");
    el.className = "bubble " + who;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendMessage() {
    var text = inp.value.trim();
    if (!text) return;

    inp.value = "";
    addBubble(text, "user");
    send.disabled = true;

    try {
      var r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: medicineId,
          session_id: sessionId,
          message: text,
          context: context,
        }),
      });
      var data = await r.json();
      if (!r.ok) {
        throw new Error(data.detail || "后端返回错误：" + r.status);
      }
      addBubble(data.answer || data.reply || "暂无回复", "bot");
    } catch (e) {
      addBubble("调用后端失败：" + e.message, "bot");
    } finally {
      send.disabled = false;
      inp.focus();
    }
  }

  send.addEventListener("click", sendMessage);
  inp.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });
})();
