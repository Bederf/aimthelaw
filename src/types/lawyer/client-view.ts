export interface ClientFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category?: DocumentCategory;
  created_at: string;
  updated_at: string;
  lawyer_id: string;
  client_id: string;
  status: string;
  metadata?: Record<string, any>;
}

export type DocumentCategory = 
  | 'legal_documents'
  | 'financial_records'
  | 'correspondence'
  | 'evidence'
  | 'court_filings'
  | 'personal_documents'
  | 'other';

export type DocumentSubcategory = 
  | 'contracts'
  | 'agreements'
  | 'invoices'
  | 'statements'
  | 'letters'
  | 'emails'
  | 'photos'
  | 'videos'
  | 'pleadings'
  | 'motions'
  | 'identification'
  | 'certificates'
  | 'miscellaneous'; 