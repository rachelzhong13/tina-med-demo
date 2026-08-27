<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ExhibitSection from "../components/ExhibitSection.vue";
import ProductVisual from "../components/ProductVisual.vue";
import {
  exhibitConfig,
  fieldLabels,
  getVisibleSections,
  resolveVariantId,
} from "../config/exhibit";
import { API_BASE, createSession, getHistory, getMedicine } from "../api/client";
import type { Medicine } from "../types";

const route = useRoute();
const medicine = ref<Medicine | null>(null);
const loading = ref(true);
const error = ref("");
let medicineRequest = 0;
let assistantRequest = 0;

const activeVariantId = computed(() =>
  resolveVariantId(medicine.value?.id, route.query.variant),
);

const variant = computed(() => exhibitConfig.variants[activeVariantId.value]);

const sections = computed(() => getVisibleSections(variant.value));

const heroLead = computed(() => {
  if (!medicine.value) return "";
  return String(medicine.value[variant.value.hero.leadField] || "暂无资料");
});

const heroFacts = computed(() => {
  if (!medicine.value) return [];
  return variant.value.hero.factFields.map((field) => ({
    field,
    label: fieldLabels[field],
    value: String(medicine.value?.[field] || "暂无资料"),
  }));
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
  window.WATER_DROP_ASSISTANT_CONFIG = {
    apiBase: API_BASE,
    apiPath: "/chat",
    iconUrl: `${baseUrl}widget/water-drop-icon.png`,
    title: "TINA 样品助手",
    medicineId: currentMedicine.id,
    medicineName: currentMedicine.name.replace(/\s*DEMO\s*$/i, ""),
    sessionId,
    context: currentMedicine,
    variant: activeVariantId.value,
    mode: variant.value.assistant.mode,
    greeting: variant.value.assistant.greeting,
  };

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

async function mountAssistant() {
  const currentMedicine = medicine.value;
  if (!currentMedicine) return;

  const request = ++assistantRequest;
  unloadWaterDropAssistant();
  try {
    const sessionId = await loadAssistantSession(currentMedicine.id);
    if (request !== assistantRequest || medicine.value?.id !== currentMedicine.id) {
      return;
    }
    loadWaterDropAssistant(currentMedicine, sessionId);
  } catch (err) {
    console.error("Water drop assistant failed to initialize", err);
  }
}

async function loadMedicine(identifier: string) {
  const request = ++medicineRequest;
  assistantRequest += 1;
  unloadWaterDropAssistant();
  loading.value = true;
  error.value = "";
  medicine.value = null;

  try {
    const result = await getMedicine(identifier);
    if (request !== medicineRequest) return;
    medicine.value = result;
    document.title = `${result.name.replace(/\s*DEMO\s*$/i, "")} · TINA`;
  } catch (err) {
    if (request !== medicineRequest) return;
    error.value = err instanceof Error ? err.message : "样品资料加载失败";
  } finally {
    if (request === medicineRequest) loading.value = false;
  }
}

watch(
  () => String(route.params.id || ""),
  (identifier) => {
    if (identifier) void loadMedicine(identifier);
  },
  { immediate: true },
);

watch(
  () => [medicine.value?.id, activeVariantId.value] as const,
  ([medicineId]) => {
    if (medicineId) void mountAssistant();
  },
  { flush: "post" },
);

onUnmounted(() => {
  medicineRequest += 1;
  assistantRequest += 1;
  unloadWaterDropAssistant();
});
</script>

<template>
  <div v-if="loading" class="state-view" role="status" aria-live="polite">
    <span class="state-view__pulse" aria-hidden="true"></span>
    <p>正在装载样品档案</p>
  </div>

  <div v-else-if="error" class="state-view state-view--error" role="alert">
    <strong>样品档案暂时无法读取</strong>
    <p>{{ error }}</p>
    <p>请检查网络后刷新当前二维码页面。</p>
  </div>

  <article
    v-else-if="medicine"
    class="medicine-experience"
    :class="`variant-${activeVariantId}`"
    :data-medicine="medicine.id"
    :data-variant="activeVariantId"
  >
    <header class="medicine-hero">
      <div class="medicine-identity">
        <h1>{{ medicine.name.replace(/\s*DEMO\s*$/i, "") }}</h1>
        <div class="identity-line">
          <span class="demo-chip">虚构展品 · 不可服用</span>
          <span>{{ medicine.category }}</span>
        </div>
        <p class="medicine-generic">{{ medicine.generic_name }}</p>
        <p class="medicine-lead">{{ heroLead }}</p>

        <dl class="hero-facts">
          <div v-for="fact in heroFacts" :key="fact.field">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>

        <p v-if="activeVariantId === 'companion'" class="assistant-presence">
          TINA 的小水滴会在右下角等你；点击角色即可提问。
        </p>
      </div>

      <ProductVisual
        :medicine="medicine"
        :variant-id="activeVariantId"
        :variant="variant"
      />
    </header>

    <aside class="demo-disclaimer" aria-label="演示资料声明">
      <strong>DEMO DATA</strong>
      <p>这是用于展会体验的完整虚构样品资料，不是正式药品说明，也不能作为诊疗或用药依据。</p>
    </aside>

    <div class="exhibit-flow">
      <ExhibitSection
        v-for="section in sections"
        :key="section.id"
        :section="section"
        :medicine="medicine"
        :variant-id="activeVariantId"
      />
    </div>

    <footer class="sample-footer">
      <span>TINA EXHIBITION SAMPLE</span>
      <span>{{ medicine.id }} · {{ variant.name }}</span>
    </footer>
  </article>
</template>
