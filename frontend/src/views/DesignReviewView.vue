<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getMedicines } from "../api/client";
import { exhibitConfig, VARIANT_IDS, type VariantId } from "../config/exhibit";
import type { MedicineSummary } from "../types";

const router = useRouter();
const medicines = ref<MedicineSummary[]>([]);
const selectedMedicineId = ref(Object.keys(exhibitConfig.medicines)[0]);
const loading = ref(true);
const error = ref("");

const selectedMedicine = computed(() =>
  medicines.value.find((item) => item.id === selectedMedicineId.value),
);

function frameUrl(variantId: VariantId) {
  return router.resolve({
    name: "medicine",
    params: { id: selectedMedicineId.value },
    query: { variant: variantId, review: "1" },
  }).href;
}

onMounted(async () => {
  try {
    medicines.value = await getMedicines();
    if (
      medicines.value.length &&
      !medicines.value.some((item) => item.id === selectedMedicineId.value)
    ) {
      selectedMedicineId.value = medicines.value[0].id;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "样品列表加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="design-review">
    <header class="review-heading">
      <div>
        <h1>同一份内容，三种表达</h1>
        <p>
          固定样品后并排比较信息层级、视觉语言与 TINA 的角色强度；不要把药品内容差异误认为设计偏好。
        </p>
      </div>

      <label class="medicine-selector">
        <span>比较样品</span>
        <select v-model="selectedMedicineId" :disabled="loading || !medicines.length">
          <option v-for="item in medicines" :key="item.id" :value="item.id">
            {{ item.name.replace(/\s*DEMO\s*$/i, "") }}
          </option>
        </select>
      </label>
    </header>

    <p v-if="loading" class="review-status" role="status">正在准备设计样本…</p>
    <p v-else-if="error" class="review-status review-status--error" role="alert">
      {{ error }}。请先启动后端服务再刷新本页。
    </p>

    <div v-else class="review-grid">
      <article v-for="variantId in VARIANT_IDS" :key="variantId" class="review-card">
        <header>
          <div>
            <h2>{{ exhibitConfig.variants[variantId].name }}</h2>
            <p>{{ exhibitConfig.variants[variantId].label }}</p>
          </div>
          <a :href="frameUrl(variantId)" target="_blank" rel="noopener">单独打开</a>
        </header>

        <div class="phone-preview">
          <iframe
            :key="`${selectedMedicineId}-${variantId}`"
            :src="frameUrl(variantId)"
            :title="`${selectedMedicine?.name || selectedMedicineId} · ${exhibitConfig.variants[variantId].label}`"
            loading="lazy"
          ></iframe>
        </div>

        <p class="review-description">{{ exhibitConfig.variants[variantId].description }}</p>
      </article>
    </div>
  </section>
</template>
