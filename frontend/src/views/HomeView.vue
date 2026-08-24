<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getMedicines } from "../api/client";
import type { MedicineSummary } from "../types";

const medicines = ref<MedicineSummary[]>([]);
const loading = ref(true);
const error = ref("");

onMounted(async () => {
  try {
    medicines.value = await getMedicines();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "药品列表加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="hero-section">
    <div>
      <p class="eyebrow">TINA · MEDICINE AGENT</p>
      <h1>让药品信息<br /><em>更容易被理解</em></h1>
      <p class="hero-copy">
        选择一个演示药品，查看结构化资料，并进入基于当前药品上下文的智能问答。
      </p>
    </div>
    <div class="hero-card">
      <span class="hero-card-label">LIVE DEMO</span>
      <strong>扫码 · 查看 · 询问</strong>
      <span>药品详情与 AI Chat 的完整展示闭环</span>
    </div>
  </section>

  <section class="content-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">DEMO MEDICINES</p>
        <h2>选择演示药品</h2>
      </div>
      <span class="demo-badge">DEMO / MOCK DATA</span>
    </div>

    <p v-if="loading" class="state-card">正在加载药品资料…</p>
    <p v-else-if="error" class="state-card error-card">{{ error }}</p>
    <div v-else class="medicine-grid">
      <article v-for="medicine in medicines" :key="medicine.id" class="medicine-card">
        <div class="card-index">{{ medicine.id.replace("medicine-", "#") }}</div>
        <p class="card-category">{{ medicine.category }}</p>
        <h3>{{ medicine.name }}</h3>
        <p>{{ medicine.generic_name }}</p>
        <div class="card-footer">
          <span>仅供展会演示</span>
          <RouterLink :to="{ name: 'medicine', params: { id: medicine.id } }" class="text-link">
            查看详情 →
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
