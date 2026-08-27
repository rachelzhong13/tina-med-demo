<script setup lang="ts">
import { computed } from "vue";
import type { ExhibitVariant, VariantId } from "../config/exhibit";
import type { Medicine } from "../types";

const props = defineProps<{
  medicine: Medicine;
  variantId: VariantId;
  variant: ExhibitVariant;
}>();

const shortName = computed(() => props.medicine.name.replace(/\s*DEMO\s*$/i, ""));
const sampleCode = computed(() => props.medicine.id.slice(-3));
</script>

<template>
  <div
    class="product-visual"
    :class="`product-visual--${variant.hero.visual}`"
    aria-hidden="true"
  >
    <div class="pack-object">
      <span class="pack-object__brand">TINA LAB · SYNTHETIC SAMPLE</span>
      <span class="pack-object__code">{{ sampleCode }}</span>
      <strong>{{ shortName }}</strong>
      <span class="pack-object__generic">{{ medicine.generic_name }}</span>
      <span class="pack-object__spec">{{ medicine.specification }}</span>
      <span class="pack-object__rule"></span>
      <span class="pack-object__form">{{ medicine.dosage_form }}</span>
    </div>

    <div class="sample-form" :data-variant="variantId">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>
