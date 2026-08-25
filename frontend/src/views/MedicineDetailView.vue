<script setup lang="ts">
import QRCode from "qrcode";
import { onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { API_BASE, createSession, getHistory, getMedicine } from "../api/client";
import type { Medicine } from "../types";

const route = useRoute();
const medicine = ref<Medicine | null>(null);
const qrDataUrl = ref("");
const loading = ref(true);
const error = ref("");

const display = (value: string) => value || "暂无数据";

declare global {
  interface Window {
    WATER_DROP_ASSISTANT_CONFIG?: {
      apiBase: string;
      apiPath: string;
      iconUrl: string;
      title: string;
      medicineId: string;
      sessionId: string;
      context: Medicine;
    };
  }
}

async function loadAssistantSession(medicineId: string) {
  const sessionKey = `tina-session-${medicineId}`;
  const saved = localStorage.getItem(sessionKey);
  if (saved) {
    try {
      await getHistory(saved);
      return saved;
    } catch {
      localStorage.removeItem(sessionKey);
    }
  }

  const session = await createSession(medicineId);
  localStorage.setItem(sessionKey, session.session_id);
  return session.session_id;
}

function loadWaterDropAssistant(currentMedicine: Medicine, sessionId: string) {
  const baseUrl = import.meta.env.BASE_URL;
  window.WATER_DROP_ASSISTANT_CONFIG = {
    apiBase: API_BASE,
    apiPath: "/chat",
    iconUrl: `${baseUrl}widget/water-drop-icon.png`,
    title: "药品 AI 助手",
    medicineId: currentMedicine.id,
    sessionId,
    context: currentMedicine,
  };

  if (document.getElementById("water-drop-script")) return;

  const script = document.createElement("script");
  script.id = "water-drop-script";
  script.src = `${baseUrl}widget/water-drop.js`;
  script.async = true;
  document.body.appendChild(script);
}

function unloadWaterDropAssistant() {
  document.getElementById("water-drop-root")?.remove();
  document.getElementById("water-drop-script")?.remove();
  delete window.WATER_DROP_ASSISTANT_CONFIG;
}

onMounted(async () => {
  try {
    medicine.value = await getMedicine(String(route.params.id));
    if (medicine.value?.qr_target_url) {
      qrDataUrl.value = await QRCode.toDataURL(medicine.value.qr_target_url, {
        width: 220,
        margin: 2,
        color: { dark: "#17352e", light: "#ffffff" },
      });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "药品资料加载失败";
  } finally {
    loading.value = false;
  }

  if (!medicine.value) return;

  try {
    const sessionId = await loadAssistantSession(medicine.value.id);
    loadWaterDropAssistant(medicine.value, sessionId);
  } catch (err) {
    console.error("Water drop assistant failed to initialize", err);
  }
});

onUnmounted(() => {
  unloadWaterDropAssistant();
});
</script>

<template>
  <p v-if="loading" class="state-card">正在加载药品资料…</p>
  <p v-else-if="error" class="state-card error-card">{{ error }}</p>
  <section v-else-if="medicine" class="detail-layout">
    <div class="detail-main">
      <RouterLink class="back-link" to="/">← 返回药品列表</RouterLink>
      <div class="detail-heading">
        <div>
          <p class="eyebrow">{{ medicine.category }}</p>
          <h1>{{ medicine.name }}</h1>
          <p class="subtitle">{{ medicine.generic_name }}</p>
        </div>
        <span class="demo-badge">DEMO / MOCK</span>
      </div>
      <p class="notice">这是用于展会展示的虚构药品资料，不是正式药品说明，不可据此用药。</p>

      <div class="info-grid">
        <div><span>生产企业</span><strong>{{ display(medicine.manufacturer) }}</strong></div>
        <div><span>批准文号</span><strong>{{ display(medicine.approval_number) }}</strong></div>
        <div><span>条码</span><strong>{{ display(medicine.barcode) }}</strong></div>
        <div><span>数据来源</span><strong>{{ display(medicine.source) }}</strong></div>
      </div>

      <div class="detail-copy">
        <h2>产品描述</h2>
        <p>{{ display(medicine.description) }}</p>
        <h2>资料摘要</h2>
        <dl>
          <div><dt>适应症</dt><dd>{{ display(medicine.indications) }}</dd></div>
          <div><dt>用法</dt><dd>{{ display(medicine.usage) }}</dd></div>
          <div><dt>禁忌</dt><dd>{{ display(medicine.contraindications) }}</dd></div>
          <div><dt>警告</dt><dd>{{ display(medicine.warnings) }}</dd></div>
        </dl>
      </div>

      <RouterLink class="primary-button" :to="{ name: 'chat', params: { id: medicine.id } }">
        咨询 AI 助手 <span>→</span>
      </RouterLink>
    </div>

    <aside class="qr-panel">
      <p class="eyebrow">SCAN TO OPEN</p>
      <h2>扫码查看</h2>
      <img v-if="qrDataUrl" :src="qrDataUrl" alt="药品详情二维码" class="qr-image" />
      <div v-else class="qr-placeholder">二维码生成中…</div>
      <p>扫码进入当前药品详情页</p>
    </aside>
  </section>
</template>
