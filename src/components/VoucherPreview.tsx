import React from 'react';
import { Voucher } from '../types/voucher';
import { parseDateParts, formatDateTime, formatDate } from '../utils/dateUtils';

import { CompanySettings } from '../types/settings';

interface VoucherPreviewProps {
  voucher: Voucher;
  companySettings: CompanySettings;
}

export const VoucherPreview: React.FC<VoucherPreviewProps> = ({ voucher: rawVoucher, companySettings }) => {
  const voucher: Voucher = {
    ...rawVoucher,
    budgetCode: rawVoucher.budgetCode || {
      sector: '', pliego: '', funcion: '', programa: '', subprograma: '', actividad: '',
      componente: '', finalidad: '', fuenteFinanciamiento: '', rubro: ''
    },
    budgetAccounting: rawVoucher.budgetAccounting || [],
    financialAccounting: rawVoucher.financialAccounting || [],
    expenseObjects: rawVoucher.expenseObjects || []
  };

  // Parse date string using helper to ensure consistent DD/MM/YYYY format
  const { day, month, year } = parseDateParts(voucher.date);
  const paymentDateParts = voucher.paymentDate ? parseDateParts(voucher.paymentDate) : null;

  // Dynamic font sizing based on row count to fit A4
  const maxRows = Math.max(
    voucher.budgetAccounting.length,
    voucher.financialAccounting.length,
    voucher.expenseObjects.length
  );

  const tableHeaderSize = maxRows > 15 ? 'text-[8px]' : maxRows > 10 ? 'text-[9px]' : 'text-[10px]';
  const tableDataSize = maxRows > 15 ? 'text-[7px]' : maxRows > 10 ? 'text-[8px]' : 'text-[9px]';
  const tableMiniSize = maxRows > 15 ? 'text-[6px]' : maxRows > 10 ? 'text-[7px]' : 'text-[8px]';
  const tablePadding = maxRows > 15 ? 'p-0' : 'p-0.5';

  const getCreatorName = (createdBy: string | undefined): string => {
    if (!createdBy) return 'SISTEMA';
    const cleanCreatedBy = createdBy.trim();
    
    try {
      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers) as any[];
        const matchedUser = users.find(u => 
          (u.username && u.username.toLowerCase() === cleanCreatedBy.toLowerCase()) ||
          (u.fullName && u.fullName.toLowerCase() === cleanCreatedBy.toLowerCase())
        );
        if (matchedUser && matchedUser.fullName) {
          return matchedUser.fullName.toUpperCase();
        }
      }
      
      const sessionUser = localStorage.getItem('sessionUser');
      if (sessionUser) {
        const sUser = JSON.parse(sessionUser);
        if (sUser && sUser.fullName) {
          if (cleanCreatedBy.toLowerCase() === 'admin' || 
              cleanCreatedBy.toLowerCase() === 'administrador' || 
              (sUser.username && sUser.username.toLowerCase() === cleanCreatedBy.toLowerCase()) ||
              (sUser.fullName && sUser.fullName.toLowerCase() === cleanCreatedBy.toLowerCase())) {
            return sUser.fullName.toUpperCase();
          }
        }
      }
    } catch (e) {
      console.error("Error looking up user fullName for preview: ", e);
    }
    
    return cleanCreatedBy.toUpperCase();
  };

  return (
    <div className="bg-white p-4 sm:p-8 w-full max-w-[200mm] mx-auto text-[11px] font-sans leading-tight print:shadow-none print:p-0 print:max-w-none print:w-full print:min-h-0 overflow-hidden">
      <div className="border-2 border-blue-800 p-1 relative print:border-2 w-full box-border">
        
        {/* Header */}
        <div className="flex justify-between mb-4 gap-2">
          <div className="w-[55%] flex gap-3">
            {companySettings.logo && (
              <div className="w-16 h-16 flex-shrink-0">
                <img src={companySettings.logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-blue-900 uppercase leading-tight break-words">{companySettings.name}</h1>
              <p className="text-blue-800 font-bold text-[10px] leading-tight">{companySettings.address}</p>
              <p className="text-blue-800 font-bold text-[10px]">R.U.C. N° {companySettings.ruc}</p>
              {companySettings.phone && <p className="text-blue-800 font-bold text-[10px]">Telf: {companySettings.phone}</p>}
              
              {voucher.status === 'anulado' && (
                <div className="mt-1 text-red-600 font-bold text-[10px] uppercase border border-red-600 p-1 rounded bg-red-50">
                  <p>ANULADO EL: {formatDateTime(voucher.deletedAt)}</p>
                  <p>POR: {voucher.deletedBy || '-'}</p>
                  <p>MOTIVO: {(() => {
                    switch (voucher.deleteReason) {
                      case 'error_digitacion': return 'ERROR DE DIGITACIÓN';
                      case 'duplicidad': return 'DUPLICIDAD';
                      case 'anulacion': return 'ANULACIÓN';
                      default: return voucher.deleteReason || '-';
                    }
                  })()}</p>
                </div>
              )}
            </div>
          </div>
          <div className="w-[45%] flex flex-col items-end">
            <h2 className="text-base font-bold text-blue-900 uppercase mb-1 whitespace-nowrap">Comprobante de Pago</h2>
            <div className="border border-blue-800 rounded-lg flex overflow-hidden w-full text-center font-bold text-blue-900">
              <div className="flex-[1.5] border-r border-blue-800">
                <div className="bg-blue-100 border-b border-blue-800 py-1 text-[10px]">N°</div>
                <div className="py-1.5 text-sm whitespace-nowrap px-1">{voucher.number}</div>
              </div>
              <div className="flex-[2]">
                <div className="bg-blue-100 border-b border-blue-800 py-1 flex justify-around text-[9px]">
                  <span>DIA</span>
                  <span>MES</span>
                  <span>AÑO</span>
                </div>
                <div className="py-1.5 flex justify-around text-[10px]">
                  <span>{day}</span>
                  <span>{month}</span>
                  <span>{year}</span>
                </div>
                {paymentDateParts && (
                  <div className="border-t border-blue-800">
                    <div className="bg-blue-50 border-b border-blue-800 py-0.5 text-[8px] uppercase font-bold text-blue-900">
                      FECHA PAGO
                    </div>
                    <div className="py-1 flex justify-around text-blue-900 font-bold text-[9px]">
                      <span>{paymentDateParts.day}</span>
                      <span>{paymentDateParts.month}</span>
                      <span>{paymentDateParts.year}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payee */}
        <div className="border border-blue-800 mb-1 flex h-7">
          <div className="w-20 bg-blue-50 px-2 font-bold text-blue-900 border-r border-blue-800 flex items-center text-[10px]">NOMBRE</div>
          <div className="px-2 font-bold text-slate-800 uppercase flex-1 flex items-center overflow-hidden whitespace-nowrap">{voucher.payeeName}</div>
        </div>
        <div className="border border-blue-800 mb-2 flex h-7">
          <div className="w-20 bg-blue-50 px-2 font-bold text-blue-900 border-r border-blue-800 flex items-center text-[10px]">SON</div>
          <div className="px-2 font-bold text-slate-800 uppercase flex-1 flex items-center text-[10px] leading-tight">{voucher.amountInWords}</div>
        </div>

        {/* Concept */}
        <div className="border border-blue-800 mb-2">
          <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 text-[10px]">CONCEPTO</div>
          <div className="p-2 min-h-[50px] whitespace-pre-wrap uppercase text-[10px] leading-tight">{voucher.concept}</div>
        </div>

        {/* Budget Code */}
        <div className="border border-blue-800 mb-2">
          <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 text-[10px]">CODIFICACIÓN PROGRAMATICA</div>
          <div className="grid grid-cols-11 text-center text-[9px]">
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">SECTOR</div>
              <div className="py-0.5">{voucher.budgetCode.sector}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">PLIEGO</div>
              <div className="py-0.5">{voucher.budgetCode.pliego}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">FUNCIÓN</div>
              <div className="py-0.5">{voucher.budgetCode.funcion}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">PROG</div>
              <div className="py-0.5">{voucher.budgetCode.programa}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">SUB</div>
              <div className="py-0.5">{voucher.budgetCode.subprograma}</div>
            </div>
            <div className="border-r border-blue-800 col-span-2">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">ACTIVIDAD / PROYECTO</div>
              <div className="py-0.5 truncate px-1">{voucher.budgetCode.actividad}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">COMP</div>
              <div className="py-0.5">{voucher.budgetCode.componente}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">FIN</div>
              <div className="py-0.5">{voucher.budgetCode.finalidad}</div>
            </div>
            <div className="border-r border-blue-800">
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">F.F.</div>
              <div className="py-0.5">{voucher.budgetCode.fuenteFinanciamiento}</div>
            </div>
            <div>
              <div className="border-b border-blue-800 bg-blue-50 py-0.5 font-bold">RUBRO</div>
              <div className="py-0.5">{voucher.budgetCode.rubro}</div>
            </div>
          </div>
        </div>

        {/* Main Columns */}
        <div className="flex gap-2 mb-2 flex-[2]">
          
          {/* Left Column: Accounting */}
          <div className="w-3/5 flex flex-col gap-2">
            
            {/* Budget Accounting */}
            <div className="border border-blue-800 flex-1 flex flex-col">
              <div className={`bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 ${tableHeaderSize}`}>CONTABILIDAD PRESUPUESTAL</div>
              <div className="grid grid-cols-2 flex-1 relative">
                <div className="border-r border-blue-800 flex flex-col z-10">
                  <div className={`text-center font-bold border-b border-blue-800 bg-blue-50 ${tableDataSize}`}>DEBE</div>
                  <div className={`grid grid-cols-2 border-b border-blue-800 text-center font-bold ${tableMiniSize}`}>
                    <div className="border-r border-blue-800">CUENTA</div>
                    <div>IMPORTE</div>
                  </div>
                  <div className="flex-1">
                    {voucher.budgetAccounting.map((row, i) => (
                      <div key={i} className={`grid grid-cols-2 text-center border-b border-blue-200 last:border-0 ${tableDataSize}`}>
                        <div className={`border-r border-blue-800 ${tablePadding}`}>{row.debeCuenta}</div>
                        <div className={tablePadding}>{row.debeImporte ? row.debeImporte.toFixed(2) : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col z-10">
                  <div className={`text-center font-bold border-b border-blue-800 bg-blue-50 ${tableDataSize}`}>HABER</div>
                  <div className={`grid grid-cols-2 border-b border-blue-800 text-center font-bold ${tableMiniSize}`}>
                    <div className="border-r border-blue-800">CUENTA</div>
                    <div>IMPORTE</div>
                  </div>
                  <div className="flex-1">
                    {voucher.budgetAccounting.map((row, i) => (
                      <div key={i} className={`grid grid-cols-2 text-center border-b border-blue-200 last:border-0 ${tableDataSize}`}>
                        <div className={`border-r border-blue-800 ${tablePadding}`}>{row.haberCuenta}</div>
                        <div className={tablePadding}>{row.haberImporte ? row.haberImporte.toFixed(2) : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Accounting */}
            <div className="border border-blue-800 flex-1 flex flex-col">
              <div className={`bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 ${tableHeaderSize}`}>CONTABILIDAD PATRIMONIAL</div>
              <div className="grid grid-cols-2 flex-1 relative">
                <div className="border-r border-blue-800 flex flex-col z-10">
                  <div className={`text-center font-bold border-b border-blue-800 bg-blue-50 ${tableDataSize}`}>DEBE</div>
                  <div className={`grid grid-cols-2 border-b border-blue-800 text-center font-bold ${tableMiniSize}`}>
                    <div className="border-r border-blue-800">CUENTA</div>
                    <div>IMPORTE</div>
                  </div>
                  <div className="flex-1">
                    {voucher.financialAccounting.map((row, i) => (
                      <div key={i} className={`grid grid-cols-2 text-center border-b border-blue-200 last:border-0 ${tableDataSize}`}>
                        <div className={`border-r border-blue-800 ${tablePadding}`}>{row.debeCuenta}</div>
                        <div className={tablePadding}>{row.debeImporte ? row.debeImporte.toFixed(2) : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col z-10">
                  <div className={`text-center font-bold border-b border-blue-800 bg-blue-50 ${tableDataSize}`}>HABER</div>
                  <div className={`grid grid-cols-2 border-b border-blue-800 text-center font-bold ${tableMiniSize}`}>
                    <div className="border-r border-blue-800">CUENTA</div>
                    <div>IMPORTE</div>
                  </div>
                  <div className="flex-1">
                    {voucher.financialAccounting.map((row, i) => (
                      <div key={i} className={`grid grid-cols-2 text-center border-b border-blue-200 last:border-0 ${tableDataSize}`}>
                        <div className={`border-r border-blue-800 ${tablePadding}`}>{row.haberCuenta}</div>
                        <div className={tablePadding}>{row.haberImporte ? row.haberImporte.toFixed(2) : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Expense Stats & Totals */}
          <div className="w-2/5 flex flex-col gap-2">
            
            <div className="border border-blue-800 flex-1 flex flex-col">
              <div className={`bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 ${tableHeaderSize}`}>ESTADISTICA DEL OBJETO DEL GASTO</div>
              <div className={`grid grid-cols-2 border-b border-blue-800 text-center font-bold ${tableMiniSize} bg-blue-50`}>
                <div className="border-r border-blue-800 py-0.5">CODIGO DE LA PARTIDA</div>
                <div className="py-0.5">IMPORTE PARCIAL</div>
              </div>
              <div className="flex-1">
                {voucher.expenseObjects.map((row, i) => (
                  <div key={i} className={`grid grid-cols-2 text-center border-b border-blue-200 last:border-0 ${tableDataSize}`}>
                    <div className={`border-r border-blue-800 ${tablePadding}`}>{row.codigoPartida}</div>
                    <div className={tablePadding}>{row.importeParcial ? row.importeParcial.toFixed(2) : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-blue-800 text-[10px]">
              <div className="flex justify-between border-b border-blue-800">
                <div className="p-0.5 font-bold bg-blue-50 w-1/2">TOTAL</div>
                <div className="p-0.5 font-bold w-1/2 text-right">{voucher.total.toFixed(2)}</div>
              </div>
              <div className="flex justify-between border-b border-blue-800">
                <div className="p-0.5 font-bold bg-blue-50 w-1/2">DEDUCCIONES</div>
                <div className="p-0.5 w-1/2 text-right">{voucher.deductions.toFixed(2)}</div>
              </div>
              <div className="flex justify-between">
                <div className="p-0.5 font-bold bg-blue-50 w-1/2">LIQUIDO A PAGAR</div>
                <div className="p-0.5 font-bold w-1/2 text-right">{voucher.netPayable.toFixed(2)}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-2 h-48">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-2">
            <div className="border border-blue-800 flex-1 flex flex-col text-[8px]">
              <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5">PARA USO DEL TESORERO O CAJERO</div>
              <div className="grid grid-cols-[60px_1fr] border-b border-blue-800 h-6">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">FECHA</div>
                <div className="p-1 flex items-center">{voucher.treasurerDate ? formatDate(voucher.treasurerDate) : ''}</div>
              </div>
              <div className="grid grid-cols-[60px_1fr] border-b border-blue-800 h-8">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">HECHO POR</div>
                <div className="p-1 flex items-center">{voucher.treasurerName}</div>
              </div>
              <div className="flex flex-col flex-1">
                <div className="text-center font-bold text-blue-900 border-b border-blue-800 py-0.5">FIRMA PROVEEDOR</div>
                <div className="flex-1"></div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2">
            <div className="border border-blue-800 flex-[1.5] relative flex flex-col">
              <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5 text-[8px]">VISACIÓN</div>
              <div className="flex-1 flex items-end pb-1">
                <div className="w-full flex justify-around text-[7px] text-center">
                  <div>CONTABILIDAD</div>
                  <div>GERENCIA</div>
                </div>
              </div>
            </div>
            <div className="border border-blue-800 flex-1 flex flex-col text-[8px]">
              <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5">RECIBI CONFORME</div>
              <div className="grid grid-cols-[35px_1fr] border-b border-blue-800 flex-1">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">D.N.I. N°</div>
                <div className="p-1 flex items-center">{voucher.receiverDni}</div>
              </div>
              <div className="grid grid-cols-[35px_1fr] border-b border-blue-800 flex-1">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">R.U.C. N°</div>
                <div className="p-1 flex items-center">{voucher.receiverRuc}</div>
              </div>
              <div className="grid grid-cols-[35px_1fr] flex-1">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">FECHA</div>
                <div className="p-1 flex items-center">{voucher.receiverDate ? formatDate(voucher.receiverDate) : ''}</div>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-2">
            <div className="border border-blue-800 flex-1 flex flex-col text-[8px]">
               <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5">VISACIÓN</div>
               <div className="text-center font-bold border-b border-blue-800">PRESIDENTE DE DIRECTORIO</div>
               <div className="flex-1"></div>
            </div>
            <div className="border border-blue-800 flex-1 flex flex-col text-[8px]">
              <div className="bg-blue-100 text-center font-bold text-blue-900 border-b border-blue-800 py-0.5">FORMA DE PAGO</div>
              <div className="grid grid-cols-[55px_1fr] border-b border-blue-800 flex-1">
                <div className="border-r border-blue-800 p-1 font-bold flex items-center">CHEQUE N°</div>
                <div className="p-1 flex items-center">{voucher.chequeNumber}</div>
              </div>
              <div className="grid grid-cols-[55px_1fr] flex-1">
                <div className="border-r border-blue-800 p-1 font-bold leading-none flex items-center">FONDO PAGOS EN EFECTIVO</div>
                <div className="p-1 flex items-center">{voucher.paymentMethod === 'efectivo' ? 'X' : ''}</div>
              </div>
            </div>
          </div>

        </div>
        
        {/* Metadata Footer */}
        <div className="mt-2 pt-1 border-t border-slate-300 flex justify-between text-[7px] text-slate-500 font-mono">
          <div>
            <span className="font-bold">REGISTRADO POR:</span> {getCreatorName(voucher.createdBy)}
          </div>
          <div>
            <span className="font-bold">FECHA REGISTRO:</span> {formatDate(voucher.createdAt)}
          </div>
          <div>
            <span className="font-bold">FECHA IMPRESIÓN:</span> {formatDateTime(new Date().toISOString())}
          </div>
        </div>
      </div>
    </div>
  );
};
