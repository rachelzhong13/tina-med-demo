<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { exhibitConfig, variantIds, type VariantId } from "../config/exhibit";
import { getMedicines } from "../api/client";
import type { MedicineSummary } from "../types";

const router = useRouter();
const medicines = ref<MedicineSummary[]>([]);
const selectedMedicineId = ref("medicine-001");
const loading = ref(true);
const error = ref("");

function frameUrl(variant: VariantId) {
  return router.resolve({ name: "medicine", params: { id: selectedMedicineId.value }, query: { variant, review: "1" } }).href;
}

onMounted(async () => {
  try { medicines.value = await getMedicines(); }
  catch (err) { error.value = err instanceof Error ? err.message : "样品列表加载失败"; }
  finally { loading.value = false; }
});
</script>

<template>
  <section class="design-review">
    <header class="review-heading">
      <div><h1>三种当代草本方向</h1><p>同一份样品资料同时进入草本留白、东方图鉴与草本光学，比较的是构图、节奏与气质，而不只是颜色。</p></div>
      <label class="medicine-selector"><span>比较样品</span><select v-model="selectedMedicineId" :disabled="loading || !medicines.length"><option v-for="item in medicines" :key="item.id" :value="item.id">{{ item.name.replace(/\s*DEMO\s*$/i, "") }}</option></select></label>
    </header>
    <p v-if="loading" class="review-status" role="status">正在准备三套画面…</p>
    <p v-else-if="error" class="review-status review-status--error" role="alert">{{ error }}</p>
    <div v-else class="review-grid review-grid--variants">
      <article v-for="variantId in variantIds" :key="variantId" class="review-device review-device--phone">
        <header><div><h2>{{ exhibitConfig.variants[variantId].label }}</h2><p>{{ exhibitConfig.variants[variantId].name }}</p></div><a :href="frameUrl(variantId)" target="_blank" rel="noopener">完整打开</a></header>
        <div class="phone-preview"><iframe :key="`${selectedMedicineId}-${variantId}`" :src="frameUrl(variantId)" :title="`${exhibitConfig.variants[variantId].label}手机验收视图`"></iframe></div>
      </article>
    </div>
  </section>
</template>
