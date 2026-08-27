<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { exhibitConfig, resolveVariantId } from "./config/exhibit";

const route = useRoute();

const isDesignReview = computed(() => route.name === "design-review");
const activeVariantId = computed(() =>
  resolveVariantId(
    typeof route.params.id === "string" ? route.params.id : undefined,
    route.query.variant,
  ),
);
const activeVariant = computed(() => exhibitConfig.variants[activeVariantId.value]);
</script>

<template>
  <div
    class="app-shell"
    :class="isDesignReview ? 'app-shell--review' : `app-shell--${activeVariantId}`"
  >
    <a class="skip-link" href="#main-content">跳至样品资料</a>
    <header class="topbar">
      <div class="brand" aria-label="TINA 药品智能助手">
        <span class="brand-word">TINA</span>
        <span class="brand-descriptor">药品智能助手</span>
      </div>
      <span class="topbar-note">
        <template v-if="isDesignReview">DESIGN REVIEW</template>
        <template v-else>虚构展品 · {{ activeVariant.label }}</template>
      </span>
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
