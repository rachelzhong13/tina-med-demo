import rawConfig from "./exhibit-ui.json";

export const VARIANT_IDS = ["clinical", "companion", "editorial"] as const;

export type VariantId = (typeof VARIANT_IDS)[number];

export type MedicineField =
  | "generic_name"
  | "manufacturer"
  | "approval_number"
  | "barcode"
  | "category"
  | "dosage_form"
  | "specification"
  | "package_description"
  | "appearance"
  | "storage"
  | "indications"
  | "usage"
  | "contraindications"
  | "warnings"
  | "description"
  | "source";

export type SectionPresentation =
  | "fact-grid"
  | "feature"
  | "care"
  | "steps"
  | "warning"
  | "story"
  | "metadata";

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
  name: string;
  label: string;
  description: string;
  assistant: {
    mode: "supporting" | "character" | "editorial-mark";
    greeting: string;
  };
  hero: {
    leadField: MedicineField;
    factFields: MedicineField[];
    visual: "precision-pack" | "care-object" | "label-study";
  };
  sections: ExhibitSection[];
}

interface ExhibitConfig {
  version: 1;
  defaultVariant: VariantId;
  medicines: Record<
    string,
    { defaultVariant: VariantId; availableVariants: VariantId[] }
  >;
  variants: Record<VariantId, ExhibitVariant>;
}

export const exhibitConfig = rawConfig as ExhibitConfig;

export const fieldLabels: Record<MedicineField, string> = {
  generic_name: "样品定义",
  manufacturer: "设计生产方",
  approval_number: "演示识别号",
  barcode: "演示条码",
  category: "样品分类",
  dosage_form: "剂型设定",
  specification: "规格",
  package_description: "包装设定",
  appearance: "外观设定",
  storage: "保存方式",
  indications: "适用场景（模拟）",
  usage: "使用方式（模拟）",
  contraindications: "不适用情形",
  warnings: "安全边界",
  description: "设计说明",
  source: "资料来源",
};

export function isVariantId(value: unknown): value is VariantId {
  return typeof value === "string" && VARIANT_IDS.includes(value as VariantId);
}

export function resolveVariantId(
  medicineId: string | undefined,
  requested: unknown,
): VariantId {
  const medicineConfig = medicineId
    ? exhibitConfig.medicines[medicineId]
    : undefined;

  if (
    isVariantId(requested) &&
    (!medicineConfig || medicineConfig.availableVariants.includes(requested))
  ) {
    return requested;
  }

  return medicineConfig?.defaultVariant || exhibitConfig.defaultVariant;
}

export function getVisibleSections(variant: ExhibitVariant) {
  return [...variant.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order || b.priority - a.priority);
}
