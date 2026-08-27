export interface MedicineSummary {
  id: string;
  slug: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  source: string;
}

export interface Medicine extends MedicineSummary {
  approval_number: string;
  barcode: string;
  dosage_form: string;
  specification: string;
  package_description: string;
  appearance: string;
  storage: string;
  indications: string;
  usage: string;
  contraindications: string;
  warnings: string;
  description: string;
  image_url: string;
  qr_target_url: string;
  demo_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatHistory {
  session_id: string;
  medicine_id: string;
  messages: ChatMessage[];
}

export interface SessionResponse {
  session_id: string;
  medicine_id: string;
  created_at: string;
  updated_at: string;
}
