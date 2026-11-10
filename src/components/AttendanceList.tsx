import React, { useState } from 'react';
import { Attendee } from '../types';
import { Search, Trash2, Edit3, Check, X, Undo, Users } from 'lucide-react';

interface AttendanceListProps {
  attendees: Attendee[];
  includeUnitField: boolean;
  onUpdateAttendee: (id: string, newDisplayName: string, newUnit?: string) => void;
  onDeleteAttendee: (id: string) => void;
  onUndoLastCheckIn: () => void;
  canUndo: boolean;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  attendees,
  includeUnitField,
  onUpdateAttendee,
  onDeleteAttendee,
  onUndoLastCheckIn,
  canUndo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const filteredAttendees = attendees.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchName = a.displayName.toLowerCase().includes(q);
    const matchUnit = a.unit ? a.unit.toLowerCase().includes(q) : false;
    return matchName || matchUnit;
  });

  const startEdit = (a: Attendee) => {
    setEditingId(a.id);
    setEditName(a.displayName);
    setEditUnit(a.unit || '');
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateAttendee(id, editName.trim(), includeUnitField ? editUnit.trim() : undefined);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="attendance-list space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Attendance Roster</h3>
            <p className="text-xs text-muted-foreground">
              {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'} recorded
            </p>
          </div>
        </div>

        {canUndo && (
          <button
            type="button"
            onClick={onUndoLastCheckIn}
            className="btn btn-outline text-xs py-2 px-3 flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Undo className="w-3.5 h-3.5 text-amber-600" />
            <span>Undo Last Scan</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by attendee name or unit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-9 text-sm"
        />
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Attendee Items */}
      {filteredAttendees.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl p-6 text-muted-foreground">
          <p className="text-sm font-medium">
            {searchQuery ? 'No attendees match your search.' : 'No attendees checked in yet.'}
          </p>
          <p className="text-xs mt-1">
            {searchQuery ? 'Try a different search term.' : 'Use the scanner or manual entry to add participants.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredAttendees.map((attendee, index) => {
            const isEditing = editingId === attendee.id;
            const timeStr = new Date(attendee.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={attendee.id}
                className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm hover:border-primary/30 transition-colors"
              >
                {isEditing ? (
                  <div className="w-full space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input w-full text-sm font-mono uppercase"
                      autoFocus
                    />
                    {includeUnitField && (
                      <input
                        type="text"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        placeholder="Unit / Organization"
                        className="input w-full text-xs"
                      />
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-ghost text-xs px-2.5 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(attendee.id)}
                        className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xs font-mono font-medium text-muted-foreground w-6 text-right pt-0.5">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-foreground text-sm truncate">
                          {attendee.displayName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{timeStr}</span>
                          <span>&bull;</span>
                          <span className="capitalize">{attendee.entryMethod}</span>
                          {attendee.unit && (
                            <>
                              <span>&bull;</span>
                              <span className="text-primary font-medium">{attendee.unit}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => startEdit(attendee)}
                        title="Edit Attendee"
                        aria-label={`Edit ${attendee.displayName}`}
                        className="btn btn-ghost p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAttendee(attendee.id)}
                        title="Delete Attendee"
                        aria-label={`Delete ${attendee.displayName}`}
                        className="btn btn-ghost p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

