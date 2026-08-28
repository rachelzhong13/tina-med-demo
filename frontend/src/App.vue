<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";

const route = useRoute();
const isDesignReview = computed(() => route.name === "design-review");
</script>

<template>
  <div
    class="app-shell"
    :class="isDesignReview ? 'app-shell--review' : 'app-shell--experience'"
  >
    <a class="skip-link" href="#main-content">跳至样品资料</a>
    <header class="topbar">
      <div class="brand" aria-label="TINA 药品智能助手">
        <span class="brand-word">TINA</span>
        <span class="brand-orbit" aria-hidden="true"></span>
        <span class="brand-descriptor">草本智能体验</span>
      </div>
      <div class="topbar-note">
        <span>{{ isDesignReview ? "DIRECTION REVIEW" : "MODERN BOTANICAL / 2026" }}</span>
        <span>{{ isDesignReview ? "THREE ART DIRECTIONS" : "虚构草本演示资料" }}</span>
      </div>
    </header>
    <main
      id="main-content"
      class="page-wrap"
      :class="{ 'page-wrap--review': isDesignReview }"
      tabindex="-1"
    >
      <RouterView />
    </main>
  </div>
</template>
