<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">T</span>
        <span>TINA 药品智能助手</span>
      </RouterLink>
      <span class="topbar-note">展会 Demo · 2026.09.29</span>
    </header>
    <main class="page-wrap">
      <RouterView />
    </main>
  </div>
</template>
