import React, { useState, useEffect } from 'react';
import { Voucher } from '../types/voucher';
import { Plus, Trash2, Save, ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { numberToWords } from '../utils/numberToWords';
import { CompanySettings, Supplier } from '../types/settings';
import { motion, AnimatePresence } from 'motion/react';

interface VoucherFormProps {
  initialData?: Voucher;
  onSave: (voucher: Voucher) => void;
  onCancel: () => void;
  readOnly?: boolean;
  companySettings: CompanySettings;
}

export const emptyVoucher: Voucher = {
  id: '',
  number: '',
  date: (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })(),
  payeeName: '',
  amount: 0,
  amountInWords: '',
  concept: '',
  budgetCode: {
    sector: '',
    pliego: '',
    funcion: '',
    programa: '',
    subprograma: '',
    actividad: '',
    componente: '',
    finalidad: '',
    fuenteFinanciamiento: '',
    rubro: ''
  },
  budgetAccounting: [{ id: '1', debeCuenta: '', debeImporte: 0, haberCuenta: '', haberImporte: 0 }],
  financialAccounting: [{ id: '1', debeCuenta: '', debeImporte: 0, haberCuenta: '', haberImporte: 0 }],
  expenseObjects: [{ id: '1', codigoPartida: '', importeParcial: 0 }],
  total: 0,
  deductions: 0,
  netPayable: 0,
  paymentMethod: 'cheque',
  createdAt: '',
  createdBy: ''
};

