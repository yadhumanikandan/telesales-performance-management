import { useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';

interface ConvertToLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConvert: (contactId: string, tradeLicenseNumber: string) => void;
  isConverting: boolean;
}

export const ConvertToLeadDialog = ({
  open,
  onOpenChange,
  lead,
  onConvert,
  isConverting,
}: ConvertToLeadDialogProps) => {
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !tradeLicenseNumber.trim()) return;
    onConvert(lead.contactId, tradeLicenseNumber);
    setTradeLicenseNumber('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setTradeLicenseNumber('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Convert to Lead
          </DialogTitle>
          <DialogDescription>
            Enter the trade license number to convert this opportunity into a qualified lead.
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <p className="font-medium">{lead.companyName}</p>
              <p className="text-sm text-muted-foreground">{lead.contactPersonName}</p>
              <p className="text-sm text-muted-foreground">{lead.phoneNumber}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeLicense">Trade License Number</Label>
              <Input
                id="tradeLicense"
                placeholder="Enter trade license number"
                value={tradeLicenseNumber}
                onChange={(e) => setTradeLicenseNumber(e.target.value)}
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!tradeLicenseNumber.trim() || isConverting}
                className="gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    Convert to Lead
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
