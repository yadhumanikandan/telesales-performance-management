import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProductType, BankName, createLeadSource, ACCOUNT_BANKS, LOAN_BANKS } from './useLeads';
import * as XLSX from 'xlsx';

export interface ImportedLeadRow {
  companyName: string;
  contactPersonName: string;
  phoneNumber: string;
  tradeLicenseNumber: string;
  city?: string;
  industry?: string;
  productType: ProductType;
  bankName: BankName;
  dealValue?: number;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// Column mapping patterns for auto-detection
const COLUMN_MAPPINGS = {
  companyName: ['company', 'company name', 'company_name', 'business', 'business name'],
  contactPersonName: ['contact', 'contact person', 'contact_person', 'contact name', 'person', 'name'],
  phoneNumber: ['phone', 'phone number', 'phone_number', 'mobile', 'tel', 'telephone'],
  tradeLicenseNumber: ['trade license', 'trade_license', 'license', 'license number', 'tl', 'trn'],
  city: ['city', 'location', 'area', 'emirate'],
  industry: ['industry', 'sector', 'business type', 'category'],
  productType: ['product', 'product type', 'product_type', 'type'],
  bankName: ['bank', 'bank name', 'bank_name', 'financial institution'],
  dealValue: ['deal', 'deal value', 'deal_value', 'value', 'amount'],
  notes: ['notes', 'comments', 'remarks', 'description'],
};

// Bank name normalization
const BANK_ALIASES: Record<string, BankName> = {
  'rak': 'RAK',
  'rak bank': 'RAK',
  'rakbank': 'RAK',
  'nbf': 'NBF',
  'national bank of fujairah': 'NBF',
  'ubl': 'UBL',
  'united bank limited': 'UBL',
  'ruya': 'RUYA',
  'mashreq': 'MASHREQ',
  'mashreq bank': 'MASHREQ',
  'wio': 'WIO',
  'wio bank': 'WIO',
};

// Product type normalization
const PRODUCT_ALIASES: Record<string, ProductType> = {
  'account': 'account',
  'acc': 'account',
  'current account': 'account',
  'savings account': 'account',
  'business account': 'account',
  'loan': 'loan',
  'credit': 'loan',
  'financing': 'loan',
  'business loan': 'loan',
};

export const useBulkLeadImport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = useState<ImportedLeadRow[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase().trim().replace(/[_\-]/g, ' ');
  };

