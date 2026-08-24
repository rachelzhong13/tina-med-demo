<script setup lang="ts">
import QRCode from "qrcode";
import { onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { getMedicine } from "../api/client";
import type { Medicine } from "../types";

const route = useRoute();
const medicine = ref<Medicine | null>(null);
const qrDataUrl = ref("");
const loading = ref(true);
const error = ref("");

const display = (value: string) => value || "暂无数据";

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
