<script setup lang="ts">
import { computed } from "vue";
import {
  fieldLabels,
  type ExhibitSection,
  type MedicineField,
  type VariantId,
} from "../config/exhibit";
import type { Medicine } from "../types";

const props = defineProps<{
  section: ExhibitSection;
  medicine: Medicine;
  variantId: VariantId;
}>();

const items = computed(() =>
  props.section.fields.map((field) => ({
    field,
    label: fieldLabels[field],
    value: String(props.medicine[field as keyof Medicine] || "暂无资料"),
  })),
);

const isSingleNarrative = computed(
  () => items.value.length === 1 && props.section.presentation !== "fact-grid",
);

function itemId(field: MedicineField) {
  return `${props.section.id}-${field}`;
}
</script>

<template>
  <details
    v-if="section.presentation === 'metadata'"
    class="exhibit-section exhibit-section--metadata"
    :data-section="section.id"
    :open="variantId !== 'companion'"
  >
    <summary>
      <span>{{ section.label }}</span>
      <span class="summary-action">展开档案</span>
    </summary>
    <dl class="metadata-list">
      <div v-for="item in items" :key="item.field">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </details>

  <section
    v-else
    class="exhibit-section"
    :class="`exhibit-section--${section.presentation}`"
    :data-section="section.id"
    :aria-labelledby="`${section.id}-heading`"
  >
    <h2 :id="`${section.id}-heading`">{{ section.label }}</h2>

    <dl v-if="section.presentation === 'fact-grid'" class="section-facts">
      <div v-for="item in items" :key="item.field">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>

    <div v-else class="section-copy">
      <div v-for="item in items" :id="itemId(item.field)" :key="item.field">
        <span v-if="!isSingleNarrative" class="field-label">{{ item.label }}</span>
        <p>{{ item.value }}</p>
      </div>
    </div>
  </section>
</template>
