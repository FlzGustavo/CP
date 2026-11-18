import React, { useState, useMemo } from 'react';
import { Voucher } from '../types/voucher';
import { Plus, Trash2, Search, FileDown, Filter, X, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsModuleProps {
  vouchers: Voucher[];
  onSync?: () => void;
}

interface FilterCondition {
  id: string;
  field: string;
  value: string;
}

const AVAILABLE_FIELDS = [
  { value: 'number', label: 'N° Comprobante' },
  { value: 'date', label: 'Fecha' },
  { value: 'payeeName', label: 'Girado a' },
  { value: 'concept', label: 'Concepto' },
  { value: 'total', label: 'Importe Total' },
  { value: 'status', label: 'Estado' },
  { value: 'paymentMethod', label: 'Medio de Pago' },
  { value: 'chequeNumber', label: 'N° Cheque' },
  { value: 'budgetCode.sector', label: 'Sector' },
  { value: 'budgetCode.pliego', label: 'Pliego' },
  { value: 'budgetCode.funcion', label: 'Función' },
  { value: 'budgetCode.programa', label: 'Programa' },
  { value: 'budgetCode.subprograma', label: 'Subprograma' },
  { value: 'budgetCode.actividad', label: 'Actividad' },
  { value: 'budgetCode.componente', label: 'Componente' },
  { value: 'budgetCode.finalidad', label: 'Finalidad' },
  { value: 'budgetCode.fuenteFinanciamiento', label: 'Fuente Financiamiento' },
  { value: 'treasurerName', label: 'Tesorero' },
  { value: 'receiverDni', label: 'DNI Receptor' },
  { value: 'receiverRuc', label: 'RUC Receptor' },
];

export function ReportsModule({ vouchers, onSync }: ReportsModuleProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([
    { id: crypto.randomUUID(), field: 'payeeName', value: '' }
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSync = async () => {
    if (onSync) {
      setIsRefreshing(true);
      await onSync();
      setIsRefreshing(false);
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(voucher => {
      return filters.every(filter => {
        if (!filter.value) return true;
        
        const searchTerm = filter.value.toLowerCase();
        const fieldValue = getNestedValue(voucher, filter.field);
        
        if (fieldValue === undefined || fieldValue === null) return false;
        
        return String(fieldValue).toLowerCase().includes(searchTerm);
      });
    });
  }, [vouchers, filters]);

  const addFilter = () => {
    setFilters([...filters, { id: crypto.randomUUID(), field: 'payeeName', value: '' }]);
  };

  const removeFilter = (id: string) => {
    if (filters.length === 1) {
      setFilters([{ ...filters[0], value: '' }]);
    } else {
      setFilters(filters.filter(f => f.id !== id));
    }
  };

  const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const exportToExcel = () => {
    const dataToExport = filteredVouchers.map(v => ({
      'N° Comprobante': v.number,
      'Fecha': v.date,
      'Girado a': v.payeeName,
      'Concepto': v.concept,
      'Importe': v.total,
      'Estado': v.status,
      'Medio de Pago': v.paymentMethod,
      'N° Cheque': v.chequeNumber || '',
      'Sector': v.budgetCode?.sector || '',
      'Pliego': v.budgetCode?.pliego || '',
      'Fuente Fin.': v.budgetCode?.fuenteFinanciamiento || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "reporte_comprobantes.xlsx");
  };

  const totalAmount = filteredVouchers.reduce((sum, v) => sum + (v.status !== 'anulado' ? v.total : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Filter className="text-blue-600" />
          Módulo de Reportes
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            title="Sincronizar con la base de datos"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /> Sincronizar
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          >
            <FileDown size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Filtros de Búsqueda</h3>
        
        <div className="space-y-3">
          {filters.map((filter, index) => (
            <div key={filter.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-sm font-medium text-slate-500 w-8 pt-2 sm:pt-0">#{index + 1}</span>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                <div className="sm:col-span-4">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {AVAILABLE_FIELDS.map(field => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:col-span-8 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    placeholder={`Buscar por ${AVAILABLE_FIELDS.find(f => f.value === filter.field)?.label.toLowerCase()}...`}
                    className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => removeFilter(filter.id)}
                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                title="Eliminar filtro"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
          <button
            onClick={addFilter}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={18} /> Agregar otro filtro
          </button>
          
          <div className="text-sm text-slate-500">
            Encontrados: <span className="font-bold text-slate-900">{filteredVouchers.length}</span> registros
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">N°</th>
                <th className="p-4 font-semibold text-slate-600">Fecha</th>
                <th className="p-4 font-semibold text-slate-600">Girado a</th>
                <th className="p-4 font-semibold text-slate-600">Concepto</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Importe</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No se encontraron resultados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(voucher => (
                  <tr key={voucher.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono">{voucher.number}</td>
                    <td className="p-4">{voucher.date}</td>
                    <td className="p-4 font-medium">{voucher.payeeName}</td>
                    <td className="p-4 max-w-xs break-words whitespace-normal" title={voucher.concept}>{voucher.concept}</td>
                    <td className="p-4 text-right font-mono">S/. {voucher.total.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                        voucher.status === 'anulado' ? 'text-red-600 bg-red-100 border-red-200' :
                        voucher.status === 'pagado' ? 'text-green-600 bg-green-100 border-green-200' :
                        'text-blue-600 bg-blue-100 border-blue-200'
                      }`}>
                        {voucher.status?.toUpperCase() || 'EMITIDO'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
              <tr>
                <td colSpan={4} className="p-4 text-right text-slate-700">Total Filtrado:</td>
                <td className="p-4 text-right text-slate-900">S/. {totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
