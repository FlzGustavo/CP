export interface BudgetCode {
  sector: string;
  pliego: string;
  funcion: string;
  programa: string;
  subprograma: string;
  actividad: string;
  componente: string;
  finalidad: string;
  fuenteFinanciamiento: string;
  rubro: string;
}

export interface BudgetAccountingRow {
  id: string;
  debeCuenta: string;
  debeImporte: number;
  haberCuenta: string;
  haberImporte: number;
}

export interface FinancialAccountingRow {
  id: string;
  debeCuenta: string;
  debeImporte: number;
  haberCuenta: string;
  haberImporte: number;
}

export interface ExpenseObjectRow {
  id: string;
  codigoPartida: string;
  importeParcial: number;
}

export interface Voucher {
  id: string;
  number: string;
  date: string; // YYYY-MM-DD
  payeeName: string;
  amount: number;
  amountInWords: string;
  concept: string;
  
  budgetCode: BudgetCode;
  
  budgetAccounting: BudgetAccountingRow[];
  financialAccounting: FinancialAccountingRow[];
  expenseObjects: ExpenseObjectRow[];
  
  total: number;
  deductions: number;
  netPayable: number;
  
  paymentMethod: 'cheque' | 'efectivo';
  chequeNumber?: string;
  
  treasurerDate?: string;
  treasurerName?: string;
  
  receiverDni?: string;
  receiverRuc?: string;
  receiverDate?: string;
  
  createdAt?: string;
  createdBy?: string;
  
  status?: 'emitido' | 'pagado' | 'anulado';
  paymentDate?: string;
  paymentAmount?: number;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
}
