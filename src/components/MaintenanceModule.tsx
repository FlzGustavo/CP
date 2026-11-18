import React, { useState, useEffect } from 'react';
import { CompanySettings, defaultSettings } from '../types/settings';
import { api } from '../services/api';
import { Save, Upload, Building2, MapPin, Phone, Mail, Globe, Hash, Image as ImageIcon, Loader2, CheckCircle, RefreshCw } from 'lucide-react';

interface MaintenanceModuleProps {
  currentSettings: CompanySettings;
  onSettingsUpdate: (settings: CompanySettings) => void;
  onSync?: () => void;
}

export const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({ currentSettings, onSettingsUpdate, onSync }) => {
  const [settings, setSettings] = useState<CompanySettings>(currentSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSettings = async () => {
    // If we already have settings in App.tsx that aren't just the defaults, 
    // we can skip the loading state but still sync in background
    if (currentSettings.logo || currentSettings.phone || currentSettings.email) {
      setSettings(currentSettings);
    } else {
      setIsLoading(true);
    }

    try {
      const fetchedSettings = await api.getSettings();
      if (fetchedSettings && Object.keys(fetchedSettings).length > 0) {
        const mergedSettings = { ...defaultSettings, ...fetchedSettings };
        setSettings(mergedSettings);
        onSettingsUpdate(mergedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (onSync) {
      setIsRefreshing(true);
      await onSync();
      // After global sync, we also want to refresh local state
      const fetchedSettings = await api.getSettings();
      if (fetchedSettings) {
        const merged = { ...defaultSettings, ...fetchedSettings };
        setSettings(merged);
        onSettingsUpdate(merged);
      }
      setIsRefreshing(false);
    } else {
      await loadSettings();
    }
  };

  useEffect(() => {
    loadSettings();
  }, []); // Run once on mount

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSettings(prev => ({ ...prev, logo: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const result = await api.saveSettings(settings);
      if (result.success) {
        setSaveSuccess(true);
        onSettingsUpdate(settings);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Mantenimiento del Sistema</h2>
        <button 
          onClick={handleSync}
          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
          title="Sincronizar con la base de datos"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /> Sincronizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
              <Building2 className="text-blue-600" size={20} />
              <h3 className="font-bold text-slate-700 uppercase text-sm tracking-wider">Datos de la Empresa</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="name"
                      value={settings.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. Mi Empresa S.A.C."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="ruc"
                      value={settings.ruc}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. 20123456789"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="phone"
                      value={settings.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. 999 999 999"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="address"
                      value={settings.address}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. Av. Las Flores 123, Lima"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={settings.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. contacto@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sitio Web</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="web"
                      value={settings.web}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. www.empresa.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : saveSuccess ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  {isSaving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
              <ImageIcon className="text-blue-600" size={20} />
              <h3 className="font-bold text-slate-700 uppercase text-sm tracking-wider">Logo de la Empresa</h3>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              <div className="w-full aspect-square max-w-[200px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                {settings.logo ? (
                  <>
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                        <Upload size={14} /> Cambiar
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors">
                    <Upload size={32} />
                    <span className="text-xs font-bold uppercase">Subir Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest">
                Recomendado: PNG o JPG transparente<br />Máx. 500KB
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-blue-800 font-bold text-xs uppercase mb-2 flex items-center gap-1">
              <CheckCircle size={14} /> Nota Importante
            </h4>
            <p className="text-blue-700 text-xs leading-relaxed">
              La información configurada aquí aparecerá automáticamente en el encabezado de todos los comprobantes de pago generados por el sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
