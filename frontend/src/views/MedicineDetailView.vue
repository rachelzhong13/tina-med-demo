<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ExhibitSection from "../components/ExhibitSection.vue";
import ProductVisual from "../components/ProductVisual.vue";
import { exhibitConfig, fieldLabels, getVisibleSections, resolveVariantId } from "../config/exhibit";
import { API_BASE, createSession, getHistory, getMedicine } from "../api/client";
import type { Medicine } from "../types";

const route = useRoute();
const medicine = ref<Medicine | null>(null);
const loading = ref(true);
const error = ref("");
let medicineRequest = 0;
let assistantRequest = 0;

const activeVariantId = computed(() => resolveVariantId(medicine.value?.id, route.query.variant));
const variant = computed(() => exhibitConfig.variants[activeVariantId.value]);
const sections = computed(() => getVisibleSections(variant.value));
const firstSectionHref = computed(() => `#${sections.value[0]?.id || "purpose"}-heading`);
const shortName = computed(() => medicine.value?.name.replace(/\s*DEMO\s*$/i, "") || "");
const heroLead = computed(() => medicine.value ? String(medicine.value[variant.value.hero.leadField] || "暂无资料") : "");
const heroFacts = computed(() => medicine.value ? variant.value.hero.factFields.map((field) => ({ field, label: fieldLabels[field], value: String(medicine.value?.[field] || "暂无资料") })) : []);

declare global {
  interface Window {
    WATER_DROP_ASSISTANT_CONFIG?: {
      apiBase: string; apiPath: string; streamApiPath: string; voiceApiPath: string; iconUrl: string; title: string;
      medicineId: string; medicineName: string; sessionId: string;
      context: Medicine; variant: string; mode: string; greeting: string;
    };
  }
}

async function loadAssistantSession(medicineId: string) {
  const sessionKey = `tina-session-${medicineId}`;
  const saved = localStorage.getItem(sessionKey);
  if (saved) {
    try { await getHistory(saved); return saved; }
    catch { localStorage.removeItem(sessionKey); }
  }
  const session = await createSession(medicineId);
  localStorage.setItem(sessionKey, session.session_id);
  return session.session_id;
}

function loadWaterDropAssistant(currentMedicine: Medicine, sessionId: string) {
  const baseUrl = import.meta.env.BASE_URL;
  window.WATER_DROP_ASSISTANT_CONFIG = {
    apiBase: API_BASE, apiPath: "/chat", streamApiPath: "/chat/stream", voiceApiPath: "/chat/voice", iconUrl: `${baseUrl}widget/water-drop-icon.png`,
    title: "TINA 草本样品助手", medicineId: currentMedicine.id,
    medicineName: currentMedicine.name.replace(/\s*DEMO\s*$/i, ""), sessionId,
    context: currentMedicine, variant: activeVariantId.value,
    mode: variant.value.assistant.mode, greeting: variant.value.assistant.greeting,
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
    if (request !== assistantRequest || medicine.value?.id !== currentMedicine.id) return;
    loadWaterDropAssistant(currentMedicine, sessionId);
  } catch (err) { console.error("Water drop assistant failed to initialize", err); }
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
  } finally { if (request === medicineRequest) loading.value = false; }
}

watch(() => String(route.params.id || ""), (identifier) => { if (identifier) void loadMedicine(identifier); }, { immediate: true });
watch(() => [medicine.value?.id, activeVariantId.value] as const, ([medicineId, selectedVariant]) => {
  document.body.dataset.tinaVariant = selectedVariant;
  if (medicineId) void mountAssistant();
}, { flush: "post" });

onUnmounted(() => {
  medicineRequest += 1; assistantRequest += 1; unloadWaterDropAssistant();
  delete document.body.dataset.tinaVariant;
});
</script>

