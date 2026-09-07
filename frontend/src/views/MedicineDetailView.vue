<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { API_BASE, createSession, getHistory, getMedicine } from "../api/client";
import type { Medicine } from "../types";

const route = useRoute();
const medicine = ref<Medicine | null>(null);
const loading = ref(true);
const error = ref("");
const activeTab = ref<"info" | "visual">("info");
const largeType = ref(localStorage.getItem("tina-gds-large-type") === "true");
const feedbackOpen = ref(false);
const feedbackTitle = ref("提交反馈");
const toastVisible = ref(false);
let toastTimer = 0;

const display = (value?: string) => value || "暂无数据";
const identityCode = computed(() => {
  const id = medicine.value?.id || "medicine-000";
  return `ID TINA-DEMO-${id.replace(/\D/g, "").padStart(3, "0")}`;
});

const packageTitle = computed(() => {
  const name = medicine.value?.name || "演示样品";
  return name.replace(/\s*DEMO\s*/i, "").slice(0, 4) || "样品";
});

declare global {
  interface Window {
    WATER_DROP_ASSISTANT_CONFIG?: {
      apiBase: string;
      apiPath: string;
      iconUrl: string;
      title: string;
      medicineId: string;
      medicineName: string;
      sessionId: string;
      context: Medicine;
      variant: string;
      mode: string;
      greeting: string;
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
  const assistantTheme = getAssistantTheme(currentMedicine.id);
  window.WATER_DROP_ASSISTANT_CONFIG = {
    apiBase: API_BASE,
    apiPath: "/chat",
    iconUrl: `${baseUrl}widget/water-drop-icon.png`,
    title: "TINA 小水滴样品助手",
    medicineId: currentMedicine.id,
    medicineName: currentMedicine.name,
    sessionId,
    context: currentMedicine,
    variant: assistantTheme.variant,
    mode: assistantTheme.mode,
    greeting: assistantTheme.greeting,
  };

  if (document.getElementById("water-drop-script")) return;

  const script = document.createElement("script");
  script.id = "water-drop-script";
  script.src = `${baseUrl}widget/water-drop.js`;
  script.async = true;
  document.body.appendChild(script);
}

function getAssistantTheme(medicineId: string) {
  if (medicineId === "medicine-002") {
    return {
      variant: "oriental-editorial",
      mode: "editorial-guide",
      greeting: "你好，我是 TINA，小水滴样品助手。这个页面偏东方图鉴风格，我可以帮你理解样品信息和资料来源。",
    };
  }
  if (medicineId === "medicine-003") {
    return {
      variant: "botanical-future",
      mode: "future-guide",
      greeting: "你好，我是 TINA，小水滴样品助手。这个页面偏光学观察风格，可以问我展品、知识库或需要查询的问题。",
    };
  }
  return {
    variant: "botanical-minimal",
    mode: "botanical-guide",
    greeting: "你好，我是 TINA，小水滴样品助手。你可以问我展品信息、知识库资料，或需要进一步查询的问题。",
  };
}

function unloadWaterDropAssistant() {
  document.getElementById("water-drop-root")?.remove();
  document.getElementById("water-drop-script")?.remove();
  delete window.WATER_DROP_ASSISTANT_CONFIG;
}

function toggleLargeType() {
  largeType.value = !largeType.value;
  localStorage.setItem("tina-gds-large-type", largeType.value ? "true" : "false");
}

function openFeedback(title: string) {
  feedbackTitle.value = title;
  feedbackOpen.value = true;
}

function submitFeedback() {
  feedbackOpen.value = false;
  toastVisible.value = true;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false;
  }, 3200);
}