  const findColumnMapping = (headers: string[]): Record<string, number> => {
    const mapping: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const normalized = normalizeColumnName(header);
      
      for (const [field, patterns] of Object.entries(COLUMN_MAPPINGS)) {
        if (patterns.some(pattern => normalized.includes(pattern) || pattern.includes(normalized))) {
          if (!mapping[field]) {
            mapping[field] = index;
          }
        }
      }
    });

    return mapping;
  };

  const normalizeProductType = (value: string | undefined): ProductType => {
    if (!value) return 'account';
    const normalized = value.toLowerCase().trim();
    return PRODUCT_ALIASES[normalized] || 'account';
  };

  const normalizeBankName = (value: string | undefined, productType: ProductType): BankName => {
    if (!value) return productType === 'loan' ? 'WIO' : 'RAK';
    const normalized = value.toLowerCase().trim();
    const bank = BANK_ALIASES[normalized];
    
    if (bank) {
      // Validate bank is available for product type
      const availableBanks = productType === 'loan' ? LOAN_BANKS : ACCOUNT_BANKS;
      if (availableBanks.some(b => b.value === bank)) {
        return bank;
      }
      // Fall back to first available bank for this product
      return availableBanks[0].value;
    }
    
    return productType === 'loan' ? 'WIO' : 'RAK';
  };

  const validateRow = (row: Partial<ImportedLeadRow>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!row.companyName?.trim()) {
      errors.push('Company name is required');
    }
    if (!row.contactPersonName?.trim()) {
      errors.push('Contact person name is required');
    }
    if (!row.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    }
    if (!row.tradeLicenseNumber?.trim()) {
      errors.push('Trade license number is required');
    }

    return { isValid: errors.length === 0, errors };
  };

  const parseExcelFile = async (file: File): Promise<ImportedLeadRow[]> => {
    setIsParsingFile(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error('Excel file must have at least a header row and one data row');
        return [];
      }

      const headers = (jsonData[0] as string[]).map(h => String(h || ''));
      const columnMapping = findColumnMapping(headers);

      const rows: ImportedLeadRow[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i] as any[];
        if (!rowData || rowData.every(cell => !cell)) continue; // Skip empty rows

        const getValue = (field: string): string => {
          const index = columnMapping[field];
          return index !== undefined ? String(rowData[index] || '').trim() : '';
        };

        const productType = normalizeProductType(getValue('productType'));
        const bankName = normalizeBankName(getValue('bankName'), productType);

        const row: Partial<ImportedLeadRow> = {
          companyName: getValue('companyName'),
          contactPersonName: getValue('contactPersonName'),
          phoneNumber: getValue('phoneNumber'),
          tradeLicenseNumber: getValue('tradeLicenseNumber'),
          city: getValue('city') || undefined,
          industry: getValue('industry') || undefined,
          productType,
          bankName,
          dealValue: getValue('dealValue') ? parseFloat(getValue('dealValue')) : undefined,
          notes: getValue('notes') || undefined,
        };

        const validation = validateRow(row);
        
        rows.push({
          ...row,
          isValid: validation.isValid,
          errors: validation.errors,
        } as ImportedLeadRow);
      }

      setParsedRows(rows);
      return rows;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Failed to parse Excel file');
      return [];
    } finally {
      setIsParsingFile(false);
    }
  };

  const importLeads = useMutation({
    mutationFn: async (rows: ImportedLeadRow[]): Promise<ImportResult> => {
      if (!user?.id) throw new Error('User not authenticated');

      const validRows = rows.filter(r => r.isValid);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of validRows) {
        try {
          // Check if contact already exists
          const { data: existingContact } = await supabase
            .from('master_contacts')
            .select('id')
            .or(`phone_number.eq.${row.phoneNumber},trade_license_number.eq.${row.tradeLicenseNumber}`)
            .single();

          let contactId: string;

          if (existingContact) {
            contactId = existingContact.id;
          } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
              .from('master_contacts')
              .insert({
                company_name: row.companyName,
                contact_person_name: row.contactPersonName,
                phone_number: row.phoneNumber,
                trade_license_number: row.tradeLicenseNumber,
                city: row.city,
                industry: row.industry,
                first_uploaded_by: user.id,
                current_owner_agent_id: user.id,
              })
              .select('id')
              .single();

            if (contactError) throw contactError;
            contactId = newContact.id;
          }

          // Check if lead already exists for this contact
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('contact_id', contactId)
            .eq('agent_id', user.id)
            .single();

          if (existingLead) {
            errors.push(`Lead already exists for ${row.companyName}`);
            failed++;
            continue;
          }

          // Create lead
          const { error: leadError } = await supabase
            .from('leads')
            .insert({
              contact_id: contactId,
              agent_id: user.id,
              lead_source: createLeadSource(row.productType, row.bankName),
              deal_value: row.dealValue,
              notes: row.notes,
              lead_status: 'new',
              lead_score: 50, // Default score
            });

          if (leadError) throw leadError;
          success++;
        } catch (error: any) {
          console.error('Error importing row:', error);
          errors.push(`Failed to import ${row.companyName}: ${error.message}`);
          failed++;
        }
      }

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} leads`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} leads`);
      }
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setParsedRows([]);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const clearParsedRows = () => {
    setParsedRows([]);
  };

  const updateRow = (index: number, updates: Partial<ImportedLeadRow>) => {
    setParsedRows(prev => {
      const newRows = [...prev];
      const updatedRow = { ...newRows[index], ...updates };
      
      // Re-validate after update
      const validation = validateRow(updatedRow);
      updatedRow.isValid = validation.isValid;
      updatedRow.errors = validation.errors;
      
      // If product type changed, validate bank
      if (updates.productType) {
        const availableBanks = updates.productType === 'loan' ? LOAN_BANKS : ACCOUNT_BANKS;
        if (!availableBanks.some(b => b.value === updatedRow.bankName)) {
          updatedRow.bankName = availableBanks[0].value;
        }
      }
      
      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const removeRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  return {
    parsedRows,
    isParsingFile,
    parseExcelFile,
    importLeads: importLeads.mutate,
    isImporting: importLeads.isPending,
    clearParsedRows,
    updateRow,
    removeRow,
  };
};