<template>
  <div v-if="loading" class="state-view" role="status" aria-live="polite"><span class="state-view__liquid" aria-hidden="true"></span><p>正在展开草本样品</p></div>
  <div v-else-if="error" class="state-view state-view--error" role="alert"><h1>样品档案暂时无法读取</h1><p>{{ error }}</p><p>请确认网络连接后，刷新当前二维码页面。</p></div>

  <article v-else-if="medicine" class="medicine-experience" :class="`variant-${activeVariantId}`" :data-medicine="medicine.id" :data-variant="activeVariantId">
    <header v-if="activeVariantId === 'botanical-minimal'" class="medicine-hero medicine-hero--minimal">
      <div class="minimal-intro">
        <span class="hero-kicker">MODERN HERBAL SPECIMEN · {{ medicine.id.slice(-3) }}</span>
        <h1>{{ shortName }}</h1>
        <p class="medicine-generic">{{ medicine.generic_name }}</p>
        <p class="medicine-lead">{{ heroLead }}</p>
        <div class="demo-proof"><span aria-hidden="true"></span><p><strong>虚构展品</strong> · 不可服用 · 不构成用药依据</p></div>
      </div>
      <ProductVisual :medicine="medicine" :variant-id="activeVariantId" />
      <dl class="hero-facts hero-facts--minimal"><div v-for="fact in heroFacts" :key="fact.field"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div></dl>
      <p class="minimal-signature" aria-hidden="true">一株 · 一物 · 一段可追问的资料</p>
      <a class="hero-continuation" :href="firstSectionHref"><span>向下阅读</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6" /></svg></a>
    </header>

    <header v-else-if="activeVariantId === 'oriental-editorial'" class="medicine-hero medicine-hero--editorial">
      <aside class="editorial-rail" aria-hidden="true"><span>02</span><span>HERBAL MONOGRAPH</span><span>TINA / 2026</span></aside>
      <div class="editorial-title">
        <span class="hero-kicker">当代草本图鉴 / OBJECT {{ medicine.id.slice(-3) }}</span>
        <h1>{{ shortName }}</h1>
        <p class="medicine-generic">{{ medicine.generic_name }}</p>
      </div>
      <ProductVisual :medicine="medicine" :variant-id="activeVariantId" />
      <div class="editorial-abstract"><span>摘要</span><p>{{ heroLead }}</p><div class="demo-proof"><span aria-hidden="true"></span><p><strong>虚构展品</strong> · 非真实药品</p></div></div>
      <dl class="hero-facts hero-facts--editorial"><div v-for="fact in heroFacts" :key="fact.field"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div></dl>
      <a class="hero-continuation" :href="firstSectionHref"><span>进入图鉴</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6" /></svg></a>
    </header>

    <header v-else class="medicine-hero medicine-hero--future">
      <div class="future-identity">
        <span class="hero-kicker">BOTANICAL OBSERVATION / {{ medicine.id.slice(-3) }}</span>
        <h1>{{ shortName }}</h1>
        <p class="medicine-generic">{{ medicine.generic_name }}</p>
        <p class="medicine-lead">{{ heroLead }}</p>
        <dl class="hero-facts hero-facts--future"><div v-for="fact in heroFacts" :key="fact.field"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div></dl>
        <div class="demo-proof"><span aria-hidden="true"></span><p><strong>虚构展品</strong> · 不可服用 · 不构成用药依据</p></div>
      </div>
      <ProductVisual :medicine="medicine" :variant-id="activeVariantId" />
      <span class="future-scanline" aria-hidden="true"></span>
      <a class="hero-continuation" :href="firstSectionHref"><span>继续观察</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6" /></svg></a>
    </header>

    <aside class="demo-disclaimer" aria-label="演示资料声明"><strong>DEMO / 虚构草本资料</strong><p>全部内容与包装均为展会原创演示，不对应真实药品，不能用于诊疗或用药。</p></aside>

    <div class="exhibit-flow"><ExhibitSection v-for="section in sections" :key="section.id" :section="section" :medicine="medicine" :variant-id="activeVariantId" /></div>

    <footer class="sample-footer"><div><strong>TINA</strong><span>东方草本，以当代方式被理解与追问。</span></div><div><span>{{ medicine.id }}</span><span>{{ variant.name }}</span></div></footer>
  </article>
</template>