export const VoucherForm: React.FC<VoucherFormProps> = ({ initialData, onSave, onCancel, readOnly = false, companySettings }) => {
  const prepareDataForForm = (data: Voucher): Voucher => {
    const toISO = (d: string | undefined) => {
      if (!d) return '';
      // If already ISO, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      // If DD/MM/YYYY, convert to YYYY-MM-DD
      const parts = d.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return d;
    };

    return {
      ...data,
      budgetCode: data.budgetCode || {
        sector: '', pliego: '', funcion: '', programa: '', subprograma: '', actividad: '',
        componente: '', finalidad: '', fuenteFinanciamiento: '', rubro: ''
      },
      budgetAccounting: data.budgetAccounting || [],
      financialAccounting: data.financialAccounting || [],
      expenseObjects: data.expenseObjects || [],
      date: toISO(data.date),
      treasurerDate: toISO(data.treasurerDate),
      receiverDate: toISO(data.receiverDate),
      paymentDate: toISO(data.paymentDate)
    };
  };

  const [formData, setFormData] = useState<Voucher>(() => {
    if (initialData) return prepareDataForForm(initialData);
    return { 
      ...emptyVoucher, 
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
  });

  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);
  const [classifierSearchTerm, setClassifierSearchTerm] = useState('');

  const [activeAcctDropdown, setActiveAcctDropdown] = useState<{
    section: 'budgetAccounting' | 'financialAccounting';
    rowId: string;
    field: 'debeCuenta' | 'haberCuenta';
  } | null>(null);
  const [acctSearchTerm, setAcctSearchTerm] = useState('');

  useEffect(() => {
    // Auto-calculate amount in words and sync imports when total changes
    setFormData(prev => {
      const updates: Partial<Voucher> = {
        amount: prev.total,
        amountInWords: prev.total > 0 ? numberToWords(prev.total) : ''
      };

      // Auto-populate amounts in accounting and expense sections if only one row exists
      if (prev.budgetAccounting.length === 1) {
        updates.budgetAccounting = [{ 
          ...prev.budgetAccounting[0], 
          debeImporte: prev.total, 
          haberImporte: prev.total 
        }];
      }

      if (prev.financialAccounting.length === 1) {
        updates.financialAccounting = [{ 
          ...prev.financialAccounting[0], 
          debeImporte: prev.total, 
          haberImporte: prev.total 
        }];
      }

      if (prev.expenseObjects.length === 1) {
        updates.expenseObjects = [{ 
          ...prev.expenseObjects[0], 
          importeParcial: prev.total 
        }];
      }

      return { ...prev, ...updates };
    });
  }, [formData.total]);

  useEffect(() => {
    // Auto-calculate net payable
    setFormData(prev => ({ ...prev, netPayable: prev.total - prev.deductions }));
  }, [formData.total, formData.deductions]);

  const handleChange = (field: keyof Voucher, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBudgetCodeChange = (field: keyof typeof formData.budgetCode, value: string) => {
    setFormData(prev => ({
      ...prev,
      budgetCode: { ...prev.budgetCode, [field]: value }
    }));
  };

  const addRow = (section: 'budgetAccounting' | 'financialAccounting' | 'expenseObjects') => {
    const newId = crypto.randomUUID();
    if (section === 'expenseObjects') {
      setFormData(prev => ({
        ...prev,
        expenseObjects: [...prev.expenseObjects, { id: newId, codigoPartida: '', importeParcial: 0 }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: [...prev[section], { id: newId, debeCuenta: '', debeImporte: 0, haberCuenta: '', haberImporte: 0 }]
      }));
    }
  };

  const removeRow = (section: 'budgetAccounting' | 'financialAccounting' | 'expenseObjects', id: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: (prev[section] as any[]).filter((row: any) => row.id !== id)
    }));
  };

  const updateRow = (section: 'budgetAccounting' | 'financialAccounting' | 'expenseObjects', id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: (prev[section] as any[]).map((row: any) => 
        row.id === id ? { ...row, [field]: value } : row
      )
    }));
  };

  const totalExpenseObjects = formData.expenseObjects.reduce((sum, exp) => sum + (exp.importeParcial || 0), 0);
  const isExpenseValid = Math.abs(totalExpenseObjects - formData.total) < 0.01;

  const budgetAccounts = (companySettings.accounts || []).filter(a => a && a.code && a.type === 'PRESUPUESTO');
  const patrimonialAccounts = (companySettings.accounts || []).filter(a => a && a.code && (a.type === 'INGRESOS' || a.type === 'GASTOS'));

  const handleSaveWithValidation = () => {
    if (!isExpenseValid) {
      alert(`La suma de los importes en Estadística del Gasto (S/. ${totalExpenseObjects.toFixed(2)}) debe coincidir con el Total (S/. ${formData.total.toFixed(2)}).`);
      return;
    }
    onSave(formData);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6 bg-white shadow-lg rounded-xl">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {initialData ? 'Editar Comprobante' : 'Nuevo Comprobante de Pago'}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2">
            <ArrowLeft size={20} /> {readOnly ? 'Volver' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button onClick={handleSaveWithValidation} className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg flex items-center gap-2">
              <Save size={20} /> Guardar
            </button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
          <input 
            type="text" 
            value={formData.number} 
            readOnly
            className="w-full p-2 border rounded-md bg-slate-50 text-slate-600"
            placeholder="0001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
          <input 
            type="date" 
            value={formData.date} 
            onChange={e => handleChange('date', e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">RUC Institución</label>
          <input 
            type="text" 
            value="20178839927" 
            disabled
            className="w-full p-2 border rounded-md bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Registrado por</label>
          <input 
            type="text" 
            value={formData.createdBy || ''} 
            readOnly
            className="w-full p-2 border rounded-md bg-slate-50 text-slate-600"
            placeholder="Nombre del usuario"
          />
        </div>
      </div>

      {/* Payee Info */}
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre (Girado a)</label>
          <div className="relative">
            <div 
              className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer ${readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
              onClick={() => !readOnly && setShowSupplierDropdown(!showSupplierDropdown)}
            >
              <span className={formData.payeeName ? 'text-slate-800' : 'text-slate-400'}>
                {formData.payeeName || 'Seleccione un proveedor...'}
              </span>
              <ChevronDown size={18} className="text-slate-400" />
            </div>

            <AnimatePresence>
              {showSupplierDropdown && !readOnly && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="p-2 border-b bg-slate-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar por RUC o Nombre..." 
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500"
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {(companySettings.suppliers || [])
                      .filter(s => s && s.status === 'active' && (
                        String(s.name || '').toLowerCase().includes(supplierSearch.toLowerCase()) || 
                        (s.ruc && String(s.ruc).includes(supplierSearch))
                      ))
                      .map(s => (
                        <div 
                          key={s.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0"
                          onClick={() => {
                            handleChange('payeeName', s.ruc ? `${s.ruc} / ${s.name}` : s.name);
                            if (s.dni) handleChange('receiverDni', s.dni);
                            if (s.ruc) {
                              handleChange('receiverRuc', s.ruc);
                            } else {
                              handleChange('receiverRuc', '');
                            }
                            setShowSupplierDropdown(false);
                            setSupplierSearch('');
                          }}
                        >
                          <div className="text-sm font-bold text-slate-800">{s.ruc || 'SIN RUC'}</div>
                          <div className="text-xs text-slate-600 uppercase">{s.name}</div>
                        </div>
                      ))}
                    {(companySettings.suppliers || []).filter(s => s.status === 'active').length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-400 italic">No hay proveedores activos.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {showSupplierDropdown && (
            <div className="fixed inset-0 z-40" onClick={() => setShowSupplierDropdown(false)}></div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total (S/.)</label>
            <input 
              type="number" 
              value={formData.total} 
              onChange={e => handleChange('total', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border rounded-md"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Son (En letras)</label>
            <input 
              type="text" 
              value={formData.amountInWords} 
              readOnly
              className="w-full p-2 border rounded-md bg-slate-50 text-slate-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Concepto</label>
          <textarea 
            value={formData.concept} 
            onChange={e => handleChange('concept', e.target.value)}
            className="w-full p-2 border rounded-md h-24"
            placeholder="Por cancelación de..."
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Budget Code */}
      <div className="border rounded-lg p-4 bg-slate-50">
        <h3 className="font-semibold text-slate-800 mb-3">Codificación Programática</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { key: 'sector', type: 'sector', label: 'Sector' },
            { key: 'pliego', type: 'pliego', label: 'Pliego' },
            { key: 'funcion', type: 'function', label: 'Función' },
            { key: 'programa', type: 'program', label: 'Programa' },
            { key: 'subprograma', type: 'subprogram', label: 'Subprograma' },
            { key: 'actividad', type: 'activity', label: 'Actividad' },
            { key: 'componente', type: 'component', label: 'Componente' },
            { key: 'finalidad', type: 'finality', label: 'Finalidad' },
          ].map((level, idx, arr) => {
            return (
              <div key={level.key}>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">{level.label}</label>
                <select
                  value={formData.budgetCode[level.key as keyof typeof formData.budgetCode] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const updates: any = { [level.key]: val };
                    // Reset children
                    for (let i = idx + 1; i < arr.length; i++) {
                      updates[arr[i].key] = '';
                    }
                    setFormData(prev => ({
                      ...prev,
                      budgetCode: { ...prev.budgetCode, ...updates }
                    }));
                  }}
                  className="w-full p-1.5 border rounded text-sm h-[34px] bg-white"
                  disabled={readOnly}
                >
                  <option value="">Seleccione...</option>
                  {(() => {
                    // Optimized hierarchical lookup
                    let parentId: string | null = null;
                    if (idx > 0) {
                      // We must find the parent node that belongs to the current path
                      let currentPathParentId: string | null = null;
                      for (let i = 0; i < idx; i++) {
                        const prevLevel = arr[i];
                        const prevValue = formData.budgetCode[prevLevel.key as keyof typeof formData.budgetCode];
                        const node = (companySettings.programmaticNodes || []).find(n => 
                          n.type === prevLevel.type && 
                          String(n.code) === String(prevValue) && 
                          ((n.parentId || null) === (currentPathParentId || null))
                        );
                        if (!node) {
                          currentPathParentId = 'NOT_FOUND';
                          break;
                        }
                        currentPathParentId = String(node.id);
                      }
                      parentId = currentPathParentId;
                    }

                    if (idx > 0 && parentId === 'NOT_FOUND') return null;

                    return (companySettings.programmaticNodes || [])
                      .filter(n => n.type === level.type && ((n.parentId || null) === (parentId || null)))
                      .sort((a,b) => String(a.code || '').localeCompare(String(b.code || '')))
                      .map(n => (
                        <option key={n.id} value={n.code}>{n.code} - {n.description}</option>
                      ));
                  })()}
                </select>
              </div>
            );
          })}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">F. Financiamiento</label>
            <select 
              value={formData.budgetCode.fuenteFinanciamiento} 
              onChange={e => {
                const newVal = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  budgetCode: { ...prev.budgetCode, fuenteFinanciamiento: newVal, rubro: '' }
                }));
              }}
              className="w-full p-1.5 border rounded text-sm h-[34px] bg-white"
              disabled={readOnly}
            >
              <option value="">Seleccione...</option>
              {Array.from(new Set((companySettings.fundingSources || []).map(f => f.source))).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Rubro</label>
            <select 
              value={formData.budgetCode.rubro || ''} 
              onChange={e => handleBudgetCodeChange('rubro', e.target.value)}
              className="w-full p-1.5 border rounded text-sm h-[34px] bg-white"
              disabled={readOnly || !formData.budgetCode.fuenteFinanciamiento}
            >
              <option value="">Seleccione...</option>
              {(companySettings.fundingSources || [])
                .filter(f => f.source === formData.budgetCode.fuenteFinanciamiento)
                .map((f, i) => (
                  <option key={i} value={f.category}>{f.category}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Accounting Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Accounting */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-slate-800">Contabilidad Presupuestal</h3>
            {!readOnly && (
              <button onClick={() => addRow('budgetAccounting')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <Plus size={16} /> Agregar
              </button>
            )}
          </div>
          <div className="border rounded-lg overflow-visible bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Debe (Cuenta/Imp)</th>
                  <th className="p-2 text-left">Haber (Cuenta/Imp)</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {formData.budgetAccounting.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2 space-y-1 overflow-visible relative">
                      <div className="relative">
                        <div 
                          onClick={() => {
                            if (readOnly) return;
                            if (activeAcctDropdown?.rowId === row.id && activeAcctDropdown?.field === 'debeCuenta' && activeAcctDropdown?.section === 'budgetAccounting') {
                              setActiveAcctDropdown(null);
                            } else {
                              setActiveAcctDropdown({ section: 'budgetAccounting', rowId: row.id, field: 'debeCuenta' });
                              setAcctSearchTerm('');
                            }
                          }}
                          className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer text-xs ${
                            readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'
                          }`}
                        >
                          <span className={row.debeCuenta ? 'text-slate-800 font-medium truncate max-w-[150px]' : 'text-slate-400'}>
                            {row.debeCuenta 
                              ? (() => {
                                  const acct = budgetAccounts.find(a => a.code === row.debeCuenta);
                                  return acct ? `${acct.code} - ${acct.description}` : row.debeCuenta;
                                })()
                              : 'Seleccione Cuenta...'}
                          </span>
                          {!readOnly && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                        </div>

                        <AnimatePresence>
                          {activeAcctDropdown?.section === 'budgetAccounting' && 
                           activeAcctDropdown?.rowId === row.id && 
                           activeAcctDropdown?.field === 'debeCuenta' && 
                           !readOnly && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAcctDropdown(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] md:min-w-[360px] max-w-md"
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="p-2 border-b bg-slate-50 sticky top-0 z-10">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                      type="text" 
                                      placeholder="Buscar por código o descripción..." 
                                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                      value={acctSearchTerm}
                                      onChange={e => setAcctSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b select-none">
                                  <span className="col-span-4">Cuenta</span>
                                  <span className="col-span-8">Descripción</span>
                                </div>

                                <div className="max-h-52 overflow-y-auto">
                                  {(() => {
                                    const filtered = budgetAccounts
                                      .filter(a => {
                                        if (!acctSearchTerm) return true;
                                        const term = acctSearchTerm.toLowerCase();
                                        return (
                                          String(a.code || '').toLowerCase().includes(term) ||
                                          String(a.description || '').toLowerCase().includes(term)
                                        );
                                      })
                                      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron cuentas.</div>
                                      );
                                    }

                                    return filtered.map((a, idx) => {
                                      const isDisabled = !a.subgeneric || String(a.subgeneric).trim() === '';
                                      return (
                                        <div 
                                          key={`${a.type}-${a.code}-${idx}`}
                                          className={`px-3 py-2 border-b border-slate-50 last:border-b-0 text-xs grid grid-cols-12 gap-2 transition-colors ${
                                            isDisabled 
                                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none' 
                                              : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-slate-700'
                                          }`}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            updateRow('budgetAccounting', row.id, 'debeCuenta', a.code);
                                            setActiveAcctDropdown(null);
                                            setAcctSearchTerm('');
                                          }}
                                        >
                                          <span className={`col-span-4 font-mono font-semibold break-all ${isDisabled ? 'text-slate-400' : 'text-indigo-700'}`}>{a.code}</span>
                                          <span className={`col-span-8 uppercase break-words font-medium text-[11px] ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{a.description}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="number"
                        placeholder="Importe"
                        value={row.debeImporte || ''}
                        onChange={e => updateRow('budgetAccounting', row.id, 'debeImporte', parseFloat(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="p-2 space-y-1 overflow-visible relative">
                      <div className="relative">
                        <div 
                          onClick={() => {
                            if (readOnly) return;
                            if (activeAcctDropdown?.rowId === row.id && activeAcctDropdown?.field === 'haberCuenta' && activeAcctDropdown?.section === 'budgetAccounting') {
                              setActiveAcctDropdown(null);
                            } else {
                              setActiveAcctDropdown({ section: 'budgetAccounting', rowId: row.id, field: 'haberCuenta' });
                              setAcctSearchTerm('');
                            }
                          }}
                          className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer text-xs ${
                            readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'
                          }`}
                        >
                          <span className={row.haberCuenta ? 'text-slate-800 font-medium truncate max-w-[150px]' : 'text-slate-400'}>
                            {row.haberCuenta 
                              ? (() => {
                                  const acct = budgetAccounts.find(a => a.code === row.haberCuenta);
                                  return acct ? `${acct.code} - ${acct.description}` : row.haberCuenta;
                                })()
                              : 'Seleccione Cuenta...'}
                          </span>
                          {!readOnly && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                        </div>

                        <AnimatePresence>
                          {activeAcctDropdown?.section === 'budgetAccounting' && 
                           activeAcctDropdown?.rowId === row.id && 
                           activeAcctDropdown?.field === 'haberCuenta' && 
                           !readOnly && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAcctDropdown(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] md:min-w-[360px] max-w-md"
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="p-2 border-b bg-slate-50 sticky top-0 z-10">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                      type="text" 
                                      placeholder="Buscar por código o descripción..." 
                                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                      value={acctSearchTerm}
                                      onChange={e => setAcctSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b select-none">
                                  <span className="col-span-4">Cuenta</span>
                                  <span className="col-span-8">Descripción</span>
                                </div>

                                <div className="max-h-52 overflow-y-auto">
                                  {(() => {
                                    const filtered = budgetAccounts
                                      .filter(a => {
                                        if (!acctSearchTerm) return true;
                                        const term = acctSearchTerm.toLowerCase();
                                        return (
                                          String(a.code || '').toLowerCase().includes(term) ||
                                          String(a.description || '').toLowerCase().includes(term)
                                        );
                                      })
                                      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron cuentas.</div>
                                      );
                                    }

                                    return filtered.map((a, idx) => {
                                      const isDisabled = !a.subgeneric || String(a.subgeneric).trim() === '';
                                      return (
                                        <div 
                                          key={`${a.type}-${a.code}-${idx}`}
                                          className={`px-3 py-2 border-b border-slate-50 last:border-b-0 text-xs grid grid-cols-12 gap-2 transition-colors ${
                                            isDisabled 
                                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none' 
                                              : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-slate-700'
                                          }`}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            updateRow('budgetAccounting', row.id, 'haberCuenta', a.code);
                                            setActiveAcctDropdown(null);
                                            setAcctSearchTerm('');
                                          }}
                                        >
                                          <span className={`col-span-4 font-mono font-semibold break-all ${isDisabled ? 'text-slate-400' : 'text-indigo-700'}`}>{a.code}</span>
                                          <span className={`col-span-8 uppercase break-words font-medium text-[11px] ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{a.description}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="number"
                        placeholder="Importe"
                        value={row.haberImporte || ''}
                        onChange={e => updateRow('budgetAccounting', row.id, 'haberImporte', parseFloat(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="p-2 text-center">
                      {!readOnly && (
                        <button onClick={() => removeRow('budgetAccounting', row.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Accounting */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-slate-800">Contabilidad Patrimonial</h3>
            {!readOnly && (
              <button onClick={() => addRow('financialAccounting')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                <Plus size={16} /> Agregar
              </button>
            )}
          </div>
          <div className="border rounded-lg overflow-visible bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Debe (Cuenta/Imp)</th>
                  <th className="p-2 text-left">Haber (Cuenta/Imp)</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {formData.financialAccounting.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2 space-y-1 overflow-visible relative">
                      <div className="relative">
                        <div 
                          onClick={() => {
                            if (readOnly) return;
                            if (activeAcctDropdown?.rowId === row.id && activeAcctDropdown?.field === 'debeCuenta' && activeAcctDropdown?.section === 'financialAccounting') {
                              setActiveAcctDropdown(null);
                            } else {
                              setActiveAcctDropdown({ section: 'financialAccounting', rowId: row.id, field: 'debeCuenta' });
                              setAcctSearchTerm('');
                            }
                          }}
                          className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer text-xs ${
                            readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'
                          }`}
                        >
                          <span className={row.debeCuenta ? 'text-slate-800 font-medium truncate max-w-[150px]' : 'text-slate-400'}>
                            {row.debeCuenta 
                              ? (() => {
                                  const acct = patrimonialAccounts.find(a => a.code === row.debeCuenta);
                                  return acct ? `(${acct.type}) ${acct.code} - ${acct.description}` : row.debeCuenta;
                                })()
                              : 'Seleccione Cuenta...'}
                          </span>
                          {!readOnly && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                        </div>

                        <AnimatePresence>
                          {activeAcctDropdown?.section === 'financialAccounting' && 
                           activeAcctDropdown?.rowId === row.id && 
                           activeAcctDropdown?.field === 'debeCuenta' && 
                           !readOnly && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAcctDropdown(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] md:min-w-[360px] max-w-md"
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="p-2 border-b bg-slate-50 sticky top-0 z-10">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                      type="text" 
                                      placeholder="Buscar por código o descripción..." 
                                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                      value={acctSearchTerm}
                                      onChange={e => setAcctSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b select-none">
                                  <span className="col-span-5">Tipo / Cuenta</span>
                                  <span className="col-span-7">Descripción</span>
                                </div>

                                <div className="max-h-52 overflow-y-auto">
                                  {(() => {
                                    const filtered = patrimonialAccounts
                                      .filter(a => {
                                        if (!acctSearchTerm) return true;
                                        const term = acctSearchTerm.toLowerCase();
                                        return (
                                          String(a.code || '').toLowerCase().includes(term) ||
                                          String(a.description || '').toLowerCase().includes(term) ||
                                          String(a.type || '').toLowerCase().includes(term)
                                        );
                                      })
                                      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron cuentas.</div>
                                      );
                                    }

                                    return filtered.map((a, idx) => {
                                      const isDisabled = !a.subgeneric || String(a.subgeneric).trim() === '';
                                      return (
                                        <div 
                                          key={`${a.type}-${a.code}-${idx}`}
                                          className={`px-3 py-2 border-b border-slate-50 last:border-b-0 text-xs grid grid-cols-12 gap-2 transition-colors ${
                                            isDisabled 
                                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none' 
                                              : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-slate-700'
                                          }`}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            updateRow('financialAccounting', row.id, 'debeCuenta', a.code);
                                            setActiveAcctDropdown(null);
                                            setAcctSearchTerm('');
                                          }}
                                        >
                                          <span className={`col-span-5 font-mono font-semibold break-all text-[11px] flex items-center ${isDisabled ? 'text-slate-400' : 'text-indigo-700'}`}>
                                            <span className={`text-[8px] border font-bold px-1 py-0.5 rounded mr-1 uppercase truncate max-w-[54px] shrink-0 ${
                                              isDisabled 
                                                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                                                : a.type === 'INGRESOS' 
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                              {a.type}
                                            </span>
                                            <span className="truncate">{a.code}</span>
                                          </span>
                                          <span className={`col-span-7 uppercase break-words font-medium text-[11px] ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{a.description}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="number"
                        placeholder="Importe"
                        value={row.debeImporte || ''}
                        onChange={e => updateRow('financialAccounting', row.id, 'debeImporte', parseFloat(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="p-2 space-y-1 overflow-visible relative">
                      <div className="relative">
                        <div 
                          onClick={() => {
                            if (readOnly) return;
                            if (activeAcctDropdown?.rowId === row.id && activeAcctDropdown?.field === 'haberCuenta' && activeAcctDropdown?.section === 'financialAccounting') {
                              setActiveAcctDropdown(null);
                            } else {
                              setActiveAcctDropdown({ section: 'financialAccounting', rowId: row.id, field: 'haberCuenta' });
                              setAcctSearchTerm('');
                            }
                          }}
                          className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer text-xs ${
                            readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'
                          }`}
                        >
                          <span className={row.haberCuenta ? 'text-slate-800 font-medium truncate max-w-[150px]' : 'text-slate-400'}>
                            {row.haberCuenta 
                              ? (() => {
                                  const acct = patrimonialAccounts.find(a => a.code === row.haberCuenta);
                                  return acct ? `(${acct.type}) ${acct.code} - ${acct.description}` : row.haberCuenta;
                                })()
                              : 'Seleccione Cuenta...'}
                          </span>
                          {!readOnly && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                        </div>

                        <AnimatePresence>
                          {activeAcctDropdown?.section === 'financialAccounting' && 
                           activeAcctDropdown?.rowId === row.id && 
                           activeAcctDropdown?.field === 'haberCuenta' && 
                           !readOnly && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAcctDropdown(null);
                                }} 
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] md:min-w-[360px] max-w-md"
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="p-2 border-b bg-slate-50 sticky top-0 z-10">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                      type="text" 
                                      placeholder="Buscar por código o descripción..." 
                                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                      value={acctSearchTerm}
                                      onChange={e => setAcctSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b select-none">
                                  <span className="col-span-5">Tipo / Cuenta</span>
                                  <span className="col-span-7">Descripción</span>
                                </div>

                                <div className="max-h-52 overflow-y-auto">
                                  {(() => {
                                    const filtered = patrimonialAccounts
                                      .filter(a => {
                                        if (!acctSearchTerm) return true;
                                        const term = acctSearchTerm.toLowerCase();
                                        return (
                                          String(a.code || '').toLowerCase().includes(term) ||
                                          String(a.description || '').toLowerCase().includes(term) ||
                                          String(a.type || '').toLowerCase().includes(term)
                                        );
                                      })
                                      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron cuentas.</div>
                                      );
                                    }

                                    return filtered.map((a, idx) => {
                                      const isDisabled = !a.subgeneric || String(a.subgeneric).trim() === '';
                                      return (
                                        <div 
                                          key={`${a.type}-${a.code}-${idx}`}
                                          className={`px-3 py-2 border-b border-slate-50 last:border-b-0 text-xs grid grid-cols-12 gap-2 transition-colors ${
                                            isDisabled 
                                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none' 
                                              : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-slate-700'
                                          }`}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            updateRow('financialAccounting', row.id, 'haberCuenta', a.code);
                                            setActiveAcctDropdown(null);
                                            setAcctSearchTerm('');
                                          }}
                                        >
                                          <span className={`col-span-5 font-mono font-semibold break-all text-[11px] flex items-center ${isDisabled ? 'text-slate-400' : 'text-indigo-700'}`}>
                                            <span className={`text-[8px] border font-bold px-1 py-0.5 rounded mr-1 uppercase truncate max-w-[54px] shrink-0 ${
                                              isDisabled 
                                                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                                                : a.type === 'INGRESOS' 
                                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                              {a.type}
                                            </span>
                                            <span className="truncate">{a.code}</span>
                                          </span>
                                          <span className={`col-span-7 uppercase break-words font-medium text-[11px] ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{a.description}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="number"
                        placeholder="Importe"
                        value={row.haberImporte || ''}
                        onChange={e => updateRow('financialAccounting', row.id, 'haberImporte', parseFloat(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="p-2 text-center">
                      {!readOnly && (
                        <button onClick={() => removeRow('financialAccounting', row.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Objects */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-slate-800">Estadística del Objeto del Gasto</h3>
          {!readOnly && (
            <button onClick={() => addRow('expenseObjects')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>
        <div className="border rounded-lg overflow-visible bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Código de la Partida</th>
                <th className="p-2 text-left">Importe Parcial</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {formData.expenseObjects.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 overflow-visible">
                    <div className="relative">
                      <div 
                        onClick={() => {
                          if (readOnly) return;
                          if (activeDropdownRowId === row.id) {
                            setActiveDropdownRowId(null);
                          } else {
                            setActiveDropdownRowId(row.id);
                            setClassifierSearchTerm('');
                          }
                        }}
                        className={`w-full p-2 border rounded-md bg-white flex justify-between items-center cursor-pointer text-xs ${
                          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'hover:border-blue-400'
                        }`}
                      >
                        <span className={row.codigoPartida ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          {row.codigoPartida 
                            ? (() => {
                                const cls = (companySettings.classifiers || []).find(c => c.code === row.codigoPartida && c.type === 'GASTOS');
                                return cls ? `${cls.code} - ${cls.description}` : row.codigoPartida;
                              })()
                            : 'Seleccione Partida...'}
                        </span>
                        {!readOnly && <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />}
                      </div>

                      <AnimatePresence>
                        {activeDropdownRowId === row.id && !readOnly && (
                          <>
                            <div 
                              className="fixed inset-0 z-40 bg-transparent" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownRowId(null);
                              }} 
                            />
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[280px] md:min-w-[400px] max-w-lg"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Search box inside the list */}
                              <div className="p-2 border-b bg-slate-50 sticky top-0 z-10">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input 
                                    type="text" 
                                    placeholder="Buscar por código (clasificador) o descripción..." 
                                    className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                    value={classifierSearchTerm}
                                    onChange={e => setClassifierSearchTerm(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                              </div>

                              {/* Structural limits: Only CLASIFICADOR and DESCRIPCION columns */}
                              <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b select-none">
                                <span className="col-span-4">Clasificador</span>
                                <span className="col-span-8">Descripción</span>
                              </div>

                              {/* Sorted results */}
                              <div className="max-h-56 overflow-y-auto">
                                {(() => {
                                  const filteredClassifiers = (companySettings.classifiers || [])
                                    .filter(c => c && c.type === 'GASTOS')
                                    .filter(c => {
                                      if (!classifierSearchTerm) return true;
                                      const term = classifierSearchTerm.toLowerCase();
                                      return (
                                        String(c.code || '').toLowerCase().includes(term) ||
                                        String(c.description || '').toLowerCase().includes(term)
                                      );
                                    })
                                    .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true }));

                                  if (filteredClassifiers.length === 0) {
                                    return (
                                      <div className="p-4 text-center text-xs text-slate-400 italic">No se encontraron clasificadores.</div>
                                    );
                                  }

                                  return filteredClassifiers.map((c, idx) => {
                                    const isDisabled = !c.subgeneric || String(c.subgeneric).trim() === '';
                                    return (
                                      <div 
                                        key={`${c.type}-${c.code}-${idx}`}
                                        className={`px-3 py-2 border-b border-slate-50 last:border-b-0 text-xs grid grid-cols-12 gap-2 transition-colors ${
                                          isDisabled 
                                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed select-none' 
                                            : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-slate-700'
                                        }`}
                                        onClick={() => {
                                          if (isDisabled) return;
                                          updateRow('expenseObjects', row.id, 'codigoPartida', c.code);
                                          setActiveDropdownRowId(null);
                                          setClassifierSearchTerm('');
                                        }}
                                      >
                                        <span className={`col-span-4 font-mono font-semibold break-all ${isDisabled ? 'text-slate-400' : 'text-indigo-700'}`}>{c.code}</span>
                                        <span className={`col-span-8 uppercase break-words font-medium text-[11px] ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{c.description}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="p-2">
                    <input 
                      type="number"
                      value={row.importeParcial || ''}
                      onChange={e => updateRow('expenseObjects', row.id, 'importeParcial', parseFloat(e.target.value) || 0)}
                      className="w-full p-1 border rounded"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="p-2 text-center">
                    {!readOnly && (
                      <button onClick={() => removeRow('expenseObjects', row.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium">
              <tr>
                <td className="p-2 text-right">Sumatoria:</td>
                <td className={`p-2 ${isExpenseValid ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                  S/. {totalExpenseObjects.toFixed(2)}
                  {!isExpenseValid && formData.total > 0 && (
                    <span className="block text-[10px] uppercase">No coincide con el Total</span>
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Signatures & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Tesorero</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.treasurerDate || ''}
                onChange={e => handleChange('treasurerDate', e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.treasurerName || ''}
                onChange={e => handleChange('treasurerName', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Nombre del Tesorero"
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Recibí Conforme</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input
                type="text"
                value={formData.receiverDni || ''}
                onChange={e => handleChange('receiverDni', e.target.value)}
                className="w-full p-2 border rounded-md bg-slate-50"
                placeholder="DNI"
                disabled
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RUC</label>
              <input
                type="text"
                value={formData.receiverRuc || ''}
                onChange={e => handleChange('receiverRuc', e.target.value)}
                className="w-full p-2 border rounded-md bg-slate-50"
                placeholder="RUC"
                disabled
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.receiverDate || ''}
                onChange={e => handleChange('receiverDate', e.target.value)}
                className="w-full p-2 border rounded-md bg-slate-50"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Totals & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Detalles de Pago</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pago</label>
            <select 
              value={formData.paymentMethod}
              onChange={e => handleChange('paymentMethod', e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={readOnly}
            >
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
          {formData.paymentMethod === 'cheque' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cheque N°</label>
              <input 
                type="text" 
                value={formData.chequeNumber || ''}
                onChange={e => handleChange('chequeNumber', e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={readOnly}
              />
            </div>
          )}
        </div>
        <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Total</span>
            <span className="font-mono font-medium">{formData.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Deducciones</span>
            <input 
              type="number" 
              value={formData.deductions} 
              onChange={e => handleChange('deductions', parseFloat(e.target.value) || 0)}
              className="w-32 p-1 border rounded text-right"
              disabled={readOnly}
            />
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-bold text-slate-800">Líquido a Pagar</span>
            <span className="font-mono font-bold text-lg">{formData.netPayable.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
