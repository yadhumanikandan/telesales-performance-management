import { useState, useCallback, useRef } from 'react';

export interface CustomPreset {
  id: string;
  name: string;
  timePeriod: string;
  leadStatus: string;
  createdAt: number;
}

export interface ExportedPresets {
  version: 1;
  exportedAt: string;
  presets: CustomPreset[];
}

export function useCustomFilterPresets(storageKey: string) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const savePreset = useCallback((name: string, timePeriod: string, leadStatus: string) => {
    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name,
      timePeriod,
      leadStatus,
      createdAt: Date.now(),
    };
    
    setCustomPresets(prev => {
      const updated = [...prev, newPreset];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    
    return newPreset;
  }, [storageKey]);

  const deletePreset = useCallback((id: string) => {
    setCustomPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const updatePreset = useCallback((id: string, updates: Partial<Omit<CustomPreset, 'id' | 'createdAt'>>) => {
    setCustomPresets(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const exportPresets = useCallback(() => {
    const exportData: ExportedPresets = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: customPresets,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [customPresets]);

  const importPresets = useCallback((file: File): Promise<{ imported: number; skipped: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate the import data
          if (!data.presets || !Array.isArray(data.presets)) {
            reject(new Error('Invalid preset file format'));
            return;
          }
          
          let imported = 0;
          let skipped = 0;
          
          const validPresets: CustomPreset[] = data.presets.filter((preset: any) => {
            if (!preset.name || !preset.timePeriod || !preset.leadStatus) {
              skipped++;
              return false;
            }
            return true;
          }).map((preset: any) => ({
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: preset.name,
            timePeriod: preset.timePeriod,
            leadStatus: preset.leadStatus,
            createdAt: Date.now(),
          }));
          
          imported = validPresets.length;
          
          if (validPresets.length > 0) {
            setCustomPresets(prev => {
              const updated = [...prev, ...validPresets];
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          }
          
          resolve({ imported, skipped });
        } catch (error) {
          reject(new Error('Failed to parse preset file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [storageKey]);

  const clearAllPresets = useCallback(() => {
    setCustomPresets([]);
    localStorage.setItem(storageKey, JSON.stringify([]));
  }, [storageKey]);

  return {
    customPresets,
    savePreset,
    deletePreset,
    updatePreset,
    exportPresets,
    importPresets,
    clearAllPresets,
    fileInputRef,
  };
}
