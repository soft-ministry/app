export type TransactionType = 'INCOME' | 'EXPENSE';

export interface FinancialTransaction {
  id: number;
  type: TransactionType;
  name: string;
  description?: string | null;
  amount: number | null;
  amountPrivate?: boolean;
  amountVisible?: boolean;
  transactionDate: string;
}

export interface TransactionRequest {
  type: TransactionType;
  name: string;
  description?: string | null;
  amount: number;
  amountPrivate?: boolean;
  transactionDate?: string | null;
}

export interface FinanceSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

export interface FinanceOverview {
  summary: FinanceSummary;
  transactions: FinancialTransaction[];
}