onMounted(async () => {
  try {
    medicine.value = await getMedicine(String(route.params.id));
    const sessionId = await loadAssistantSession(medicine.value.id);
    loadWaterDropAssistant(medicine.value, sessionId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "药品资料加载失败";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.clearTimeout(toastTimer);
  unloadWaterDropAssistant();
});
</script>

<template>
  <p v-if="loading" class="state-card">正在加载药品资料...</p>
  <p v-else-if="error" class="state-card error-card">{{ error }}</p>

  <article v-else-if="medicine" class="identity-page" :class="{ 'large-type': largeType }">
    <div class="accessibility-bar" aria-label="显示设置">
      <RouterLink class="back-link" to="/">返回列表</RouterLink>
      <button class="large-type-toggle" type="button" :aria-pressed="largeType" @click="toggleLargeType">
        {{ largeType ? "切换普通版" : "切换大字版" }}
      </button>
    </div>

    <section class="panel product-hero" aria-labelledby="product-name">
      <div class="product-visual" :aria-label="`${medicine.name} 虚构包装视觉`" role="img">
        <div class="brand-line"><span class="brand-mark">T</span><span>TINA</span></div>
        <span class="verified"><span class="verified-dot" aria-hidden="true"></span>演示身份已登记</span>
        <div class="blister" aria-hidden="true">
          <span v-for="index in 6" :key="index"></span>
        </div>
        <div class="pack" aria-hidden="true">
          <small>TINA / DEMO</small>
          <strong>{{ packageTitle }}</strong>
          <span class="pack-rule"></span>
          <span class="pack-spec">{{ display(medicine.specification) }}</span>
        </div>
        <span class="demo-flag">虚构展品 · 不可服用</span>
      </div>

      <div class="product-summary">
        <h1 id="product-name">{{ medicine.name }}</h1>
        <span class="identity-code">{{ identityCode }}</span>
        <p>
          {{ medicine.generic_name }}<br />
          登记时间：{{ medicine.created_at.slice(0, 10) }}
        </p>
      </div>
    </section>

    <section class="panel digital-card" aria-label="产品数字身份详情">
      <div class="barcode" aria-hidden="true"></div>
      <div class="tabs" role="tablist" aria-label="产品资料视图">
        <button
          class="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'info'"
          @click="activeTab = 'info'"
        >
          产品信息
        </button>
        <button
          class="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'visual'"
          @click="activeTab = 'visual'"
        >
          产品图示
        </button>
      </div>

      <div v-show="activeTab === 'info'" class="tab-panel" role="tabpanel">
        <section class="info-section" aria-labelledby="identity-heading">
          <h2 id="identity-heading" class="section-title">产品身份信息</h2>
          <dl class="field-list">
            <div class="field-row"><dt>产品种类</dt><dd>{{ display(medicine.category) }}</dd></div>
            <div class="field-row"><dt>规格型号</dt><dd>{{ display(medicine.specification) }}</dd></div>
            <div class="field-row"><dt>剂型</dt><dd>{{ display(medicine.dosage_form) }}</dd></div>
            <div class="field-row"><dt>展示企业</dt><dd>{{ display(medicine.manufacturer) }}</dd></div>
            <div class="field-row"><dt>批准文号</dt><dd>{{ display(medicine.approval_number) }}</dd></div>
            <div class="field-row"><dt>药品条码</dt><dd>{{ display(medicine.barcode) }}</dd></div>
            <div class="field-row"><dt>产品状态</dt><dd><span class="status-value">演示资料有效</span></dd></div>
          </dl>
        </section>

        <section class="info-section" aria-labelledby="safety-heading">
          <h2 id="safety-heading" class="section-title">质量安全信息</h2>
          <details open>
            <summary>安全说明 <span class="chevron" aria-hidden="true"></span></summary>
            <p class="detail-note">{{ display(medicine.warnings) }}</p>
          </details>
          <details>
            <summary>禁忌边界 <span class="chevron" aria-hidden="true"></span></summary>
            <p class="detail-note">{{ display(medicine.contraindications) }}</p>
          </details>
          <details>
            <summary>保存条件 <span class="chevron" aria-hidden="true"></span></summary>
            <p class="detail-note">{{ display(medicine.storage) }}</p>
          </details>
          <details>
            <summary>资料来源 <span class="chevron" aria-hidden="true"></span></summary>
            <p class="detail-note">{{ display(medicine.source) }}</p>
          </details>
        </section>
      </div>

      <div v-show="activeTab === 'visual'" class="tab-panel" role="tabpanel">
        <div class="image-grid">
          <div class="image-shot" role="img" :aria-label="`${medicine.name} 正面图示`"><span>{{ packageTitle }}<br />正面</span></div>
          <div class="image-shot" role="img" :aria-label="`${medicine.name} 侧面图示`"><span>{{ packageTitle }}<br />侧面</span></div>
          <p class="image-note">
            原创虚构包装视觉，仅用于展会界面评审，不对应真实商品。
          </p>
        </div>
      </div>
    </section>

    <section class="panel feedback-panel" aria-labelledby="feedback-title">
      <h2 id="feedback-title">投诉反馈</h2>
      <p>若实物或宣传内容与本页面登记资料不一致，可选择问题类型并提交反馈。</p>
      <div class="feedback-grid">
        <button class="feedback-action" type="button" @click="openFeedback('实物与本页面不符')">
          <strong>实物与本页面不符</strong><span>去反馈</span>
        </button>
        <button class="feedback-action" type="button" @click="openFeedback('宣传与本页面不符')">
          <strong>宣传与本页面不符</strong><span>去反馈</span>
        </button>
      </div>
    </section>

    <p class="page-foot">
      TINA 产品数字身份 · 当前内容为虚构展会资料，不构成用药建议。
    </p>

    <div v-if="feedbackOpen" class="dialog-backdrop" @click.self="feedbackOpen = false">
      <section class="feedback-dialog" role="dialog" aria-modal="true" :aria-label="feedbackTitle">
        <header class="dialog-head">
          <h2>{{ feedbackTitle }}</h2>
          <button class="dialog-close" type="button" aria-label="关闭反馈表单" @click="feedbackOpen = false">×</button>
        </header>
        <form class="feedback-form" @submit.prevent="submitFeedback">
          <label for="feedback-message">补充说明</label>
          <textarea id="feedback-message" maxlength="300" placeholder="请描述发现的问题"></textarea>
          <p class="form-help">请勿填写姓名、电话或其他个人敏感信息。</p>
          <button class="submit-button" type="submit">提交反馈</button>
        </form>
      </section>
    </div>

    <p v-if="toastVisible" class="toast" role="status" aria-live="polite">
      界面演示完成，未向外部提交
    </p>
  </article>
</template>
