/**
 * Types for the Receipt Scanner module
 */

export interface Receipt {
  id: string;
  client_id: string;
  date: string;
  store_name: string;
  total_amount: number;
  receipt_url: string;
  items: ReceiptItem[];
  created_at: string;
  status?: 'processed' | 'pending' | 'error';
  processing_time?: number;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  description: string;
  category: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  tax?: number;
  is_child_expense?: boolean;
}

export interface ReceiptScanResult {
  success: boolean;
  receipt?: Receipt;
  error?: string;
  processing_time?: number;
}

export interface ReceiptCategory {
  id: string;
  name: string;
  description?: string;
  is_child_related: boolean;
  color: string;
}

export interface ExpenseReport {
  id: string;
  client_id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  receipt_count: number;
  categories: {
    [category: string]: number;
  };
  download_url?: string;
} 