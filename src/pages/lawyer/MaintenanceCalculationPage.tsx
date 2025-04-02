import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Banknote, Calculator, Loader2, PiggyBank, Upload, Download, ChevronDown, CheckCircle2, Info, RefreshCw, FileText } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialDocumentUpload } from '@/components/maintenance';
import { Transaction, MaintenanceData } from '@/types/maintenance';
import { ClientFile } from '@/types/api-types';
import { api } from '@/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';

// Add these constants at the top of the file, after imports
const STORAGE_KEY_MAINTENANCE = 'maintenance_data';
const STORAGE_KEY_TRANSACTIONS = 'maintenance_transactions';

// MNT Form PDF Preview Component
const MNTFormPDF = ({ data }: { data: MaintenanceData }) => (
  <div className="p-6 bg-card shadow-sm rounded-lg text-card-foreground">
    <h2 className="text-xl font-semibold mb-6">Maintenance Form A Preview</h2>
    
    <p className="text-muted-foreground mb-8">
      This is a preview of the MNT Form A. Download the full form to access the template.
    </p>
    
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Income Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Gross Salary/Wages:</span>
              <span className="font-medium">R{(data.grossSalary || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Income:</span>
              <span className="font-medium">R{(data.otherIncome || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t mt-2">
              <span>Total Income:</span>
              <span>R{(data.totalIncome || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Expenses Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Housing:</span>
              <span>R{(data.housing || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Utilities:</span>
              <span>R{(data.utilities || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses:</span>
              <span>R{(data.totalExpenses || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <hr />
      
      <div>
        <h3 className="text-lg font-medium mb-2">Available for Maintenance</h3>
        <div className="flex justify-between text-lg font-bold">
          <span>Net Position:</span>
          <span className={`${(data.totalIncome || 0) - (data.totalExpenses || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            R{((data.totalIncome || 0) - (data.totalExpenses || 0)).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
        <p className="text-amber-800">
          <strong>Note:</strong> When you download the form, you'll receive the official MNT Form A template. 
          Fill in the values displayed above in the corresponding sections of the form.
        </p>
      </div>
    </div>
  </div>
);

// Transaction Table Component
const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  const toggleRow = (rowId: string) => {
    if (expandedRow === rowId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(rowId);
    }
  };
  
  // Check if any transactions are synthetic
  const hasSyntheticTransactions = transactions.some(
    transaction => transaction.metadata?.is_synthetic === true
  );
  
  return (
    <div className="border rounded-md">
      {hasSyntheticTransactions && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Demo Data Warning</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>Some or all of the transactions shown below are <strong>synthetic demo data</strong> and not actual transactions from your financial documents. This may happen when:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>The PDF could not be properly processed due to formatting or security settings</li>
                  <li>The OCR extraction failed to extract meaningful text from the document</li>
                  <li>The document was not recognized as a bank statement or financial document</li>
                </ul>
                <p className="mt-1">For more accurate results, try uploading a different format like CSV or an exported statement directly from your banking portal.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Relevance</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => {
              const rowId = transaction.id || `transaction-${index}`;
              const isExpanded = expandedRow === rowId;
              const isRelevant = transaction.metadata?.is_maintenance_relevant;
              const isSynthetic = transaction.metadata?.is_synthetic === true;
              
              return (
                <React.Fragment key={rowId}>
                  <TableRow className={`cursor-pointer hover:bg-muted/50 ${isSynthetic ? 'bg-amber-50/40' : ''}`} onClick={() => toggleRow(rowId)}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>
                      {isSynthetic && (
                        <span className="inline-flex items-center mr-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Demo
                        </span>
                      )}
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-muted">
                        {transaction.category}
                        {transaction.metadata?.sub_category && 
                          <span className="text-muted-foreground"> / {transaction.metadata.sub_category}</span>
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right">R{transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        transaction.type === 'credit' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {transaction.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isRelevant && (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Maintenance Relevant
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && transaction.metadata && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={7} className="p-4">
                        <div className="space-y-2">
                          {isSynthetic && transaction.metadata.warning_message && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm mb-2">
                              <strong>Warning:</strong> {transaction.metadata.warning_message}
                            </div>
                          )}
                        
                          {transaction.metadata.reasoning && (
                            <div>
                              <strong className="text-sm">Analysis:</strong>
                              <p className="text-sm text-muted-foreground">{transaction.metadata.reasoning}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {transaction.metadata.frequency && (
                              <div>
                                <strong className="text-xs">Frequency:</strong>
                                <p className="text-xs text-muted-foreground">{transaction.metadata.frequency}</p>
                              </div>
                            )}
                            
                            {transaction.metadata.recipient_type && (
                              <div>
                                <strong className="text-xs">Recipient Type:</strong>
                                <p className="text-xs text-muted-foreground">{transaction.metadata.recipient_type}</p>
                              </div>
                            )}
                            
                            {transaction.metadata.confidence && (
                              <div>
                                <strong className="text-xs">Confidence:</strong>
                                <p className="text-xs text-muted-foreground">{transaction.metadata.confidence}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                No transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// Add this component right after the imports at the top
const PdfProcessingHints = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
    <h3 className="text-base font-medium text-blue-800 mb-2">Processing PDF Bank Statements</h3>
    <p className="text-sm text-blue-700 mb-2">
      PDF processing may have limited accuracy depending on the file format. For best results:
    </p>
    <ul className="list-disc pl-5 text-sm text-blue-700">
      <li>Use CSV exports from your banking app if available</li>
      <li>Ensure PDFs are text-based, not scanned images</li>
      <li>Try multiple statements to increase data accuracy</li>
      <li>Manually adjust values if needed for more accurate calculations</li>
    </ul>
  </div>
);

// Expense Breakdown Component
const ExpenseBreakdown = ({ maintenanceData }: { maintenanceData: MaintenanceData }) => {
  // Calculate percentages for the expense breakdown
  const totalExpenses = maintenanceData.totalExpenses || 0;
  
  const categories = [
    { name: 'Housing', value: maintenanceData.housing || 0 },
    { name: 'Groceries', value: maintenanceData.groceries || 0 },
    { name: 'Transport', value: maintenanceData.transport || 0 },
    { name: 'Medical', value: maintenanceData.medical || 0 },
    { name: 'Education', value: maintenanceData.education || 0 },
    { name: 'Utilities', value: maintenanceData.utilities || 0 },
    { name: 'Insurance', value: maintenanceData.insurance || 0 },
    { name: 'Debt Repayments', value: maintenanceData.debtRepayments || 0 },
    { name: 'Other Expenses', value: maintenanceData.otherExpenses || 0 },
  ];
  
  // Sort categories by value (descending)
  const sortedCategories = [...categories].sort((a, b) => b.value - a.value);
  
  return (
    <div className="bg-card shadow-md rounded-lg p-4 mt-4 text-card-foreground">
      <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Income</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Gross Salary:</span>
              <span className="font-medium">R{(maintenanceData.grossSalary || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Income:</span>
              <span className="font-medium">R{(maintenanceData.otherIncome || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
              <span>Total Income:</span>
              <span>R{(maintenanceData.totalIncome || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Expenses Breakdown</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {sortedCategories.map(category => 
              category.value > 0 ? (
                <div key={category.name} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span>{category.name}:</span>
                    <div className="ml-2 h-2 bg-muted rounded-full w-24">
                      <div 
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (category.value / totalExpenses * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  <span>R{category.value.toFixed(2)}</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
              <span>Total Expenses:</span>
              <span>R{(maintenanceData.totalExpenses || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Maintenance-Specific Information */}
      {(maintenanceData.childCareExpenses || maintenanceData.maintenanceRelevantExpenses) && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-lg font-medium mb-2">Maintenance Specific</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenanceData.childCareExpenses !== undefined && (
              <div className="flex justify-between items-center bg-yellow-900/20 text-foreground p-3 rounded-md">
                <span className="font-medium">Child-Related Expenses:</span>
                <span className="font-bold">R{maintenanceData.childCareExpenses.toFixed(2)}</span>
              </div>
            )}
            {maintenanceData.maintenanceRelevantExpenses !== undefined && (
              <div className="flex justify-between items-center bg-blue-900/20 text-foreground p-3 rounded-md">
                <span className="font-medium">Maintenance-Relevant:</span>
                <span className="font-bold">R{maintenanceData.maintenanceRelevantExpenses.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Net Position */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-lg font-bold">
          <span>Net Position (Income - Expenses):</span>
          <span className={`${(maintenanceData.totalIncome || 0) - (maintenanceData.totalExpenses || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            R{((maintenanceData.totalIncome || 0) - (maintenanceData.totalExpenses || 0)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Define a local useClient function
function useClientLocal() {
  const { clientId } = useParams<{ clientId?: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simplified implementation
    if (clientId) {
      setClient({ name: 'Client', id: clientId });
    }
    setLoading(false);
  }, [clientId]);

  return { client, loading, error, clientId };
}

// Update the ChildExpenses interface with more detailed categories
interface ChildExpenses {
  // Shared Household Expenses (proportional)
  housing: {
    rent_mortgage: number;
    utilities: number;
    maintenance: number;
    insurance: number;
  };
  
  // Direct Child Expenses
  direct: {
    clothing: number;
    food: number;
    medical: number;
    toiletries: number;
    pocket_money: number;
  };
  
  // Educational Expenses
  education: {
    school_fees: number;
    uniforms: number;
    books_stationery: number;
    extra_lessons: number;
    school_activities: number;
  };
  
  // Extracurricular & Development
  activities: {
    sports: number;
    arts_culture: number;
    hobbies: number;
    camps: number;
    entertainment: number;
  };
  
  // Transport & Travel
  transport: {
    school_transport: number;
    activity_transport: number;
    holiday_travel: number;
  };
  
  // Additional/Miscellaneous
  miscellaneous: {
    childcare: number;
    emergency_fund: number;
    other: number;
  };
}

// Update the MaintenanceFormula interface
interface MaintenanceFormula {
  totalChildExpenses: number;
  monthlyIncome: number;
  availableForMaintenance: number;
  maintenanceAmount: number;
}

// Update the MaintenanceFormulaCalculator component
const MaintenanceFormulaCalculator = ({ maintenanceData }: { maintenanceData: MaintenanceData }) => {
  const [childExpenses, setChildExpenses] = useState<ChildExpenses>({
    housing: {
      rent_mortgage: maintenanceData.housing ? maintenanceData.housing * 0.25 : 0, // Child's portion
      utilities: maintenanceData.utilities ? maintenanceData.utilities * 0.25 : 0,
      maintenance: 0,
      insurance: maintenanceData.insurance ? maintenanceData.insurance * 0.25 : 0
    },
    direct: {
      clothing: 0,
      food: maintenanceData.groceries ? maintenanceData.groceries * 0.25 : 0,
      medical: maintenanceData.medical ? maintenanceData.medical * 0.25 : 0,
      toiletries: 0,
      pocket_money: 0
    },
    education: {
      school_fees: maintenanceData.education || 0,
      uniforms: 0,
      books_stationery: 0,
      extra_lessons: 0,
      school_activities: 0
    },
    activities: {
      sports: 0,
      arts_culture: 0,
      hobbies: 0,
      camps: 0,
      entertainment: 0
    },
    transport: {
      school_transport: maintenanceData.transport ? maintenanceData.transport * 0.25 : 0,
      activity_transport: 0,
      holiday_travel: 0
    },
    miscellaneous: {
      childcare: 0,
      emergency_fund: 0,
      other: 0
    }
  });

  const [monthlyIncome, setMonthlyIncome] = useState<number>(maintenanceData.grossSalary || 0);
  const [personalExpenses, setPersonalExpenses] = useState<number>(maintenanceData.totalExpenses || 0);

  // Calculate total expenses for a category
  const calculateCategoryTotal = (category: Record<string, number>) => {
    return Object.values(category).reduce((sum, value) => sum + value, 0);
  };

  // Calculate total child expenses
  const calculateTotalChildExpenses = () => {
    const housingTotal = calculateCategoryTotal(childExpenses.housing);
    const directTotal = calculateCategoryTotal(childExpenses.direct);
    const educationTotal = calculateCategoryTotal(childExpenses.education);
    const activitiesTotal = calculateCategoryTotal(childExpenses.activities);
    const transportTotal = calculateCategoryTotal(childExpenses.transport);
    const miscTotal = calculateCategoryTotal(childExpenses.miscellaneous);

    return housingTotal + directTotal + educationTotal + activitiesTotal + transportTotal + miscTotal;
  };

  const calculateMaintenance = (): MaintenanceFormula => {
    const totalChildExpenses = calculateTotalChildExpenses();
    const availableForMaintenance = monthlyIncome - personalExpenses;
    
    // Calculate maintenance amount (typically 1/3 of available income or total child expenses, whichever is lower)
    const suggestedMaintenance = Math.min(availableForMaintenance * 0.33, totalChildExpenses);
    
    return {
      totalChildExpenses,
      monthlyIncome,
      availableForMaintenance,
      maintenanceAmount: suggestedMaintenance
    };
  };

  const formula = calculateMaintenance();

  // Helper function to render expense category inputs
  const renderExpenseCategory = (
    categoryName: string,
    category: Record<string, number>,
    path: string[]
  ) => (
    <div key={categoryName} className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground capitalize">
        {categoryName.replace(/_/g, ' ')}
      </h4>
      {Object.entries(category).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <label className="flex-1 text-sm capitalize">
            {key.replace(/_/g, ' ')}:
          </label>
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              setChildExpenses(prev => {
                const newExpenses = { ...prev };
                let target = newExpenses;
                for (let i = 0; i < path.length - 1; i++) {
                  target = target[path[i]];
                }
                target[path[path.length - 1]][key] = newValue;
                return newExpenses;
              });
            }}
            className="w-32"
          />
        </div>
      ))}
      <div className="flex justify-between text-sm font-medium pt-2">
        <span>Subtotal:</span>
        <span>R{calculateCategoryTotal(category).toFixed(2)}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-card shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Maintenance Formula Calculator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Income & Expenses</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Income (After Tax)</label>
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personal Monthly Expenses</label>
              <Input
                type="number"
                value={personalExpenses}
                onChange={(e) => setPersonalExpenses(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Available Income Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Income:</span>
              <span className="font-medium">R{monthlyIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Personal Expenses:</span>
              <span className="font-medium">R{personalExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Available for Maintenance:</span>
              <span className={formula.availableForMaintenance >= 0 ? "text-green-600" : "text-red-600"}>
                R{formula.availableForMaintenance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium mb-4">Child Expenses Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderExpenseCategory('Shared Household', childExpenses.housing, ['housing'])}
          {renderExpenseCategory('Direct Expenses', childExpenses.direct, ['direct'])}
          {renderExpenseCategory('Education', childExpenses.education, ['education'])}
          {renderExpenseCategory('Activities', childExpenses.activities, ['activities'])}
          {renderExpenseCategory('Transport', childExpenses.transport, ['transport'])}
          {renderExpenseCategory('Miscellaneous', childExpenses.miscellaneous, ['miscellaneous'])}
        </div>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-medium mb-3">Maintenance Calculation Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Total Child Expenses:</p>
            <p className="text-lg font-semibold">R{formula.totalChildExpenses.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Available for Maintenance:</p>
            <p className="text-lg font-semibold">R{formula.availableForMaintenance.toFixed(2)}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground mb-2">Suggested Monthly Maintenance:</p>
            <p className="text-2xl font-bold text-primary">R{formula.maintenanceAmount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              (Based on 33% of available income or total child expenses, whichever is lower)
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">How the Formula Works:</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-700">
            <li>Calculate total monthly child expenses across all categories</li>
            <li>Determine available income after personal expenses</li>
            <li>Calculate suggested maintenance (33% of available income or total child expenses, whichever is lower)</li>
          </ol>
          <p className="mt-2 text-sm text-blue-700">
            <strong>Note:</strong> The final maintenance amount may be adjusted by the court based on various factors including the child's needs and the paying parent's ability to pay.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function MaintenanceCalculationPage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const { client, loading: isClientLoading } = useClientLocal();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Modify the state initialization to use persisted data
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_TRANSACTIONS}_${clientId}`);
    return stored ? JSON.parse(stored) : [];
  });

  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData>(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_MAINTENANCE}_${clientId}`);
    return stored ? JSON.parse(stored) : {
      grossSalary: 0,
      otherIncome: 0,
      totalIncome: 0,
      housing: 0,
      groceries: 0,
      transport: 0,
      medical: 0,
      education: 0,
      utilities: 0,
      insurance: 0,
      debtRepayments: 0,
      otherExpenses: 0,
      totalExpenses: 0
    };
  });

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<any>({});

  // Add effect to persist data changes
  useEffect(() => {
    if (clientId && transactions.length > 0) {
      localStorage.setItem(`${STORAGE_KEY_TRANSACTIONS}_${clientId}`, JSON.stringify(transactions));
    }
  }, [transactions, clientId]);

  useEffect(() => {
    if (clientId && Object.keys(maintenanceData).length > 0) {
      localStorage.setItem(`${STORAGE_KEY_MAINTENANCE}_${clientId}`, JSON.stringify(maintenanceData));
    }
  }, [maintenanceData, clientId]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (clientId) {
        // Only clear if navigating away from maintenance page
        if (!window.location.pathname.includes('maintenance')) {
          localStorage.removeItem(`${STORAGE_KEY_TRANSACTIONS}_${clientId}`);
          localStorage.removeItem(`${STORAGE_KEY_MAINTENANCE}_${clientId}`);
        }
      }
    };
  }, [clientId]);

  // Modify the resetCalculation function to clear storage
  const resetCalculation = () => {
    setTransactions([]);
    setMaintenanceData({
      grossSalary: 0,
      otherIncome: 0,
      totalIncome: 0,
      housing: 0,
      groceries: 0,
      transport: 0,
      medical: 0,
      education: 0,
      utilities: 0,
      insurance: 0,
      debtRepayments: 0,
      otherExpenses: 0,
      totalExpenses: 0
    });
    
    if (clientId) {
      localStorage.removeItem(`${STORAGE_KEY_TRANSACTIONS}_${clientId}`);
      localStorage.removeItem(`${STORAGE_KEY_MAINTENANCE}_${clientId}`);
    }
    
    toast({
      title: "Calculation Reset",
      description: "You can now start a new maintenance calculation",
    });
  };
  
  const mapApiResponseToMaintenanceData = (apiData: any): MaintenanceData => {
    // Extract summary data
    const summary = apiData?.summary || {};
    
    // Extract income and expenses items
    const incomeItems = apiData?.income || [];
    const expenseItems = apiData?.expenses || [];
    
    // Calculate income totals
    let grossSalary = 0;
    let otherIncome = 0;
    
    incomeItems.forEach((item: any) => {
      if (item.category === 'salary') {
        grossSalary += Number(item.amount) || 0;
      } else {
        otherIncome += Number(item.amount) || 0;
      }
    });
    
    // Map expense categories
    const expenseMap: Record<string, number> = {
      housing: 0,
      groceries: 0,
      transport: 0,
      medical: 0,
      education: 0,
      utilities: 0,
      insurance: 0,
      debtRepayments: 0,
      otherExpenses: 0
    };
    
    // Categorize expenses
    expenseItems.forEach((item: any) => {
      const category = item.category?.toLowerCase();
      const amount = Number(item.amount) || 0;
      
      switch (category) {
        case 'rent':
        case 'mortgage':
        case 'housing':
        case 'accommodation':
          expenseMap.housing += amount;
          break;
        case 'groceries':
        case 'food':
          expenseMap.groceries += amount;
          break;
        case 'transport':
        case 'transportation':
        case 'travel':
          expenseMap.transport += amount;
          break;
        case 'medical':
        case 'healthcare':
        case 'health':
          expenseMap.medical += amount;
          break;
        case 'education':
        case 'school':
        case 'tuition':
          expenseMap.education += amount;
          break;
        case 'utilities':
        case 'electricity':
        case 'water':
        case 'gas':
          expenseMap.utilities += amount;
          break;
        case 'insurance':
          expenseMap.insurance += amount;
          break;
        case 'debt':
        case 'loan':
        case 'credit':
          expenseMap.debtRepayments += amount;
          break;
        default:
          expenseMap.otherExpenses += amount;
          break;
      }
    });
    
    // Calculate totals
    const totalIncome = Number(summary.total_income) || grossSalary + otherIncome;
    const totalExpenses = Number(summary.total_expenses) || 
      Object.values(expenseMap).reduce((sum, amount) => sum + amount, 0);
    
    return {
      grossSalary,
      otherIncome,
      totalIncome,
      ...expenseMap,
      totalExpenses,
      savingsInvestments: 0, // Not provided in API response
      bankBalance: 0, // Not provided in API response
      childCareExpenses: 0, // Not provided in API response
      maintenanceRelevantExpenses: 0 // Not provided in API response
    };
  };
  
  const fetchClientData = async () => {
    if (!clientId) return;
    
    try {
      // Fetch maintenance data if already available
      const maintenanceResponse = await api.getMaintenanceData(clientId);
      
      if (maintenanceResponse && maintenanceResponse.data) {
        // Check if we got an error response
        if (maintenanceResponse.data.error) {
          console.warn("Maintenance data error:", maintenanceResponse.data.error);
          toast({
            title: "Note",
            description: "Some maintenance data could not be loaded properly. You can re-process documents if needed.",
            variant: "default"
          });
        } 
        // Check if we have actual maintenance data
        else if (maintenanceResponse.data.data_available !== false && 
                Object.keys(maintenanceResponse.data).length > 0) {
          setMaintenanceData(mapApiResponseToMaintenanceData(maintenanceResponse.data));
        }
      }
      
      // Fetch transactions if available
      try {
        const transactionsResponse = await api.getClientTransactions(clientId);
        
        if (transactionsResponse && transactionsResponse.data && transactionsResponse.data.transactions) {
          setTransactions(transactionsResponse.data.transactions);
        }
      } catch (transactionError) {
        console.error("Error fetching transactions:", transactionError);
        // Don't show toast for this - just log the error
      }
      
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      toast({
        title: "Note",
        description: "Unable to load maintenance data. Please try again later.",
        variant: "default"
      });
    }
  };
  
  const handleUploadComplete = async (fileIds: string[]) => {
    try {
      if (fileIds.length === 0) {
        toast({
          title: "No Files Uploaded",
          description: "No documents were uploaded. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Upload Complete",
        description: `${fileIds.length} documents uploaded. Processing will start automatically...`,
      });
      
      // Set selected files and immediately process them
      setSelectedFiles(fileIds);
      
      // Process the documents automatically
      await processDocuments(fileIds);
    } catch (error) {
      console.error("Error handling upload completion:", error);
      toast({
        title: "Upload Error",
        description: "There was an error processing the uploaded files.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadDialogOpen(false);
    }
  };
  
  const processDocuments = async (filesToProcess?: string[]) => {
    setIsProcessing(true);
    setProcessError(null);
    
    try {
      const documentsToProcess = filesToProcess || transactions.map(tx => tx.id);
      
      if (!documentsToProcess || documentsToProcess.length === 0) {
        throw new Error("No documents selected for processing");
      }
      
      console.log(`Processing ${documentsToProcess.length} documents for client ${clientId}...`);
      
      // Use the proper API method from the api client
      const response = await api.processMaintenanceDocuments(clientId as string, documentsToProcess);
      
      if (response.data.success) {
        console.log("Documents processed successfully:", response.data);
        
        // Store processed transactions
        if (response.data.transactions && response.data.transactions.length > 0) {
          // Apply intelligent categorization to transactions
          const intelligentlyCategorizedTransactions = categorizeTransactionsIntelligently(response.data.transactions);
          
          // Format transactions to match our model
          const formattedTransactions = intelligentlyCategorizedTransactions.map((tx: any) => ({
            id: tx.id || `tx-${Math.random().toString(36).substr(2, 9)}`,
            date: tx.transaction_date || tx.date,
            description: tx.description,
            amount: Number(tx.amount),
            category: tx.category || 'uncategorized',
            type: Number(tx.amount) >= 0 ? 'credit' : 'debit',
            balance: tx.balance !== undefined ? Number(tx.balance) : undefined,
            document_id: tx.document_id,
            metadata: tx.metadata || {}
          }));
          
          // Group transactions by category for summary calculation
          const transactionsByCategory = groupTransactionsByCategory(formattedTransactions);
          console.log("Transactions grouped by category:", transactionsByCategory);
          
          // Update state with categorized transactions
          setTransactions(formattedTransactions);
          
          // Calculate maintenance data from transactions
          const calculatedMaintenanceData = calculateMaintenanceDataFromTransactions(formattedTransactions, transactionsByCategory);
          setMaintenanceData(prevData => ({
            ...prevData,
            ...calculatedMaintenanceData
          }));
          
          toast({
            title: "Success",
            description: `Processed ${formattedTransactions.length} transactions from ${documentsToProcess.length} documents`
          });
        } else {
          setTransactions([]);
          toast({
            title: "No transactions found",
            description: "The documents were processed successfully but no transactions were found"
          });
        }
      } else {
        throw new Error(response.data.message || "Failed to process documents");
      }
    } catch (error) {
      console.error("Error processing documents:", error);
      setProcessError(error instanceof Error ? error.message : "Unknown error occurred");
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process documents",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper function to intelligently categorize transactions based on description
  const categorizeTransactionsIntelligently = (transactions: any[]) => {
    return transactions.map(tx => {
      // Skip transactions that are already correctly categorized
      if (tx.category && !['other_expense', 'other_income', 'uncategorized'].includes(tx.category)) {
        return tx;
      }
      
      const description = tx.description?.toLowerCase() || '';
      const amount = Number(tx.amount);
      let category = tx.category || (amount >= 0 ? 'other_income' : 'other_expense');
      
      // Food and dining detection
      if (description.includes('mcd') || 
          description.includes('kfc') || 
          description.includes('restaurant') || 
          description.includes('cafe') || 
          description.includes('starbucks') ||
          description.includes('pub') ||
          description.includes('pantelis italian') ||
          description.includes('catering') ||
          description.includes('food')) {
        category = 'dining';
      }
      
      // Groceries detection
      else if (description.includes('spar') || 
               description.includes('pnp') || 
               description.includes('woolworths') || 
               description.includes('checkers') ||
               description.includes('west end fresh') ||
               description.includes('west wing') ||
               description.includes('food') ||
               description.includes('grocery')) {
        category = 'groceries';
      }
      
      // Transportation detection
      else if (description.includes('engen') || 
               description.includes('sasol') || 
               description.includes('total') || 
               description.includes('shell') || 
               description.includes('bp') || 
               description.includes('fuel') ||
               description.includes('uber') ||
               description.includes('bolt') ||
               description.includes('gas') ||
               description.includes('petrol')) {
        category = 'transport';
      }
      
      // Utilities detection
      else if (description.includes('vodacom') || 
               description.includes('telkom') || 
               description.includes('mtn') || 
               description.includes('airtime') || 
               description.includes('data') ||
               description.includes('internet') ||
               description.includes('water') ||
               description.includes('electricity')) {
        category = 'utilities';
      }
      
      // Housing detection
      else if (description.includes('rent') || 
               description.includes('mortgage') || 
               description.includes('bond') || 
               description.includes('property') ||
               description.includes('accommodation') ||
               description.includes('motel') ||
               description.includes('apartment')) {
        category = 'housing';
      }
      
      // Insurance detection
      else if (description.includes('insurance') || 
               description.includes('fnb insure') || 
               description.includes('naked insurance') ||
               description.includes('solidarity') ||
               description.includes('bankmedmem')) {
        category = 'insurance';
      }
      
      // Medical detection
      else if (description.includes('doctor') || 
               description.includes('pharmacy') || 
               description.includes('medic') || 
               description.includes('hospital') ||
               description.includes('clinic') ||
               description.includes('dr ad parkin') ||
               description.includes('medirite') ||
               description.includes('dischem')) {
        category = 'medical';
      }
      
      // Entertainment detection
      else if (description.includes('cinema') || 
               description.includes('movie') || 
               description.includes('netflix') || 
               description.includes('spotify') ||
               description.includes('game') ||
               description.includes('google') ||
               description.includes('microsoft') ||
               description.includes('judo') ||
               description.includes('padel') ||
               description.includes('roblox')) {
        category = 'entertainment';
      }
      
      // Education detection
      else if (description.includes('school') || 
               description.includes('college') || 
               description.includes('university') || 
               description.includes('education') ||
               description.includes('tuition') ||
               description.includes('course')) {
        category = 'education';
      }
      
      // Debt Repayments detection
      else if (description.includes('loan') || 
               description.includes('credit') || 
               description.includes('repayment') || 
               description.includes('debt') ||
               description.includes('installment') ||
               description.includes('fnb persln') ||
               description.includes('wesbank') ||
               description.includes('fnbcc')) {
        category = 'debtRepayments';
      }
      
      // Salary detection
      else if (description.includes('salary') || 
               description.includes('wage') || 
               description.includes('pay') ||
               description.includes('fnbsalary')) {
        category = 'salary';
      }
      
      // Shopping detection
      else if (description.includes('shop') || 
               description.includes('store') || 
               description.includes('mart') || 
               description.includes('edgars') ||
               description.includes('bex') ||
               description.includes('vaperite') ||
               description.includes('allbang & strumit') ||
               description.includes('smw') ||
               description.includes('magnificent paints')) {
        category = 'shopping';
      }
      
      // Account fees and interest
      else if (description.includes('fee') || 
               description.includes('charge') || 
               description.includes('interest') || 
               description.includes('monthly')) {
        category = 'bankFees';
      }
      
      return {
        ...tx,
        category
      };
    });
  };
  
  // Helper function to group transactions by category for analysis
  const groupTransactionsByCategory = (transactions: Transaction[]) => {
    return transactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
      const category = transaction.category || 'uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(transaction);
      return groups;
    }, {});
  };
  
  // Helper function to calculate maintenance data from transactions
  const calculateMaintenanceDataFromTransactions = (transactions: Transaction[], transactionsByCategory: Record<string, Transaction[]>) => {
    // Calculate income
    const grossSalary = transactionsByCategory.salary?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    
    // Calculate other income (excluding salary)
    const otherIncomeCategories = Object.keys(transactionsByCategory).filter(cat => 
      ['other_income', 'interest'].includes(cat)
    );
    const otherIncome = otherIncomeCategories.reduce((sum, category) => 
      sum + transactionsByCategory[category].reduce((catSum, tx) => catSum + Math.abs(tx.amount), 0), 0);
    
    // Total income
    const totalIncome = grossSalary + otherIncome;
    
    // Calculate expenses by category
    const housing = transactionsByCategory.housing?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const groceries = transactionsByCategory.groceries?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const transport = transactionsByCategory.transport?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const medical = transactionsByCategory.medical?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const education = transactionsByCategory.education?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const utilities = transactionsByCategory.utilities?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const insurance = transactionsByCategory.insurance?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const dining = transactionsByCategory.dining?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const entertainment = transactionsByCategory.entertainment?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const debtRepayments = transactionsByCategory.debtRepayments?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const shopping = transactionsByCategory.shopping?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    const bankFees = transactionsByCategory.bankFees?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    
    // Calculate other expenses (categories not specifically calculated above)
    const otherExpenseCategories = Object.keys(transactionsByCategory).filter(cat => 
      !['housing', 'groceries', 'transport', 'medical', 'education', 'utilities', 'insurance', 
        'dining', 'entertainment', 'debtRepayments', 'shopping', 'bankFees', 'salary', 'other_income', 'interest'].includes(cat)
    );
    const otherExpenses = otherExpenseCategories.reduce((sum, category) => 
      sum + transactionsByCategory[category].reduce((catSum, tx) => catSum + Math.abs(tx.amount), 0), 0);
    
    // Total expenses
    const totalExpenses = housing + groceries + transport + medical + education + utilities + 
                          insurance + dining + entertainment + debtRepayments + shopping + 
                          bankFees + otherExpenses;
    
    // Calculate child-related expenses (optional, if we have categories for this)
    const childCareExpenses = transactionsByCategory.childCare?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    
    return {
      grossSalary,
      otherIncome,
      totalIncome,
      housing,
      groceries,
      transport,
      medical,
      education,
      utilities,
      insurance,
      dining,
      entertainment,
      debtRepayments,
      shopping,
      bankFees,
      otherExpenses,
      totalExpenses,
      childCareExpenses,
      // Derived fields
      maintenanceRelevantExpenses: housing + groceries + utilities + insurance + medical + education,
      disposableIncome: totalIncome - totalExpenses
    };
  };
  
  const updateMaintenanceField = (field: keyof MaintenanceData, value: number) => {
    setMaintenanceData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Update derived fields with null checks
      newData.totalIncome = (newData.grossSalary || 0) + (newData.otherIncome || 0);
      newData.totalExpenses = (
        (newData.housing || 0) +
        (newData.groceries || 0) +
        (newData.transport || 0) +
        (newData.medical || 0) +
        (newData.education || 0) +
        (newData.utilities || 0) +
        (newData.insurance || 0) +
        (newData.debtRepayments || 0) +
        (newData.otherExpenses || 0)
      );
      
      return newData;
    });
  };
  
  // Download the maintenance form as PDF
  const downloadForm = async () => {
    try {
      // Check if we have maintenance data
      if (!hasMaintenanceData) {
        toast({
          title: "No Data Available",
          description: "Please process some financial documents first to generate the maintenance form.",
          variant: "destructive"
        });
        return;
      }
      
      // Prepare client information
      const tempClientId = clientId || 'no-client';
      
      // Use pre-existing template as the primary method
      console.log("Attempting to download MNT Form A template...");
      
      // Path to the saved template
      const templatePath = '/assets/templates/MNT_Form A.pdf';
      console.log("Template path:", templatePath);
      
      try {
        // Fetch the template
        console.log("Fetching template from path:", templatePath);
        const response = await fetch(templatePath);
        
        if (!response.ok) {
          console.error(`Failed to fetch template: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        
        console.log("Template fetched successfully");
        
        // Get the template as blob
        const templateBlob = await response.blob();
        console.log("Template blob created, size:", templateBlob.size, "bytes");
        
        if (templateBlob.size === 0) {
          console.error("Empty template blob received");
          throw new Error("The template file appears to be empty");
        }
        
        // Create a download link
        const downloadUrl = URL.createObjectURL(templateBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `MNT_Form_A_${tempClientId}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Append, click, and remove link
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          console.log("Download link cleaned up");
        }, 100);
        
        toast({
          title: "Template Downloaded",
          description: "The maintenance form template has been downloaded successfully. Please fill it with the calculated values."
        });
        
      } catch (error) {
        console.error("Error downloading template:", error);
        
        // Show a specific error about the template
        toast({
          title: "Template Download Failed",
          description: "Could not download the form template. Trying alternative method...",
          variant: "destructive"
        });
        
        // Fallback to API method if template fetch fails
        await downloadFormUsingApi(tempClientId);
      }
      
    } catch (error) {
      console.error("Error in downloadForm function:", error);
      toast({
        title: "Download Failed",
        description: "There was an error generating the maintenance form. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Helper function to download form using API
  const downloadFormUsingApi = async (tempClientId: string) => {
    try {
      // Download the PDF using API
      const pdfBlob = await api.downloadMaintenanceFormPDF(tempClientId, {
        includeTransactions: true,
        ...clientInfo,
        // Add essential maintenance data
        grossSalary: maintenanceData.grossSalary,
        otherIncome: maintenanceData.otherIncome,
        totalIncome: maintenanceData.totalIncome,
        housing: maintenanceData.housing,
        groceries: maintenanceData.groceries,
        transport: maintenanceData.transport,
        medical: maintenanceData.medical,
        education: maintenanceData.education,
        utilities: maintenanceData.utilities,
        insurance: maintenanceData.insurance,
        debtRepayments: maintenanceData.debtRepayments,
        otherExpenses: maintenanceData.otherExpenses,
        totalExpenses: maintenanceData.totalExpenses
      });
      
      // Create a download link
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `MNT_Form_A_${tempClientId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Complete",
        description: "The maintenance form has been downloaded successfully."
      });
    } catch (error) {
      console.error("Error using API to download form:", error);
      throw error; // Re-throw to be caught by the main function
    }
  };
  
  // Ensure all maintenanceData values have fallbacks
  const totalIncome = maintenanceData?.totalIncome ?? 0;
  const grossSalary = maintenanceData?.grossSalary ?? 0;
  const otherIncome = maintenanceData?.otherIncome ?? 0;
  const totalExpenses = maintenanceData?.totalExpenses ?? 0;
  const housing = maintenanceData?.housing ?? 0;
  const groceries = maintenanceData?.groceries ?? 0;
  const transport = maintenanceData?.transport ?? 0;
  const medical = maintenanceData?.medical ?? 0;
  const education = maintenanceData?.education ?? 0;
  const utilities = maintenanceData?.utilities ?? 0;
  const insurance = maintenanceData?.insurance ?? 0;
  const debtRepayments = maintenanceData?.debtRepayments ?? 0;
  const otherExpenses = maintenanceData?.otherExpenses ?? 0;
  
  const pageTitle = clientId ? 
    `Maintenance Calculator - ${client?.name || 'Client'}` : 
    'Maintenance Calculator';
    
  const breadcrumbItems = clientId ? 
    [
      { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
      { label: 'Clients', href: '/lawyer/clients' },
      { label: client?.name || 'Client', href: `/lawyer/clients/${clientId}` },
      { label: 'Maintenance Calculator' }
    ] : 
    [
      { label: 'Dashboard', href: `/lawyer/dashboard/${user?.id}` },
      { label: 'Maintenance Calculator' }
    ];
  
  const hasMaintenanceData = maintenanceData && Object.keys(maintenanceData).length > 0;
  const hasTransactions = transactions && transactions.length > 0;
  const shouldShowResults = hasMaintenanceData || hasTransactions;

  return (
    <Layout
      title={pageTitle}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="container max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/clients')} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Maintenance Calculator</h1>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="space-y-6">
          {/* Initial Upload Card */}
          {!shouldShowResults && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Maintenance Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <h3 className="text-xl font-semibold mb-2">Upload Financial Documents</h3>
                  <p className="text-muted-foreground mb-6">
                    Upload bank statements and payslips to calculate maintenance
                  </p>
                  
                  <FinancialDocumentUpload
                    clientId={clientId}
                    onUploadComplete={handleUploadComplete}
                    buttonText="Upload Financial Documents"
                    metadata={{
                      storage_bucket: 'maintenance-files',
                      document_type: 'maintenance'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Processing State */}
          {isProcessing && (
            <Card className="w-full">
              <CardContent className="pt-6">
                <div className="text-center p-6">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Processing Documents</h3>
                  <p className="text-muted-foreground mb-6">
                    Analyzing financial documents and extracting data...
                  </p>
                  <Progress value={60} className="w-full max-w-md mx-auto" />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Results View */}
          {!isProcessing && shouldShowResults && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="summary">Maintenance Summary</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="form">MNT Form</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-6">
                {hasMaintenanceData && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <Banknote className="w-5 h-5 mr-2 text-primary" />
                          Income Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gross Salary/Wages:</span>
                            <span className="font-medium text-foreground">R{(maintenanceData.grossSalary || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Other Income:</span>
                            <span className="font-medium text-foreground">R{(maintenanceData.otherIncome || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-3 border-t">
                            <span>Total Income:</span>
                            <span className="text-foreground">R{(maintenanceData.totalIncome || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <PiggyBank className="w-5 h-5 mr-2 text-primary" />
                          Expense Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Housing:</span>
                            <span className="text-foreground">R{(maintenanceData.housing || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Essentials:</span>
                            <span className="text-foreground">R{((maintenanceData.groceries || 0) + 
                              (maintenanceData.utilities || 0) + 
                              (maintenanceData.transport || 0)).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Other Expenses:</span>
                            <span className="text-foreground">R{(maintenanceData.otherExpenses || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-3 border-t">
                            <span>Total Expenses:</span>
                            <span className="text-foreground">R{(maintenanceData.totalExpenses || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {hasMaintenanceData && (
                      <Card className="lg:col-span-1 md:col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Disposable Income</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Income:</span>
                              <span className="text-foreground">R{(maintenanceData.totalIncome || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Expenses:</span>
                              <span className="text-foreground">R{(maintenanceData.totalExpenses || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium pt-3 border-t">
                              <span>Available for Maintenance:</span>
                              <span className="text-foreground">R{((maintenanceData.totalIncome || 0) - (maintenanceData.totalExpenses || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                {!hasMaintenanceData && !isProcessing && (
                  <Card className="w-full">
                    <CardContent className="pt-6">
                      <div className="text-center p-6">
                        <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">No Financial Data</h3>
                        <p className="text-muted-foreground mb-6">
                          No maintenance data has been calculated yet. Please upload financial documents to continue.
                        </p>
                        <FinancialDocumentUpload
                          clientId={clientId}
                          onUploadComplete={handleUploadComplete}
                          buttonText="Upload Financial Documents"
                          metadata={{
                            storage_bucket: 'maintenance-files',
                            document_type: 'maintenance'
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {hasMaintenanceData && (
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseBreakdown maintenanceData={maintenanceData} />
                    </CardContent>
                  </Card>
                )}
                
                <MaintenanceFormulaCalculator maintenanceData={maintenanceData} />
                
                <div className="flex flex-col md:flex-row gap-4">
                  <Button variant="outline" className="w-full" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Additional Documents
                  </Button>
                  
                  <Button variant="outline" className="w-full" onClick={resetCalculation}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Calculation
                  </Button>
                  
                  <Button className="w-full" disabled={!hasMaintenanceData} onClick={downloadForm}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Maintenance Form
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="transactions">
                {hasTransactions ? (
                  <TransactionTable transactions={transactions} />
                ) : (
                  <Card className="w-full">
                    <CardContent className="pt-6">
                      <div className="text-center p-6">
                        <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">No Transactions</h3>
                        <p className="text-muted-foreground mb-6">
                          No transactions have been extracted yet. Please upload financial documents to continue.
                        </p>
                        <FinancialDocumentUpload
                          clientId={clientId}
                          onUploadComplete={handleUploadComplete}
                          buttonText="Upload Financial Documents"
                          metadata={{
                            storage_bucket: 'maintenance-files',
                            document_type: 'maintenance'
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="receipts">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-primary" />
                      Captured Receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-blue-800 mb-2">Receipt Scanner</h4>
                        <p className="text-blue-700 mb-4">
                          Scan receipts to automatically extract expenses for maintenance calculations.
                          Use our mobile app to capture and process expenses on the go.
                        </p>
                        <div className="flex space-x-4">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download Mobile App
                          </Button>
                          <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Receipt Directly
                          </Button>
                        </div>
                      </div>
                      
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Receipt</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6">
                                <p className="text-muted-foreground mb-2">No receipts have been scanned yet</p>
                                <p className="text-sm text-muted-foreground">
                                  Use the mobile app to scan receipts or upload them directly
                                </p>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="form">
                {hasMaintenanceData ? (
                  <div className="space-y-6">
                    <div className="bg-card shadow-sm rounded-lg p-6">
                      <h2 className="text-xl font-semibold mb-4">MNT Form A Template</h2>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-blue-800 mb-2">How to use the template:</h4>
                        <ol className="list-decimal pl-5 space-y-1 text-blue-700">
                          <li>Click "Download Form Template" to get the official MNT Form A</li>
                          <li>Open the downloaded PDF with your preferred PDF editor</li>
                          <li>Use the financial summary below to fill in the form</li>
                          <li>Save the completed form for submission</li>
                        </ol>
                      </div>
                      
                      <MNTFormPDF data={maintenanceData} />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      <Button 
                        variant="outline" 
                        onClick={resetCalculation} 
                        className="flex-1"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        New Calculation
                      </Button>
                      
                      <Button 
                        className="flex-1" 
                        onClick={downloadForm}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Form Template
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center p-6">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">No Form Available</h3>
                        <p className="text-muted-foreground mb-6">
                          Please process financial documents first to generate the maintenance form.
                        </p>
                        <FinancialDocumentUpload
                          clientId={clientId}
                          onUploadComplete={handleUploadComplete}
                          buttonText="Upload Financial Documents"
                          metadata={{
                            storage_bucket: 'maintenance-files',
                            document_type: 'maintenance'
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Financial Documents</DialogTitle>
            <DialogDescription>
              Upload bank statements or payslips for maintenance calculation
            </DialogDescription>
          </DialogHeader>
          
          <FinancialDocumentUpload
            clientId={clientId}
            onUploadComplete={(fileIds) => {
              handleUploadComplete(fileIds);
              setUploadDialogOpen(false);
            }}
            title="Upload Financial Documents"
            description="Upload bank statements or payslips for maintenance calculation"
            metadata={{
              storage_bucket: 'maintenance-files',
              document_type: 'maintenance'
            }}
          />
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
} 