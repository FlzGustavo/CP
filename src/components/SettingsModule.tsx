import React, { useState } from 'react';
import { Plus, Trash2, Save, AlertCircle, List, TableProperties, Users, Search, Edit2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { CompanySettings, UnifiedEntry, FundingSourceMapping, Supplier } from '../types/settings';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { defaultSettings } from '../types/settings';

type TabType = 'masters' | 'dependent' | 'programmatic' | 'suppliers';

interface SettingsModuleProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => Promise<void>;
  onSync?: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ settings, onSave, onSync }) => {
  const [activeTab, setActiveTab] = useState<TabType>('masters');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSettings, setLocalSettings] = useState<CompanySettings>({ 
    ...settings,
    programmaticNodes: settings.programmaticNodes || [],
    suppliers: settings.suppliers || [],
    classifiers: settings.classifiers || [],
    accounts: settings.accounts || [],
    fundingSources: settings.fundingSources || []
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleSync = async () => {
    if (onSync) {
      setIsRefreshing(true);
      await onSync();
      // After global sync, refresh local state
      const refreshed = await api.getSettings();
      if (refreshed) {
        setLocalSettings({
          ...defaultSettings,
          ...refreshed,
          programmaticNodes: refreshed.programmaticNodes || [],
          suppliers: refreshed.suppliers || [],
          classifiers: refreshed.classifiers || [],
          accounts: refreshed.accounts || [],
          fundingSources: refreshed.fundingSources || []
        });
      }
      setIsRefreshing(false);
    }
  };
  const [newItem, setNewItem] = useState<{ [key: string]: string }>({});
  
  // States for the "Dependent" UI
  const [selectedClassifierType, setSelectedClassifierType] = useState(localSettings.classifierTypes[0] || '');
  const [selectedAccountType, setSelectedAccountType] = useState(localSettings.accountTypes[0] || '');
  const [selectedFundingSource, setSelectedFundingSource] = useState(localSettings.fundingSourceNames[0] || '');

  const [newClassifier, setNewClassifier] = useState<UnifiedEntry>({
    type: '',
    year: new Date().getFullYear().toString(),
    generic: '',
    subgeneric: '',
    subsubgeneric: '',
    code: '',
    description: ''
  });

  const [newAccount, setNewAccount] = useState<UnifiedEntry>({
    type: '',
    generic: '',
    subgeneric: '',
    code: '',
    description: ''
  });

  const [newFundingRubro, setNewFundingRubro] = useState('');
  
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    ruc: '',
    dni: '',
    name: '',
    address: '',
    phone: '',
    status: 'active'
  });

  // Programmatic Chain Management State
  const PROG_LEVELS = [
    { type: 'sector', label: 'Sector' },
    { type: 'pliego', label: 'Pliego' },
    { type: 'function', label: 'Función' },
    { type: 'program', label: 'Programa' },
    { type: 'subprogram', label: 'Subprograma' },
    { type: 'activity', label: 'Actividad' },
    { type: 'component', label: 'Componente' },
    { type: 'finality', label: 'Finalidad' },
  ] as const;

  const [progSelection, setProgSelection] = useState<Record<string, string>>({});
  const [newNode, setNewNode] = useState({ code: '', description: '' });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const handleAddProgNode = (type: string, parentId: string | null) => {
    if (!newNode.code || !newNode.description) return;

    const nodes = [...(localSettings.programmaticNodes || [])];
    if (editingNodeId) {
      const idx = nodes.findIndex(n => n.id === editingNodeId);
      if (idx !== -1) {
        nodes[idx] = { ...nodes[idx], code: newNode.code, description: newNode.description };
      }
      setEditingNodeId(null);
    } else {
      nodes.push({
        id: crypto.randomUUID(),
        parentId,
        type: type as any,
        code: newNode.code,
        description: newNode.description
      });
    }

    setLocalSettings({ ...localSettings, programmaticNodes: nodes });
    setNewNode({ code: '', description: '' });
  };

  const handleDeleteProgNode = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Nodo Programático',
      message: '¿Estás seguro de eliminar este elemento y toda su descendencia de la Estructura Programática?',
      onConfirm: () => {
        // Recursive delete helper
        const getDescendants = (parentId: string, allNodes: any[]): string[] => {
          const children = allNodes.filter(n => n.parentId === parentId);
          let res = children.map(c => c.id);
          children.forEach(c => {
            res = [...res, ...getDescendants(c.id, allNodes)];
          });
          return res;
        };

        const toDelete = [id, ...getDescendants(id, localSettings.programmaticNodes || [])];
        setLocalSettings({
          ...localSettings,
          programmaticNodes: (localSettings.programmaticNodes || []).filter(n => !toDelete.includes(n.id))
        });
        
        // Clear selections if deleted node was part of current path
        const type = localSettings.programmaticNodes?.find(n => n.id === id)?.type;
        if (type) {
          const levelIdx = PROG_LEVELS.findIndex(l => l.type === type);
          const newPath = { ...progSelection };
          for (let i = levelIdx; i < PROG_LEVELS.length; i++) {
            delete newPath[PROG_LEVELS[i].type];
          }
          setProgSelection(newPath);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAddItem = (key: keyof CompanySettings) => {
    const value = newItem[key as string]?.trim();
    if (!value) return;

    const currentList = (localSettings[key] as string[]) || [];
    if (currentList.includes(value)) {
      alert('Este elemento ya existe en la lista.');
      return;
    }

    setLocalSettings({
      ...localSettings,
      [key]: [...currentList, value]
    });
    setNewItem({ ...newItem, [key as string]: '' });
  };

  const handleRemoveItem = (key: keyof CompanySettings, index: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Elemento',
      message: '¿Estás seguro de eliminar este elemento de la lista?',
      onConfirm: () => {
        const currentList = [...((localSettings[key] as string[]) || [])];
        currentList.splice(index, 1);
        setLocalSettings({
          ...localSettings,
          [key]: currentList
        });
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddClassifier = (typeOverride?: string) => {
    if (!newClassifier.code || !newClassifier.description) {
      alert('El código y la descripción son obligatorios.');
      return;
    }
    
    const finalType = typeOverride || newClassifier.type || selectedClassifierType;
    const currentList = localSettings.classifiers || [];
    setLocalSettings({
      ...localSettings,
      classifiers: [...currentList, { ...newClassifier, type: finalType }]
    });
    // Keep type, year and generic
    setNewClassifier({ ...newClassifier, subgeneric: '', subsubgeneric: '', code: '', description: '' });
  };

  const handleAddAccount = (typeOverride?: string) => {
    if (!newAccount.code || !newAccount.description) {
      alert('El código y la descripción son obligatorios.');
      return;
    }
    
    const finalType = typeOverride || newAccount.type || selectedAccountType;
    const currentList = localSettings.accounts || [];
    setLocalSettings({
      ...localSettings,
      accounts: [...currentList, { ...newAccount, type: finalType }]
    });
    // Keep type and generic
    setNewAccount({ ...newAccount, subgeneric: '', code: '', description: '' });
  };

  const handleAddFundingRubro = () => {
    if (!selectedFundingSource || !newFundingRubro) {
      alert('Seleccione una fuente e ingrese el rubro.');
      return;
    }
    
    const currentList = localSettings.fundingSources || [];
    setLocalSettings({
      ...localSettings,
      fundingSources: [...currentList, { 
        source: selectedFundingSource, 
        category: newFundingRubro.trim()
      }]
    });
    setNewFundingRubro('');
  };

  const handleAddUpdateSupplier = () => {
    if (!newSupplier.name) {
      alert('El Nombre / Razón Social es obligatorio.');
      return;
    }

    const currentSuppliers = [...(localSettings.suppliers || [])];
    
    if (editingSupplierId) {
      if (newSupplier.ruc) {
        const duplicate = currentSuppliers.find(s => s.id !== editingSupplierId && s.ruc && s.ruc === newSupplier.ruc);
        if (duplicate) {
          alert('Ya existe un proveedor con este RUC.');
          return;
        }
      }
      const idx = currentSuppliers.findIndex(s => s.id === editingSupplierId);
      if (idx !== -1) {
        currentSuppliers[idx] = { ...currentSuppliers[idx], ...newSupplier } as Supplier;
      }
      setEditingSupplierId(null);
    } else {
      if (newSupplier.ruc) {
        const exists = currentSuppliers.find(s => s.ruc && s.ruc === newSupplier.ruc);
        if (exists) {
          alert('Ya existe un proveedor con este RUC.');
          return;
        }
      }
      const supplier: Supplier = {
        ...newSupplier as Supplier,
        id: crypto.randomUUID(),
        status: 'active'
      };
      currentSuppliers.push(supplier);
    }

    setLocalSettings({ ...localSettings, suppliers: currentSuppliers });
    setNewSupplier({ ruc: '', dni: '', name: '', address: '', phone: '', status: 'active' });
  };

  const toggleSupplierStatus = (id: string) => {
    const currentSuppliers = [...(localSettings.suppliers || [])];
    const idx = currentSuppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      currentSuppliers[idx].status = currentSuppliers[idx].status === 'active' ? 'inactive' : 'active';
      setLocalSettings({ ...localSettings, suppliers: currentSuppliers });
    }
  };

  // Helper to auto-generate code for entries when hierarchy bits change
  const updateUnifiedCode = (state: 'classifier' | 'account', updates: Partial<UnifiedEntry>) => {
    if (state === 'classifier') {
      const updated = { ...newClassifier, ...updates };
      const gen = (updated.generic || '').trim();
      const sub = (updated.subgeneric || '').trim();
      const ssub = (updated.subsubgeneric || '').trim();
      
      let autoCode = gen;
      if (sub) autoCode += `.${sub}`;
      if (ssub) autoCode += ` ${ssub}`;
      setNewClassifier({ ...updated, code: autoCode });
    } else {
      const updated = { ...newAccount, ...updates };
      const gen = (updated.generic || '').trim();
      const sub = (updated.subgeneric || '').trim();
      
      let autoCode = gen;
      if (sub) autoCode += `.${sub}`;
      setNewAccount({ ...updated, code: autoCode });
    }
  };

  const handleRemoveStructuredItem = (key: keyof CompanySettings, index: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Registro',
      message: '¿Estás seguro de eliminar este registro de la lista de Ajustes?',
      onConfirm: () => {
        const currentList = [...((localSettings[key] as any[]) || [])];
        currentList.splice(index, 1);
        setLocalSettings({
          ...localSettings,
          [key]: currentList
        });
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await onSave(localSettings);
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Suppliers pagination calculations
  const filteredSuppliers = (localSettings.suppliers || [])
    .filter(s => 
      s && String(s.name || '').toLowerCase().includes(supplierSearch.toLowerCase()) || 
      (s.ruc && String(s.ruc).includes(supplierSearch)) ||
      (s.dni && String(s.dni).includes(supplierSearch))
    );

  const SUPPLIERS_PER_PAGE = 10;
  const totalSupplierPages = Math.ceil(filteredSuppliers.length / SUPPLIERS_PER_PAGE) || 1;
  const currentSupplierPage = Math.min(supplierPage, totalSupplierPages);
  
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentSupplierPage - 1) * SUPPLIERS_PER_PAGE,
    currentSupplierPage * SUPPLIERS_PER_PAGE
  );

  const SaveButton = () => (
    <div className="flex justify-end mt-6">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 font-bold"
      >
        <Save size={20} />
        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4 sticky top-0 z-20">
        <div className="w-full sm:w-auto overflow-x-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-slate-800">Módulo de Ajustes</h2>
            <button 
              onClick={handleSync}
              className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors shadow-sm sm:hidden"
              title="Sincronizar con la base de datos"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync
            </button>
          </div>
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setActiveTab('masters')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'masters' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Maestros (Tipos)
            </button>
            <button
              onClick={() => setActiveTab('dependent')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'dependent' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Registro Jerárquico
            </button>
            <button
              onClick={() => setActiveTab('programmatic')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'programmatic' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Cadena Programática
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'suppliers' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Proveedores
            </button>
          </div>
        </div>
        <button 
          onClick={handleSync}
          className="hidden sm:flex bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          title="Sincronizar con la base de datos"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /> Sincronizar
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          <AlertCircle size={18} />
          {message.text}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'masters' && (
          <motion.div
            key="masters"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { key: 'classifierTypes', label: 'Tipos de Clasificadores' },
              { key: 'accountTypes', label: 'Tipos de Cuentas Contables' },
              { key: 'fundingSourceNames', label: 'Fuentes de Financiamiento' },
            ].map(config => (
              <div key={config.key} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col h-[400px]">
                <h3 className="font-bold text-slate-700 mb-3 pb-2 border-b border-slate-100">{config.label}</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newItem[config.key] || ''}
                    onChange={(e) => setNewItem({ ...newItem, [config.key]: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem(config.key as any)}
                    placeholder="Agregar nuevo..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm shadow-inner"
                  />
                  <button onClick={() => handleAddItem(config.key as any)} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {(localSettings[config.key as keyof CompanySettings] as string[]).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-md group hover:bg-indigo-50 transition-colors">
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                      <button onClick={() => handleRemoveItem(config.key as any, idx)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="md:col-span-3">
              <SaveButton />
            </div>
          </motion.div>
        )}

        {activeTab === 'dependent' && (
          <motion.div
            key="dependent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Hierarchical Clasificadores */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <TableProperties size={20} className="text-blue-600" />
                Registro Dependiente: Clasificadores
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Generics */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider">1. Registro de Genéricas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Seleccionar Tipo</label>
                      <select 
                        value={selectedClassifierType} 
                        onChange={e => setSelectedClassifierType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                      >
                        <option value="">Seleccione...</option>
                        {localSettings.classifierTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Año</label>
                      <input type="text" value={newClassifier.year} onChange={e => setNewClassifier({...newClassifier, year: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                    </div>
                    <div className="sm:col-span-2 space-y-4 bg-white p-3 rounded border border-blue-100">
                      <div className="flex gap-4">
                        <div className="w-32">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Genérica (Código)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm font-bold text-blue-700"
                            placeholder="Ej: 2.1"
                            value={newClassifier.generic}
                            onChange={e => setNewClassifier({...newClassifier, generic: e.target.value, subgeneric: '', subsubgeneric: '', code: e.target.value})}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Descripción de Genérica</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm"
                              placeholder="Ej: PERSONAL Y OBLIGACIONES SOCIALES"
                              value={newClassifier.description}
                              onChange={e => setNewClassifier({...newClassifier, description: e.target.value})}
                            />
                            <button 
                              onClick={() => {
                                if (!newClassifier.generic || !newClassifier.description || !selectedClassifierType) return;
                                const current = localSettings.classifiers || [];
                                setLocalSettings({...localSettings, classifiers: [...current, {...newClassifier, type: selectedClassifierType}]});
                                setNewClassifier({...newClassifier, description: ''});
                              }}
                              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Sub-generics */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">2. Registro de Sub-Clasificadores</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Seleccionar Genérica Existente</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        onChange={e => {
                          const [gen, desc] = e.target.value.split('|');
                          setNewClassifier({...newClassifier, generic: gen, description: ''});
                        }}
                      >
                        <option value="">Seleccione una genérica...</option>
                        {Array.from(new Set((localSettings.classifiers || [])
                          .filter(c => c.type === selectedClassifierType && !c.subgeneric && !c.subsubgeneric)
                          .map(c => `${c.generic}|${c.description}`)))
                          .map((val: any) => {
                            const [g, d] = (val as string).split('|');
                            return <option key={g} value={val}>{g} - {d}</option>;
                          })
                        }
                      </select>
                    </div>
                    <div className="bg-white p-3 rounded border border-indigo-100 flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Sub-Gen.</label>
                        <input type="text" className="w-full px-3 py-2 border rounded text-sm" value={newClassifier.subgeneric} onChange={e => updateUnifiedCode('classifier', {subgeneric: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Descripción Detallada</label>
                          <input type="text" className="w-full px-3 py-2 border rounded text-sm" value={newClassifier.description} onChange={e => setNewClassifier({...newClassifier, description: e.target.value})} />
                        </div>
                        <div className="mt-5">
                          <button 
                            onClick={() => {
                              handleAddClassifier(selectedClassifierType);
                            }}
                            className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display List for Classifiers */}
              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <List size={14} /> Vista Previa: {selectedClassifierType || 'Todos'}
                </h4>
                <div className="max-h-[300px] overflow-y-auto border rounded border-slate-100">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 border-b">Año</th>
                        <th className="px-3 py-2 border-b">Código</th>
                        <th className="px-3 py-2 border-b">Descripción</th>
                        <th className="px-3 py-2 border-b w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSettings.classifiers.filter(c => !selectedClassifierType || c.type === selectedClassifierType).sort((a,b) => String(a.code || '').localeCompare(String(b.code || ''))).map((c, i) => (
                        <tr key={i} className={`border-b border-slate-50 ${!c.subgeneric ? 'bg-blue-50/20 font-bold' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2 text-slate-400">{c.year}</td>
                          <td className="px-3 py-2 font-mono text-blue-700">{c.code}</td>
                          <td className="px-3 py-2">{c.description}</td>
                          <td className="px-3 py-2 text-right">
                             <button onClick={() => handleRemoveStructuredItem('classifiers', i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Hierarchical Fuentes */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <TableProperties size={20} className="text-amber-600" />
                Fuentes de Financiamiento y Rubros
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">1. Seleccionar Fuente Registrada</label>
                  <select 
                    value={selectedFundingSource}
                    onChange={e => setSelectedFundingSource(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm bg-white font-medium"
                  >
                    <option value="">Seleccione fuente...</option>
                    {localSettings.fundingSourceNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">2. Ingrese Rubro para esta fuente</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="Ej: 07. FONDO DE COMPENSACION MUNICIPAL"
                      value={newFundingRubro}
                      onChange={e => setNewFundingRubro(e.target.value)}
                    />
                    <button 
                      onClick={handleAddFundingRubro}
                      className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 font-bold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Fuente</th>
                      <th className="px-4 py-3">Rubros (Categorías)</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Grouping by source for display */}
                    {Array.from(new Set(localSettings.fundingSources.map(f => f.source))).map(source => (
                      <React.Fragment key={source}>
                        <tr className="bg-amber-50/30">
                          <td className="px-4 py-2 font-bold text-amber-900 border-b border-amber-100" colSpan={3}>{source}</td>
                        </tr>
                        {localSettings.fundingSources.filter(f => f.source === source).map((f, idx) => (
                          <tr key={`${source}-${idx}`} className="border-b border-slate-50 hover:bg-white group">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 text-slate-700">{f.category}</td>
                            <td className="px-4 py-2 text-right">
                              <button 
                                onClick={() => {
                                  setConfirmState({
                                    isOpen: true,
                                    title: 'Eliminar Rubro',
                                    message: `¿Estás seguro de eliminar el rubro "${f.category}" de la Fuente de Financiamiento "${f.source}"?`,
                                    onConfirm: () => {
                                      const newList = localSettings.fundingSources.filter(item => !(item.source === f.source && item.category === f.category));
                                      setLocalSettings({...localSettings, fundingSources: newList});
                                      setConfirmState(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                }} 
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {localSettings.fundingSources.length === 0 && (
                      <tr><td colSpan={3} className="p-10 text-center text-slate-400 italic">No hay rubros registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hierarchical Cuentas Contables */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <TableProperties size={20} className="text-emerald-600" />
                Registro Dependiente: Cuentas Contables
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Principal Accounts (Generics) */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">1. Registro de Cuentas Principales</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Seleccionar Tipo</label>
                      <select 
                        value={selectedAccountType} 
                        onChange={e => setSelectedAccountType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                      >
                        <option value="">Seleccione...</option>
                        {localSettings.accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-4 bg-white p-3 rounded border border-emerald-100">
                      <div className="flex gap-4">
                        <div className="w-32">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Cuenta Pral. (Código)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-emerald-200 rounded-md text-sm font-bold text-emerald-700"
                            placeholder="Ej: 1222"
                            value={newAccount.generic}
                            onChange={e => setNewAccount({...newAccount, generic: e.target.value, subgeneric: '', code: e.target.value})}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Descripción de Cuenta</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 px-3 py-2 border border-emerald-200 rounded-md text-sm"
                              placeholder="Ej: CAJA Y BANCOS"
                              value={newAccount.description}
                              onChange={e => setNewAccount({...newAccount, description: e.target.value})}
                            />
                            <button 
                              onClick={() => {
                                if (!newAccount.generic || !newAccount.description || !selectedAccountType) return;
                                const current = localSettings.accounts || [];
                                setLocalSettings({...localSettings, accounts: [...current, {...newAccount, type: selectedAccountType}]});
                                setNewAccount({...newAccount, description: ''});
                              }}
                              className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Sub-accounts */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider">2. Registro de Sub-Cuentas</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500">Seleccionar Cuenta Principal</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                        onChange={e => {
                          const [gen, desc] = e.target.value.split('|');
                          setNewAccount({...newAccount, generic: gen, description: ''});
                        }}
                      >
                        <option value="">Seleccione una cuenta principal...</option>
                        {Array.from(new Set((localSettings.accounts || [])
                          .filter(a => a.type === selectedAccountType && !a.subgeneric)
                          .map(a => `${a.generic}|${a.description}`)))
                          .map((val: any) => {
                            const [g, d] = (val as string).split('|');
                            return <option key={g} value={val}>{g} - {d}</option>;
                          })
                        }
                      </select>
                    </div>
                    <div className="bg-white p-3 rounded border border-teal-100 flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">Sub-Cuenta (Anexar al código)</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 border rounded text-sm" 
                          placeholder="Ej: 01"
                          value={newAccount.subgeneric} 
                          onChange={e => updateUnifiedCode('account', {subgeneric: e.target.value})} 
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Descripción Detallada</label>
                          <input type="text" className="w-full px-3 py-2 border rounded text-sm" value={newAccount.description} onChange={e => setNewAccount({...newAccount, description: e.target.value})} />
                        </div>
                        <div className="mt-5">
                          <button 
                            onClick={() => {
                              handleAddAccount(selectedAccountType);
                            }}
                            className="bg-teal-600 text-white p-2 rounded hover:bg-teal-700"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display List for Accounts */}
              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <List size={14} /> Vista Previa: {selectedAccountType || 'Todas'}
                </h4>
                <div className="max-h-[300px] overflow-y-auto border rounded border-slate-100">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 border-b">Código</th>
                        <th className="px-3 py-2 border-b">Descripción</th>
                        <th className="px-3 py-2 border-b w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSettings.accounts.filter(a => !selectedAccountType || a.type === selectedAccountType).sort((a,b) => String(a.code || '').localeCompare(String(b.code || ''))).map((a, i) => (
                        <tr key={i} className={`border-b border-slate-50 ${!a.subgeneric ? 'bg-emerald-50/20 font-bold' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2 font-mono text-emerald-700">{a.code}</td>
                          <td className="px-3 py-2">{a.description}</td>
                          <td className="px-3 py-2 text-right">
                             <button onClick={() => handleRemoveStructuredItem('accounts', i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <SaveButton />
          </motion.div>
        )}

        {activeTab === 'programmatic' && (
          <motion.div
            key="programmatic"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
                <TableProperties size={20} className="text-blue-600" />
                Gestión de Cadena Programática
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Selection Sidebar */}
                <div className="md:col-span-1 space-y-4 border-r border-slate-100 pr-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Jerarquía</h4>
                  {PROG_LEVELS.map((level, idx) => {
                    const parentLevel = idx > 0 ? PROG_LEVELS[idx - 1] : null;
                    const isEnabled = !parentLevel || !!progSelection[parentLevel.type];
                    
                    return (
                      <div key={level.type} className={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">{level.label}</label>
                        <select
                          value={progSelection[level.type] || ''}
                          onChange={(e) => {
                            const newPath = { ...progSelection, [level.type]: e.target.value };
                            // Clear child levels
                            for (let i = idx + 1; i < PROG_LEVELS.length; i++) {
                              delete newPath[PROG_LEVELS[i].type];
                            }
                            setProgSelection(newPath);
                            setNewNode({ code: '', description: '' });
                            setEditingNodeId(null);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Seleccione...</option>
                          {(localSettings.programmaticNodes || [])
                            .filter(n => n.type === level.type && (!parentLevel || ((n.parentId || null) === (progSelection[parentLevel.type] || null))))
                            .sort((a,b) => String(a.code).localeCompare(String(b.code)))
                            .map(n => <option key={n.id} value={n.id}>{n.code} - {n.description}</option>)
                          }
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Management Area */}
                <div className="md:col-span-3 space-y-6">
                  {(() => {
                    const levelToManageIdx = PROG_LEVELS.findIndex(l => !progSelection[l.type]);
                    const levelToManage = levelToManageIdx === -1 ? null : PROG_LEVELS[levelToManageIdx];
                    const parentId = levelToManageIdx <= 0 ? null : progSelection[PROG_LEVELS[levelToManageIdx - 1].type];

                    if (!levelToManage) {
                      return (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-500">
                          <TableProperties size={48} className="mb-4 opacity-20" />
                          <p className="font-medium text-lg">Estructura completa</p>
                          <p className="text-sm">Has navegado hasta el último nivel de la cadena.</p>
                          <button 
                            onClick={() => setProgSelection({})}
                            className="mt-4 text-blue-600 hover:underline text-sm font-bold"
                          >
                            Volver al inicio
                          </button>
                        </div>
                      );
                    }

                    const nodesAtLevel = (localSettings.programmaticNodes || []).filter(n => n.type === levelToManage.type && ((n.parentId || null) === (parentId || null)));

                    return (
                      <>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">
                            {editingNodeId ? 'Editar' : 'Agregar'} {levelToManage.label} 
                            {parentId && ` para ${localSettings.programmaticNodes?.find(n => n.id === parentId)?.description}`}
                          </h4>
                          <div className="flex gap-4">
                            <div className="w-32">
                              <label className="text-[10px] uppercase font-bold text-slate-400">Código</label>
                              <input 
                                type="text"
                                value={newNode.code}
                                onChange={e => setNewNode({ ...newNode, code: e.target.value })}
                                className="w-full px-3 py-2 border rounded text-sm font-mono"
                                placeholder="00"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] uppercase font-bold text-slate-400">Descripción</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={newNode.description}
                                  onChange={e => setNewNode({ ...newNode, description: e.target.value })}
                                  className="flex-1 px-3 py-2 border rounded text-sm"
                                  placeholder={`Nombre del ${levelToManage.label}`}
                                />
                                <button
                                  onClick={() => handleAddProgNode(levelToManage.type, parentId)}
                                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm"
                                >
                                  {editingNodeId ? <Save size={18} /> : <Plus size={18} />}
                                </button>
                                {editingNodeId && (
                                  <button
                                    onClick={() => {
                                      setEditingNodeId(null);
                                      setNewNode({ code: '', description: '' });
                                    }}
                                    className="bg-slate-200 text-slate-600 px-4 py-2 rounded hover:bg-slate-300"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            <List size={14} /> Elementos ({levelToManage.label})
                          </h4>
                          <div className="border rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase">
                                <tr>
                                  <th className="px-4 py-2">Código</th>
                                  <th className="px-4 py-2">Descripción</th>
                                  <th className="px-4 py-2 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {nodesAtLevel.sort((a,b) => String(a.code).localeCompare(String(b.code))).map(n => (
                                  <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 font-mono text-blue-600">{n.code}</td>
                                    <td className="px-4 py-2">{n.description}</td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button 
                                          onClick={() => {
                                            setEditingNodeId(n.id);
                                            setNewNode({ code: n.code, description: n.description });
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteProgNode(n.id)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {nodesAtLevel.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">No hay registros en este nivel.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <SaveButton />
          </motion.div>
        )}

        {activeTab === 'suppliers' && (
          <motion.div
            key="suppliers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <Users size={20} className="text-indigo-600" />
                Gestión de Proveedores
              </h3>

              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">{editingSupplierId ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">RUC (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" 
                      value={newSupplier.ruc || ''} 
                      onChange={e => setNewSupplier({...newSupplier, ruc: e.target.value})} 
                      placeholder="10XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">DNI</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" 
                      value={newSupplier.dni || ''} 
                      onChange={e => setNewSupplier({...newSupplier, dni: e.target.value})} 
                      placeholder="XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nombre / Razón Social</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" 
                      value={newSupplier.name} 
                      onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} 
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Dirección (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" 
                      value={newSupplier.address} 
                      onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Teléfono (Opcional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm" 
                        value={newSupplier.phone} 
                        onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} 
                      />
                      <button 
                        onClick={handleAddUpdateSupplier}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition-all"
                      >
                        {editingSupplierId ? <Save size={18} /> : <Plus size={18} />}
                      </button>
                      {editingSupplierId && (
                        <button 
                          onClick={() => {
                            setEditingSupplierId(null);
                            setNewSupplier({ ruc: '', dni: '', name: '', address: '', phone: '', status: 'active' });
                          }}
                          className="bg-slate-200 text-slate-600 px-4 py-2 rounded-md hover:bg-slate-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <List size={14} /> Lista de Proveedores
                  </h4>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Buscar proveedor..." 
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-full text-xs"
                      value={supplierSearch}
                      onChange={e => {
                        setSupplierSearch(e.target.value);
                        setSupplierPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">RUC</th>
                        <th className="px-4 py-3">DNI</th>
                        <th className="px-4 py-3">Razón Social</th>
                        <th className="px-4 py-3">Contacto / Dir.</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedSuppliers.map((s) => (
                        <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.status === 'inactive' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <td className="px-4 py-3 font-mono font-bold text-slate-600">{s.ruc || '-'}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{s.dni || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {s.phone && <span className="block">{s.phone}</span>}
                            {s.address && <span className="block text-[10px]">{s.address}</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {s.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => toggleSupplierStatus(s.id)} 
                                title={s.status === 'active' ? 'Inactivar' : 'Activar'}
                                className={`p-1.5 rounded hover:bg-white shadow-sm border border-transparent hover:border-slate-200 ${s.status === 'active' ? 'text-amber-500' : 'text-green-500'}`}
                              >
                                {s.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingSupplierId(s.id);
                                  setNewSupplier({ ...s });
                                }}
                                className="p-1.5 text-blue-500 hover:bg-white shadow-sm border border-transparent hover:border-slate-200 rounded"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleRemoveStructuredItem('suppliers' as any, localSettings.suppliers.findIndex(sup => sup.id === s.id))}
                                className="p-1.5 text-red-500 hover:bg-white shadow-sm border border-transparent hover:border-slate-200 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic bg-white">
                            {supplierSearch ? 'No se encontraron proveedores que coincidan con la búsqueda.' : 'No hay proveedores registrados.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {totalSupplierPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => setSupplierPage(p => Math.max(p - 1, 1))}
                          disabled={currentSupplierPage === 1}
                          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setSupplierPage(p => Math.min(p + 1, totalSupplierPages))}
                          disabled={currentSupplierPage === totalSupplierPages}
                          className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-slate-500">
                            Mostrando <span className="font-semibold text-slate-700">{(currentSupplierPage - 1) * SUPPLIERS_PER_PAGE + 1}</span> a{' '}
                            <span className="font-semibold text-slate-700">
                              {Math.min(currentSupplierPage * SUPPLIERS_PER_PAGE, filteredSuppliers.length)}
                            </span>{' '}
                            de <span className="font-semibold text-slate-700">{filteredSuppliers.length}</span> proveedores
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm bg-white" aria-label="Pagination">
                            <button
                              onClick={() => setSupplierPage(p => Math.max(p - 1, 1))}
                              disabled={currentSupplierPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-1.5 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 text-xs"
                            >
                              <span className="sr-only">Anterior</span>
                              &larr;
                            </button>
                            
                            {Array.from({ length: totalSupplierPages }).map((_, i) => {
                              const pageNum = i + 1;
                              const isCurrent = pageNum === currentSupplierPage;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setSupplierPage(pageNum)}
                                  aria-current={isCurrent ? "page" : undefined}
                                  className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold ${
                                    isCurrent
                                      ? "z-10 bg-blue-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                      : "text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:outline-offset-0"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => setSupplierPage(p => Math.min(p + 1, totalSupplierPages))}
                              disabled={currentSupplierPage === totalSupplierPages}
                              className="relative inline-flex items-center rounded-r-md px-2 py-1.5 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 text-xs"
                            >
                              <span className="sr-only flex items-center justify-center">Siguiente</span>
                              &rarr;
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <SaveButton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm"
            />
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="relative bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden p-6 z-10"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1.5 py-0.5 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{confirmState.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{confirmState.message}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmState.onConfirm();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-lg text-xs transition-all shadow-sm hover:shadow-md cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
