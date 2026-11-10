import React, { useState } from 'react';
import { BarcodeParseResult } from '../types';
import { CheckCircle2, AlertTriangle, X, Check, Edit2, AlertCircle } from 'lucide-react';

interface ScanConfirmationModalProps {
  result: BarcodeParseResult;
  isPossibleDuplicate: boolean;
  existingAttendeeTime?: string;
  includeUnitField: boolean;
  onConfirm: (displayName: string, unit?: string, allowDuplicate?: boolean) => void;
  onCancel: () => void;
}

export const ScanConfirmationModal: React.FC<ScanConfirmationModalProps> = ({
  result,
  isPossibleDuplicate,
  existingAttendeeTime,
  includeUnitField,
  onConfirm,
  onCancel,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(result.displayName || '');
  const [editedUnit, setEditedUnit] = useState(result.unit || '');

  // Unsupported or malformed scan fallback state
  if (result.status !== 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-start gap-3 text-destructive">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base text-foreground">Scan Not Processed</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.errorMessage || 'Barcode format not supported—use manual entry.'}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg leading-relaxed">
            Note: Only the front 2D barcode (PDF417) contains cardholder name details. The linear Code 39 barcode on the back does not contain a display name.
          </p>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-primary w-full py-2.5 text-sm font-semibold"
            >
              Continue Scanning
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirmAction = () => {
    if (!editedName.trim()) return;
    onConfirm(editedName.trim(), includeUnitField ? editedUnit.trim() : undefined, isPossibleDuplicate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-attendee-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 id="confirm-attendee-title" className="font-bold text-base text-foreground">
              {result.isSynthetic ? 'Synthetic Scan Result' : 'Confirm Check-In'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Dismiss scan"
            className="btn btn-ghost p-1.5 rounded-lg text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate warning banner */}
        {isPossibleDuplicate && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Possible Duplicate Attendee</p>
              <p>
                An attendee with this exact name was already checked in at{' '}
                <span className="font-mono font-medium">
                  {existingAttendeeTime ? new Date(existingAttendeeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier'}
                </span>
                .
              </p>
            </div>
          </div>
        )}

        {/* Uncertainty or synthetic notice */}
        {result.uncertaintyWarning && (
          <p className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-lg">
            {result.uncertaintyWarning}
          </p>
        )}

        {/* Card Details / Edit Form */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="confirm-name" className="text-xs font-semibold text-muted-foreground uppercase">
                Attendee Name
              </label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-primary flex items-center gap-1 hover:underline font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Correct</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <input
                id="confirm-name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="input w-full font-mono text-sm uppercase"
                autoFocus
              />
            ) : (
              <div className="p-3 rounded-xl bg-muted/40 border border-border font-mono font-bold text-base text-foreground">
                {editedName}
              </div>
            )}
          </div>

          {includeUnitField && (
            <div>
              <label htmlFor="confirm-unit" className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Unit / Organization (Optional)
              </label>
              <input
                id="confirm-unit"
                type="text"
                value={editedUnit}
                onChange={(e) => setEditedUnit(e.target.value)}
                placeholder="e.g. 1st Cyber Bde"
                className="input w-full text-sm"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          {isPossibleDuplicate ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary flex-1 py-3 text-sm font-semibold"
              >
                Keep Existing (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="btn btn-primary flex-1 py-3 text-sm font-semibold"
              >
                Add Separate
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-ghost flex-1 py-3 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="btn btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Check-In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

