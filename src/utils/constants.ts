/**
 * Constants for token estimation across different services
 */
export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 4,
  COMPLETION_RATIO: {
    DOCUMENT_PROCESSING: 0.2,
    TRAINING_DOCUMENT: 0.3,
    DATE_EXTRACTION: 0.3,
    RECEIPT_OCR: 0.25
  },
  IMAGE_BYTES_PER_TOKEN: 1000 // Rough approximation for image data
};

/**
 * Default model to use for AI operations
 */
export const DEFAULT_MODEL = 'gpt-4';

/**
 * API base URL from environment with fallback
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  CLIENT_FILES: 'client-files',
  TRAINING_DOCUMENTS: 'training-documents',
  MAINTENANCE_RECEIPTS: 'maintenance-receipts'
};

/**
 * Common file status values
 */
export const FILE_STATUS = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  PROCESSING_FAILED: 'processing_failed',
  ERROR: 'error',
  COMPLETE: 'complete'
};

/**
 * Common service names for token tracking
 */
export const SERVICE_NAMES = {
  DOCUMENT_PROCESSING: 'document_processing',
  TRAINING_DOCUMENT: 'training_document_processing',
  DATE_EXTRACTION: 'date_extraction',
  RECEIPT_OCR: 'receipt_ocr'
}; 