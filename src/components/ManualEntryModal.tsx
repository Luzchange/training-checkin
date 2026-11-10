import React, { useState } from 'react';
import { UserPlus, X, Check } from 'lucide-react';

interface ManualEntryModalProps {
  includeUnitField: boolean;
  onAddAttendee: (displayName: string, unit?: string) => void;
  onClose: () => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  includeUnitField,
  onAddAttendee,
  onClose,
}) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const l = lastName.trim().toUpperCase();
    const f = firstName.trim().toUpperCase();
    const m = middleInitial.trim().toUpperCase();

    if (!l && !f) {
      setError('Please provide at least a last name or first name.');
      return;
    }

    const displayName = m ? `${l}, ${f} ${m}` : `${l}, ${f}`;
    onAddAttendee(displayName, includeUnitField && unit.trim() ? unit.trim() : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-entry-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            <UserPlus className="w-5 h-5" />
            <h3 id="manual-entry-title" className="text-base text-foreground">
              Manual Check-In
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual entry dialog"
            className="btn btn-ghost p-1.5 rounded-lg text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <label htmlFor="manual-last" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                id="manual-last"
                type="text"
                required
                placeholder="DOE"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setError(null);
                }}
                className="input w-full uppercase font-mono text-sm"
                autoFocus
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="manual-first" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                id="manual-first"
                type="text"
                required
                placeholder="JOHN"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setError(null);
                }}
                className="input w-full uppercase font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label htmlFor="manual-mi" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                M.I.
              </label>
              <input
                id="manual-mi"
                type="text"
                maxLength={2}
                placeholder="A"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                className="input w-full uppercase font-mono text-sm text-center"
              />
            </div>
            {includeUnitField && (
              <div className="col-span-3">
                <label htmlFor="manual-unit" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Unit / Organization
                </label>
                <input
                  id="manual-unit"
                  type="text"
                  placeholder="e.g. 1st Cyber Bde"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>
            )}
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1 py-3 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Add Attendee</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

