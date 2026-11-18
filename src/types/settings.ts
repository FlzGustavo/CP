export interface UnifiedEntry {
  type: string; // Dynamic type from settings
  year?: string;
  generic: string;
  subgeneric: string;
  subsubgeneric?: string;
  code: string; // Clasificador completo / Código de cuenta
  description: string;
}

export interface FundingSourceMapping {
  source: string; // Reference to name in fundingSourceNames
  category: string; // Rubro
}

export interface Supplier {
  id: string;
  ruc?: string;
  dni?: string;
  name: string;
  address?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface ProgrammaticNode {
  id: string;
  parentId: string | null;
  type: 'sector' | 'pliego' | 'function' | 'program' | 'subprogram' | 'activity' | 'component' | 'finality';
  code: string;
  description: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  ruc: string;
  logo: string; // Base64 string
  web: string;
  
  // Dynamic Types (Masters)
  classifierTypes: string[];
  accountTypes: string[];
  fundingSourceNames: string[];

  // Hierarchical Data
  classifiers: UnifiedEntry[];
  accounts: UnifiedEntry[];
  fundingSources: FundingSourceMapping[]; // This stores the mapping Rubro -> Source
  suppliers: Supplier[];
  programmaticNodes: ProgrammaticNode[];

  // Legacy lists - potentially remove later
  sectors: string[];
  pliegos: string[];
  functions: string[];
  programs: string[];
  subprograms: string[];
  activities: string[];
  components: string[];
  finalities: string[];
  accountingAccounts: string[]; 
  expenseCodes: string[];
}

export const defaultSettings: CompanySettings = {
  name: 'NOMBRE DE LA EMPRESA',
  address: 'Dirección de la Empresa',
  phone: '999 999 999',
  email: 'contacto@empresa.com',
  ruc: '20123456789',
  logo: '',
  web: 'www.empresa.com',
  classifierTypes: ['INGRESOS', 'GASTOS'],
  accountTypes: ['INGRESOS', 'GASTOS', 'PRESUPUESTO', 'ORDEN'],
  fundingSourceNames: [],
  classifiers: [],
  accounts: [],
  fundingSources: [],
  suppliers: [],
  programmaticNodes: [],
  sectors: [],
  pliegos: [],
  functions: [],
  programs: [],
  subprograms: [],
  activities: [],
  components: [],
  finalities: [],
  accountingAccounts: [],
  expenseCodes: []
};
