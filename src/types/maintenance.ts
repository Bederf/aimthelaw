/**
 * Maintenance calculation types
 */

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'credit' | 'debit';
  reference?: string;
  balance?: number;
  document_id?: string;
  metadata?: {
    reasoning?: string;
    sub_category?: string;
    frequency?: string;
    recipient_type?: string;
    is_maintenance_relevant?: boolean;
    confidence?: string;
    [key: string]: any;
  };
}

export interface MaintenanceData {
  grossSalary: number;
  otherIncome: number;
  totalIncome: number;
  housing: number;
  groceries: number;
  transport: number;
  medical: number;
  education: number;
  utilities: number;
  insurance: number;
  debtRepayments: number;
  otherExpenses: number;
  totalExpenses: number;
  savingsInvestments: number;
  bankBalance: number;
  childCareExpenses?: number;
  maintenanceRelevantExpenses?: number;
}

export interface MaintenanceResponse {
  success: boolean;
  message: string;
  transactions: Transaction[];
  maintenance_data: MaintenanceData;
  elapsed_time_sec?: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  count: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  percentage: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  categories: CategoryTotal[];
}

export interface MaintenanceCalculationResult {
  transactions: Transaction[];
  maintenance_data: MaintenanceData;
  document_ids: string[];
  processing_metrics?: {
    total_documents: number;
    processed_pages: number;
    extracted_transactions: number;
    processing_time_ms: number;
  };
} 