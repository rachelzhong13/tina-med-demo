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

const usageMetric = computed(() => {
  const value = items.value[0]?.value || "";
  const match = value.match(/(?:每日|晚间)\s*(\d+)\s*(次|粒|袋)/);
  if (!match) return { value: "—", unit: "", cadence: "以资料说明为准" };
  return { value: match[1], unit: match[2], cadence: match[0] };
});

const family = computed(() => {
  const presentation = props.section.presentation;
  if (["botanical-prose", "editorial-index", "luminous-lead"].includes(presentation)) return "lead";
  if (["herbarium-story", "catalogue-story", "translucent-story"].includes(presentation)) return "story";
  if (["quiet-usage", "vertical-usage", "orbit-usage"].includes(presentation)) return "usage";
  if (["safety-note", "cinnabar-safety", "glass-safety"].includes(presentation)) return "safety";
  if (["specimen-ledger", "catalogue-grid", "optical-ledger"].includes(presentation)) return "ledger";
  return "archive";
});

const microLabel = computed(() => ({
  lead: props.variantId === "oriental-editorial" ? "CONTEXT / 语境" : "BOTANICAL CONTEXT",
  story: props.variantId === "oriental-editorial" ? "PLATE / 形态图版" : "FORM & HERB",
  usage: props.variantId === "botanical-future" ? "RHYTHM SIGNAL" : "DEMO RHYTHM",
  safety: "DEMO BOUNDARY",
  ledger: props.variantId === "oriental-editorial" ? "OBJECT INDEX" : "SPECIMEN NOTES",
}[family.value] || "ARCHIVE"));

function itemId(field: MedicineField) {
  return `${props.section.id}-${field}`;
}
</script>

<template>
  <details
    v-if="family === 'archive'"
    class="exhibit-section exhibit-section--archive"
    :data-variant="variantId"
    :data-section="section.id"
  >
    <summary>
      <span class="section-index">06</span>
      <h2>{{ section.label }}</h2>
      <span class="archive-action">
        <span class="archive-action__open">展开资料</span>
        <span class="archive-action__close">收起资料</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </span>
    </summary>
    <dl class="archive-list">
      <div v-for="item in items" :key="item.field"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
    </dl>
  </details>

  <section
    v-else
    class="exhibit-section"
    :class="[`exhibit-section--${family}`, `exhibit-section--${section.presentation}`]"
    :data-variant="variantId"
    :data-section="section.id"
    :aria-labelledby="`${section.id}-heading`"
  >
    <div class="section-shell">
      <header class="section-heading">
        <span class="section-index">0{{ section.order / 10 }}</span>
        <h2 :id="`${section.id}-heading`">{{ section.label }}</h2>
        <span class="section-micro">{{ microLabel }}</span>
      </header>

      <div v-if="family === 'lead'" class="lead-composition">
        <p>{{ items[0]?.value }}</p>
        <svg v-if="variantId === 'botanical-minimal'" class="section-botanical section-botanical--minimal" viewBox="0 0 250 270" fill="none" aria-hidden="true">
          <path class="section-botanical__stem" d="M120 263C123 197 139 126 177 36M139 186L105 154M157 130L190 104M174 73L149 56" />
          <path class="section-botanical__leaf" d="M105 154C83 136 58 132 39 140C54 165 78 172 105 154ZM190 104C209 92 227 92 242 100C228 119 210 122 190 104ZM149 56C133 45 116 43 102 49C114 65 130 69 149 56Z" />
        </svg>
        <svg v-else-if="variantId === 'oriental-editorial'" class="section-botanical section-botanical--editorial" viewBox="0 0 250 270" fill="none" aria-hidden="true">
          <path class="section-botanical__stem" d="M116 264C119 210 124 156 139 102C146 77 151 54 153 31M124 205L86 177M132 154L171 126M143 91L116 70" />
          <path class="section-botanical__leaf" d="M86 177C62 159 38 156 18 165C35 188 59 193 86 177ZM171 126C194 110 217 108 238 117C220 140 196 143 171 126ZM116 70C98 57 80 55 64 62C77 79 95 83 116 70Z" />
          <path class="section-botanical__caption" d="M18 226H76M18 237H58" />
        </svg>
        <svg v-else class="section-botanical section-botanical--future" viewBox="0 0 250 270" fill="none" aria-hidden="true">
          <path class="section-botanical__stem" d="M119 264C122 205 130 149 151 91C158 72 164 54 168 34M128 202L91 172M139 145L180 116M153 87L128 67" />
          <path class="section-botanical__leaf" d="M91 172C68 151 43 148 23 158C39 183 64 189 91 172ZM180 116C202 100 224 99 244 108C227 132 203 135 180 116ZM128 67C111 54 93 52 77 59C90 77 108 81 128 67Z" />
          <circle class="section-botanical__node" cx="128" cy="202" r="3" /><circle class="section-botanical__node" cx="139" cy="145" r="3" /><circle class="section-botanical__node" cx="153" cy="87" r="3" />
        </svg>
      </div>

      <div v-else-if="family === 'story'" class="story-composition">
        <div v-for="item in items" :id="itemId(item.field)" :key="item.field" class="story-copy">
          <span>{{ item.label }}</span><p>{{ item.value }}</p>
        </div>
        <div class="herbarium-plate" aria-hidden="true">
          <span class="herbarium-plate__ring"></span>
          <svg class="herbarium-plate__specimen" viewBox="0 0 260 320" fill="none">
            <path class="herbarium-plate__stem" d="M128 300C128 243 126 184 134 129C139 91 149 59 163 27M130 232L94 202M130 179L168 148M139 111L108 84M151 57L180 43" />
            <path class="herbarium-plate__leaf" d="M94 202C70 181 44 178 23 188C40 214 66 220 94 202ZM168 148C190 131 214 129 236 139C218 164 193 167 168 148ZM108 84C88 68 68 66 50 74C65 95 86 99 108 84ZM180 43C197 32 214 33 227 41C214 57 198 59 180 43Z" />
          </svg>
          <span class="herbarium-plate__seed herbarium-plate__seed--one"></span>
          <span class="herbarium-plate__seed herbarium-plate__seed--two"></span>
        </div>
      </div>

      <div v-else-if="family === 'usage'" class="usage-composition">
        <div class="usage-metric"><strong>{{ usageMetric.value }}</strong><span>{{ usageMetric.unit }}</span></div>
        <div class="usage-copy"><span class="usage-cadence">{{ usageMetric.cadence }}</span><p>{{ items[0]?.value }}</p></div>
        <div class="usage-track" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>

      <div v-else-if="family === 'safety'" class="safety-composition">
        <strong class="safety-declaration">不可服用</strong>
        <div class="safety-copy">
          <div v-for="item in items" :id="itemId(item.field)" :key="item.field"><span>{{ item.label }}</span><p>{{ item.value }}</p></div>
        </div>
      </div>

      <dl v-else class="spec-ledger">
        <div v-for="item in items" :key="item.field"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
      </dl>
    </div>
  </section>
</template>
