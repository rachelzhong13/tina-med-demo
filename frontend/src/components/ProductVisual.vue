<script setup lang="ts">
import { computed } from "vue";
import type { VariantId } from "../config/exhibit";
import type { Medicine } from "../types";

const props = defineProps<{
  medicine: Medicine;
  variantId: VariantId;
}>();

const shortName = computed(() => props.medicine.name.replace(/\s*DEMO\s*$/i, ""));
const sampleCode = computed(() => props.medicine.id.slice(-3));
const productKind = computed(() => {
  if (props.medicine.id === "medicine-002") return "capsule";
  if (props.medicine.id === "medicine-003") return "granule";
  return "tablet";
});

const visualLabel = computed(
  () =>
    `${shortName.value}的原创虚构包装视觉，${props.medicine.dosage_form}，${props.medicine.specification}`,
);
</script>

<template>
  <figure
    class="product-visual"
    :data-product-kind="productKind"
    :data-variant="variantId"
    :aria-label="visualLabel"
  >
    <div class="botanical-field" aria-hidden="true">
      <template v-if="variantId === 'botanical-minimal'">
        <svg class="botanical-stem botanical-stem--primary botanical-stem--minimal" viewBox="0 0 240 420" fill="none">
          <path class="botanical-line botanical-line--trunk" d="M118 405C124 338 119 274 121 214C123 145 135 86 156 38" />
          <path class="botanical-line botanical-line--petiole" d="M120 306C106 294 93 278 78 261M121 245C138 230 153 220 170 214M124 178C112 167 102 158 91 150M136 108C145 102 153 98 161 95M153 49C159 52 164 55 169 58" />
          <path class="botanical-leaf" d="M78 261C55 239 31 230 14 234C24 264 47 278 78 261Z" />
          <path class="botanical-leaf" d="M170 214C189 207 209 209 226 218C209 241 188 245 170 214Z" />
          <path class="botanical-leaf" d="M91 150C72 136 52 133 36 140C51 163 70 168 91 150Z" />
          <path class="botanical-leaf" d="M161 95C178 84 196 83 211 90C196 109 179 113 161 95Z" />
          <circle class="botanical-seed" cx="157" cy="34" r="7" />
          <circle class="botanical-seed" cx="171" cy="59" r="4" />
        </svg>
        <svg class="botanical-stem botanical-stem--secondary botanical-stem--minimal" viewBox="0 0 170 270" fill="none">
          <path class="botanical-line botanical-line--trunk" d="M82 264C83 202 94 137 124 43" />
          <path class="botanical-line botanical-line--petiole" d="M91 199C80 189 69 181 57 175M103 149C115 138 126 130 138 126M116 94C108 87 100 82 92 79" />
          <path class="botanical-leaf" d="M57 175C39 162 21 159 8 165C22 185 39 190 57 175Z" />
          <path class="botanical-leaf" d="M138 126C151 119 162 120 168 124C158 139 148 141 138 126Z" />
          <path class="botanical-leaf" d="M92 79C79 69 65 67 53 72C64 88 78 92 92 79Z" />
        </svg>
      </template>

      <svg v-else-if="variantId === 'oriental-editorial'" class="botanical-stem botanical-stem--primary botanical-stem--editorial" viewBox="0 0 240 420" fill="none">
        <path class="botanical-line botanical-line--trunk" d="M104 406C105 336 112 270 126 207C138 150 149 96 154 37" />
        <path class="botanical-line botanical-line--petiole" d="M108 326L75 294M116 271L151 242M127 203L91 171M140 142L173 117M150 77L129 60" />
        <path class="botanical-leaf botanical-leaf--pressed" d="M75 294C57 276 35 270 18 275C29 298 49 307 75 294Z" />
        <path class="botanical-leaf botanical-leaf--pressed" d="M151 242C171 226 194 222 215 230C198 254 175 260 151 242Z" />
        <path class="botanical-leaf botanical-leaf--pressed" d="M91 171C72 151 51 145 32 150C44 176 65 184 91 171Z" />
        <path class="botanical-leaf botanical-leaf--pressed" d="M173 117C190 102 207 98 224 104C211 126 193 131 173 117Z" />
        <path class="botanical-leaf botanical-leaf--pressed" d="M129 60C116 48 101 45 88 50C99 66 113 71 129 60Z" />
        <path class="botanical-label-line" d="M16 340H72M16 350H55" />
      </svg>

      <svg v-else class="botanical-stem botanical-stem--primary botanical-stem--future" viewBox="0 0 240 420" fill="none">
        <path class="botanical-line botanical-line--trunk" d="M117 405C119 338 115 276 120 216C125 151 138 91 157 35" />
        <path class="botanical-line botanical-line--petiole" d="M119 310L83 276M119 254L157 226M125 190L94 160M139 119L172 96" />
        <path class="botanical-leaf botanical-leaf--signal" d="M83 276C58 251 34 245 15 252C30 280 53 287 83 276Z" />
        <path class="botanical-leaf botanical-leaf--signal" d="M157 226C179 210 202 208 224 218C205 244 181 247 157 226Z" />
        <path class="botanical-leaf botanical-leaf--signal" d="M94 160C75 140 54 135 37 142C50 166 70 174 94 160Z" />
        <path class="botanical-leaf botanical-leaf--signal" d="M172 96C190 82 208 80 224 88C210 109 190 113 172 96Z" />
        <circle class="botanical-node" cx="119" cy="310" r="3" />
        <circle class="botanical-node" cx="120" cy="254" r="3" />
        <circle class="botanical-node" cx="125" cy="190" r="3" />
        <circle class="botanical-node" cx="139" cy="119" r="3" />
      </svg>
      <span class="botanical-section"></span>
      <span class="botanical-grain botanical-grain--one"></span>
      <span class="botanical-grain botanical-grain--two"></span>
      <span class="botanical-grain botanical-grain--three"></span>
    </div>

    <div class="optical-field" aria-hidden="true">
      <span class="optical-field__wash"></span>
      <span class="optical-field__lens optical-field__lens--one"></span>
      <span class="optical-field__lens optical-field__lens--two"></span>
      <svg class="optical-field__orbit" viewBox="0 0 640 640" fill="none">
        <ellipse cx="320" cy="320" rx="238" ry="124" />
        <ellipse cx="320" cy="320" rx="177" ry="260" />
        <path d="M74 357c83 37 167 54 252 50 93-5 173-33 240-84" />
        <circle cx="504" cy="239" r="5" />
      </svg>
      <span class="optical-field__datum optical-field__datum--x"></span>
      <span class="optical-field__datum optical-field__datum--y"></span>
    </div>

    <div class="product-sculpture" aria-hidden="true">
      <template v-if="productKind === 'tablet'">
        <div class="blister-object">
          <span v-for="cell in 8" :key="cell"><i></i></span>
        </div>
        <div class="pack-object pack-object--tablet">
          <span class="pack-object__edge"></span>
          <span class="pack-object__brand">TINA</span>
          <span class="pack-object__series">BOTANICAL SPECIMEN / {{ sampleCode }}</span>
          <strong>{{ shortName }}</strong>
          <span class="pack-object__generic">{{ medicine.generic_name }}</span>
          <span class="pack-object__rule"></span>
          <span class="pack-object__spec">{{ medicine.specification }}</span>
          <span class="pack-object__demo">SYNTHETIC · NOT FOR USE</span>
        </div>
        <div class="tablet-loose tablet-loose--one"></div>
        <div class="tablet-loose tablet-loose--two"></div>
      </template>

      <template v-else-if="productKind === 'capsule'">
        <div class="bottle-object">
          <span class="bottle-object__cap"></span>
          <span class="bottle-object__glass"></span>
          <span class="bottle-object__label">
            <i>TINA / {{ sampleCode }}</i>
            <strong>{{ shortName }}</strong>
            <small>{{ medicine.specification }}</small>
          </span>
          <span class="capsule capsule--a"></span>
          <span class="capsule capsule--b"></span>
          <span class="capsule capsule--c"></span>
        </div>
        <div class="pack-object pack-object--capsule">
          <span class="pack-object__edge"></span>
          <span class="pack-object__brand">TINA</span>
          <span class="pack-object__series">HERBAL OBJECT / {{ sampleCode }}</span>
          <strong>{{ shortName }}</strong>
          <span class="pack-object__generic">{{ medicine.generic_name }}</span>
          <span class="pack-object__rule"></span>
          <span class="pack-object__demo">SYNTHETIC · NOT FOR USE</span>
        </div>
        <div class="capsule-loose capsule-loose--one"></div>
        <div class="capsule-loose capsule-loose--two"></div>
      </template>

      <template v-else>
        <div class="pack-object pack-object--granule">
          <span class="pack-object__edge"></span>
          <span class="pack-object__brand">TINA</span>
          <span class="pack-object__series">BOTANICAL FUTURE / {{ sampleCode }}</span>
          <strong>{{ shortName }}</strong>
          <span class="pack-object__generic">{{ medicine.generic_name }}</span>
          <span class="pack-object__rule"></span>
          <span class="pack-object__spec">{{ medicine.specification }}</span>
          <span class="pack-object__demo">SYNTHETIC · NOT FOR USE</span>
        </div>
        <div class="sachet-stack">
          <span class="sachet sachet--one"><i>TINA / 01</i></span>
          <span class="sachet sachet--two"><i>TINA / 02</i></span>
          <span class="sachet sachet--three"><i>TINA / 03</i></span>
        </div>
        <div class="granule-drift">
          <span v-for="grain in 9" :key="grain"></span>
        </div>
      </template>
    </div>

    <figcaption>
      <span>BOTANICAL SAMPLE · {{ sampleCode }}</span>
      <span>原创草本视觉 / 非真实包装</span>
    </figcaption>
  </figure>
</template>
