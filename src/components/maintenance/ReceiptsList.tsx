import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fromReceipts, fromReceiptItems, ReceiptRecord, ReceiptItemRecord } from '@/utils/supabase-utils';
import { api } from '@/api/apiClient';

interface Receipt {
  id: string;
  client_id: string;
  date: string;
  store_name: string;
  total_amount: number;
  receipt_url: string;
  items: ReceiptItem[];
  created_at: string;
}

interface ReceiptItem {
  id: string;
  receipt_id: string;
  description: string;
  category: string;
  amount: number;
  quantity?: number;
}

interface ReceiptsListProps {
  clientId: string;
  onAddExpense?: (expense: any) => void;
  showAddToExpenses?: boolean;
}

export function ReceiptsList({ clientId, onAddExpense, showAddToExpenses = true }: ReceiptsListProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const [useTablesDefined, setTablesNotDefined] = useState(true);

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!clientId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to fetch receipts from the database
        try {
          const { data: receiptData, error: receiptError } = await fromReceipts()
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: false });
            
          if (receiptError) {
            // Check if the error is due to the table not existing
            if (receiptError.message.includes('does not exist')) {
              console.warn('Receipts table does not exist yet, using demo data');
              setTablesNotDefined(false);
              throw new Error('Tables not defined');
            } else {
              throw receiptError;
            }
          }
          
          if (receiptData && receiptData.length > 0) {
            // Fetch items for each receipt
            const receiptsWithItems: Receipt[] = await Promise.all(
              receiptData.map(async (receipt: ReceiptRecord) => {
                try {
                  // Use the typed helper function for receipt items
                  const { data: itemsData, error: itemsError } = await fromReceiptItems()
                    .select('*')
                    .eq('receipt_id', receipt.id);
                    
                  if (itemsError) {
                    console.error(`Error fetching items for receipt ${receipt.id}:`, itemsError);
                    return {
                      ...receipt,
                      items: []
                    };
                  }
                  
                  return {
                    ...receipt,
                    items: itemsData || []
                  };
                } catch (itemError) {
                  console.error(`Error processing items for receipt ${receipt.id}:`, itemError);
                  return {
                    ...receipt,
                    items: []
                  };
                }
              })
            );
            
            setReceipts(receiptsWithItems);
          } else {
            // No receipts found in the database
            setReceipts([]);
          }
        } catch (dbError) {
          console.warn('Error fetching from database, falling back to API:', dbError);
          
          // Try the API as a fallback (if implemented)
          try {
            const response = await api.getClientReceipts(clientId);
            if (response && response.receipts && response.receipts.length > 0) {
              setReceipts(response.receipts);
            } else {
              setReceipts([]);
            }
          } catch (apiError) {
            console.warn('API fallback also failed, using empty array:', apiError);
            setReceipts([]);
          }
        }
      } catch (err) {
        console.error('Error fetching receipts:', err);
        setError('Failed to load receipts');
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceipts();
  }, [clientId]);
  
  const toggleReceiptExpand = (receiptId: string) => {
    if (expandedReceipt === receiptId) {
      setExpandedReceipt(null);
    } else {
      setExpandedReceipt(receiptId);
    }
  };
  
  const handleAddToExpenses = async (item: ReceiptItem, receiptId: string) => {
    if (onAddExpense) {
      try {
        // If we have a real receipt ID and tables exist, call the API to add to expenses
        if (receiptId && receiptId.indexOf('demo') === -1 && useTablesDefined) {
          await api.addReceiptToExpenses(clientId, receiptId, [item]);
        }
        
        // Call the callback to update UI
        onAddExpense({
          description: item.description,
          amount: item.amount,
          category: item.category
        });
      } catch (error) {
        console.error('Error adding item to expenses:', error);
        // Still call the callback even if API fails
        onAddExpense({
          description: item.description,
          amount: item.amount,
          category: item.category
        });
      }
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };
  
  const getCategoryBadgeColor = (category: string) => {
    const categories: Record<string, string> = {
      'groceries': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'dining': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'transport': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'utilities': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'housing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'medical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'education': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'shopping': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'entertainment': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      'childcare': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    
    return categories[category.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  // For demo purposes, let's add some sample data if no receipts are available
  const demoReceipts: Receipt[] = loading || receipts.length > 0 ? [] : [
    {
      id: 'demo-1',
      client_id: clientId,
      date: '2025-03-20',
      store_name: 'PnP Express',
      total_amount: 456.78,
      receipt_url: 'https://placehold.co/400x600/png',
      items: [
        { id: 'item-1', receipt_id: 'demo-1', description: 'Groceries', category: 'groceries', amount: 340.50 },
        { id: 'item-2', receipt_id: 'demo-1', description: 'School supplies', category: 'education', amount: 116.28 }
      ],
      created_at: '2025-03-20T14:30:00Z'
    },
    {
      id: 'demo-2',
      client_id: clientId,
      date: '2025-03-15',
      store_name: 'Dischem',
      total_amount: 321.45,
      receipt_url: 'https://placehold.co/400x600/png',
      items: [
        { id: 'item-3', receipt_id: 'demo-2', description: 'Medication', category: 'medical', amount: 245.99 },
        { id: 'item-4', receipt_id: 'demo-2', description: 'Toiletries', category: 'groceries', amount: 75.46 }
      ],
      created_at: '2025-03-15T11:15:00Z'
    }
  ];
  
  const displayReceipts = receipts.length > 0 ? receipts : demoReceipts;
  
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayReceipts.length > 0 ? (
              displayReceipts.map((receipt) => (
                <>
                  <TableRow key={receipt.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleReceiptExpand(receipt.id)}>
                      {new Date(receipt.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={() => toggleReceiptExpand(receipt.id)}>
                      {receipt.store_name}
                    </TableCell>
                    <TableCell onClick={() => toggleReceiptExpand(receipt.id)}>
                      {formatCurrency(receipt.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedReceiptImage(receipt.receipt_url)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleReceiptExpand(receipt.id)}
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${expandedReceipt === receipt.id ? 'transform rotate-180' : ''}`} 
                        />
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {expandedReceipt === receipt.id && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={5} className="p-4">
                        <div className="space-y-4">
                          <h4 className="font-medium">Items</h4>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Amount</TableHead>
                                  {showAddToExpenses && <TableHead></TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {receipt.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>
                                      <Badge className={getCategoryBadgeColor(item.category)}>
                                        {item.category}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                                    {showAddToExpenses && (
                                      <TableCell>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleAddToExpenses(item, receipt.id)}
                                        >
                                          Add to Expenses
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <p className="text-muted-foreground mb-2">No receipts have been scanned yet</p>
                  <p className="text-sm text-muted-foreground">
                    Use the mobile app to scan receipts or upload them directly
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Receipt Image Viewer Dialog */}
      <Dialog open={!!selectedReceiptImage} onOpenChange={(open) => !open && setSelectedReceiptImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Receipt Image</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(selectedReceiptImage || '', '_blank')}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open Full Size
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            {selectedReceiptImage && (
              <img 
                src={selectedReceiptImage} 
                alt="Receipt" 
                className="max-h-[70vh] max-w-full object-contain rounded-md" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 