import { useState, useRef } from 'react';
import { useBulkLeadImport, ImportedLeadRow } from '@/hooks/useBulkLeadImport';
import { ProductType, BankName, PRODUCT_TYPES, ACCOUNT_BANKS, LOAN_BANKS } from '@/hooks/useLeads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkLeadImportProps {
  onImportComplete?: () => void;
}

export const BulkLeadImport = ({ onImportComplete }: BulkLeadImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    parsedRows,
    isParsingFile,
    parseExcelFile,
    importLeads,
    isImporting,
    clearParsedRows,
    updateRow,
    removeRow,
  } = useBulkLeadImport();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await parseExcelFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      return;
    }
    importLeads(validRows, {
      onSuccess: () => {
        setIsOpen(false);
        onImportComplete?.();
      },
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    clearParsedRows();
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Company Name', 'Contact Person', 'Phone Number', 'Trade License', 'City', 'Industry', 'Product Type', 'Bank', 'Deal Value', 'Notes'],
      ['ABC Trading LLC', 'John Smith', '+971501234567', 'TL-123456', 'Dubai', 'Trading', 'Account', 'RAK', '50000', 'Interested in business account'],
      ['XYZ Services', 'Jane Doe', '+971502345678', 'TL-234567', 'Abu Dhabi', 'Services', 'Loan', 'NBF', '100000', 'Needs business loan'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
    XLSX.writeFile(wb, 'lead_import_template.xlsx');
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  const getAvailableBanks = (productType: ProductType) => {
    return productType === 'loan' ? LOAN_BANKS : ACCOUNT_BANKS;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Lead Import
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple leads at once. Columns will be automatically mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              {/* Upload Area */}
              <Card className="border-dashed">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Upload Excel File</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to select an Excel file (.xlsx, .xls)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsingFile}
                      >
                        {isParsingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Select File
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Column Mapping Info */}
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Auto-mapping:</strong> Columns are matched by name. Ensure your file has headers like: 
                  Company Name, Contact Person, Phone Number, Trade License, City, Industry, Product Type (Account/Loan), Bank (RAK, NBF, UBL, RUYA, MASHREQ, WIO), Deal Value, Notes
                </AlertDescription>
              </Alert>

              {/* Product/Bank Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">🏦 Account Products</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Available banks: {ACCOUNT_BANKS.map(b => b.label).join(', ')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">💰 Loan Products</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Available banks: {LOAN_BANKS.map(b => b.label).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {invalidCount} Invalid
                  </Badge>
                )}
                <Badge variant="outline">
                  {parsedRows.length} Total Rows
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearParsedRows}
                  className="ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>

              {/* Preview Table */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Company</th>
                      <th className="text-left p-2 font-medium">Contact</th>
                      <th className="text-left p-2 font-medium">Phone</th>
                      <th className="text-left p-2 font-medium">Product</th>
                      <th className="text-left p-2 font-medium">Bank</th>
                      <th className="text-left p-2 font-medium">Deal Value</th>
                      <th className="text-left p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`border-b ${!row.isValid ? 'bg-destructive/5' : ''}`}
                      >
                        <td className="p-2">
                          {row.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-destructive" />
                              <span className="text-xs text-destructive">
                                {row.errors.join(', ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.companyName}
                            onChange={(e) => updateRow(index, { companyName: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.contactPersonName}
                            onChange={(e) => updateRow(index, { contactPersonName: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.phoneNumber}
                            onChange={(e) => updateRow(index, { phoneNumber: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={row.productType}
                            onValueChange={(v) => updateRow(index, { productType: v as ProductType })}
                          >
                            <SelectTrigger className="h-8 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCT_TYPES.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.icon} {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select
                            value={row.bankName}
                            onValueChange={(v) => updateRow(index, { bankName: v as BankName })}
                          >
                            <SelectTrigger className="h-8 text-xs w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableBanks(row.productType).map(b => (
                                <SelectItem key={b.value} value={b.value}>
                                  {b.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={row.dealValue || ''}
                            onChange={(e) => updateRow(index, { dealValue: parseFloat(e.target.value) || undefined })}
                            className="h-8 text-xs w-24"
                            placeholder="AED"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRow(index)}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {parsedRows.length > 0 && (
            <Button 
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {validCount} Leads
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLeadImport;
