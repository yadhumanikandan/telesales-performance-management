import { useState, useCallback } from 'react';

export interface CustomPreset {
  id: string;
  name: string;
  timePeriod: string;
  leadStatus: string;
  createdAt: number;
}

export function useCustomFilterPresets(storageKey: string) {
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

  return {
    customPresets,
    savePreset,
    deletePreset,
    updatePreset,
  };
}
