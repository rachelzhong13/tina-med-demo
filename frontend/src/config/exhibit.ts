import rawConfig from "./exhibit-ui.json";

export type MedicineField =
  | "generic_name" | "manufacturer" | "approval_number" | "barcode"
  | "category" | "dosage_form" | "specification" | "package_description"
  | "appearance" | "storage" | "indications" | "usage"
  | "contraindications" | "warnings" | "description" | "source";

export type VariantId =
  | "botanical-minimal"
  | "oriental-editorial"
  | "botanical-future";

export type SectionPresentation =
  | "botanical-prose" | "herbarium-story" | "quiet-usage"
  | "specimen-ledger" | "safety-note" | "editorial-index"
  | "catalogue-story" | "catalogue-grid" | "vertical-usage"
  | "cinnabar-safety" | "luminous-lead" | "orbit-usage"
  | "glass-safety" | "translucent-story" | "optical-ledger" | "archive";

export interface ExhibitSection {
  id: string;
  label: string;
  visible: boolean;
  priority: number;
  order: number;
  presentation: SectionPresentation;
  interactionRole: "read" | "progressive" | "assistant-context";
  fields: MedicineField[];
}

export interface ExhibitVariant {
  id: VariantId;
  name: string;
  label: string;
  description: string;
  assistant: {
    mode: "botanical-guide" | "editorial-guide" | "future-guide";
    greeting: string;
  };
  hero: {
    leadField: MedicineField;
    factFields: MedicineField[];
    visual: "botanical-specimen" | "editorial-herbarium" | "botanical-optical";
  };
  sections: ExhibitSection[];
}

interface ExhibitConfig {
  version: 3;
  defaultVariantByMedicine: Record<string, VariantId>;
  variants: Record<VariantId, ExhibitVariant>;
}

export const exhibitConfig = rawConfig as ExhibitConfig;
export const variantIds = Object.keys(exhibitConfig.variants) as VariantId[];

export const fieldLabels: Record<MedicineField, string> = {
  generic_name: "样品定义", manufacturer: "设计生产方",
  approval_number: "演示识别号", barcode: "演示条码",
  category: "样品分类", dosage_form: "剂型设定", specification: "规格",
  package_description: "包装设定", appearance: "外观设定",
  storage: "保存方式", indications: "适用场景（模拟）",
  usage: "使用方式（模拟）", contraindications: "不适用情形",
  warnings: "安全边界", description: "设计说明", source: "资料来源",
};

export function resolveVariantId(medicineId?: string, requested?: unknown): VariantId {
  const queryVariant = Array.isArray(requested) ? requested[0] : requested;
  if (typeof queryVariant === "string" && variantIds.includes(queryVariant as VariantId)) {
    return queryVariant as VariantId;
  }
  return exhibitConfig.defaultVariantByMedicine[medicineId || ""] || "botanical-minimal";
}

export function getVisibleSections(variant: ExhibitVariant) {
  return [...variant.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order || b.priority - a.priority);
}
