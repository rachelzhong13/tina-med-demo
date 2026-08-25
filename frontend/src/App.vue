<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand" aria-label="TINA 药品智能助手">
        <span class="brand-mark" aria-hidden="true">T</span>
        <span>TINA 药品智能助手</span>
      </div>
      <span class="topbar-note">
        <span>展会 Demo</span>
        <span class="topbar-date">· 2026.09.29</span>
      </span>
    </header>
    <main class="page-wrap">
      <RouterView />
    </main>
  </div>
</template>
