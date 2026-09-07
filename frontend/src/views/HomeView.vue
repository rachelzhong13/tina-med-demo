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
  <section class="home-page">
    <div class="accessibility-bar">
      <span class="page-context">TINA 产品数字身份</span>
      <span class="identity-code">DEMO INDEX</span>
    </div>

    <section class="panel home-hero">
      <div>
        <p class="eyebrow">MEDICINE IDENTITY</p>
        <h1>扫码后的药品信息，一眼读懂</h1>
        <p>
          选择一个演示样品，进入移动端产品身份页。页面采用数字身份卡片、追溯信息和小水滴问答入口。
        </p>
      </div>
      <div class="hero-device" aria-hidden="true">
        <span class="brand-mark">T</span>
        <strong>TINA</strong>
        <small>PRODUCT ID</small>
      </div>
    </section>

    <p v-if="loading" class="state-card">正在加载药品资料...</p>
    <p v-else-if="error" class="state-card error-card">{{ error }}</p>
    <div v-else class="medicine-grid">
      <RouterLink
        v-for="medicine in medicines"
        :key="medicine.id"
        class="medicine-card"
        :to="{ name: 'medicine', params: { id: medicine.id } }"
      >
        <span class="card-index">{{ medicine.id.replace("medicine-", "ID ") }}</span>
        <p class="card-category">{{ medicine.category }}</p>
        <h2>{{ medicine.name }}</h2>
        <p>{{ medicine.generic_name }}</p>
        <div class="card-footer">
          <span>虚构展会资料</span>
          <strong>查看身份页</strong>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
