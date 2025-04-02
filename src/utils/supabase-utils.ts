/**
 * Utility functions for handling Supabase type issues
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Type assertion function for Supabase tables that aren't in the Database type definition
 * This allows for type-safe queries to tables that exist in the database but not in the TypeScript definitions
 * 
 * @param tableName The name of the table to query
 * @returns A supabase query builder with proper typing
 */
export function fromTable<T = any>(tableName: string) {
  // Type assertion to allow querying tables not in the Database type
  return supabase.from(tableName) as unknown as ReturnType<typeof supabase.from<T>>;
}

/**
 * Typed interface for the receipts table
 */
export interface ReceiptRecord {
  id: string;
  client_id: string;
  date: string;
  store_name: string;
  total_amount: number;
  receipt_url: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  metadata?: Record<string, any>;
}

/**
 * Typed interface for the receipt_items table
 */
export interface ReceiptItemRecord {
  id: string;
  receipt_id: string;
  description: string;
  category: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  created_at: string;
  is_child_expense?: boolean;
}

/**
 * Helper function to query the receipts table with proper typing
 */
export function fromReceipts() {
  return fromTable<ReceiptRecord>('receipts');
}

/**
 * Helper function to query the receipt_items table with proper typing
 */
export function fromReceiptItems() {
  return fromTable<ReceiptItemRecord>('receipt_items');
}

/**
 * Type-safe storage bucket access
 * Useful when the storage bucket isn't defined in the types
 * 
 * @param bucketName Name of the storage bucket
 * @returns Storage bucket interface
 */
export function fromBucket(bucketName: string) {
  return supabase.storage.from(bucketName);
} 