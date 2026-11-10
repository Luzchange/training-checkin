import React, { useState } from 'react';
import { TrainingSession } from '../types';
import { Calendar, Clock, MapPin, User, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

interface SessionSetupProps {
  onSessionCreated: (session: TrainingSession) => void;
  onCancel: () => void;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({ onSessionCreated, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [instructor, setInstructor] = useState('');
  const [location, setLocation] = useState('');
  const [includeUnit, setIncludeUnit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Training title is required.');
      return;
    }

    if (!date.trim()) {
      setError('Training date is required.');
      return;
    }

    // Application-generated UUID v4
    const sessionId = crypto.randomUUID();

    const newSession: TrainingSession = {
      id: sessionId,
      title: title.trim(),
      date: date.trim(),
      startTime: startTime.trim() || undefined,
      instructor: instructor.trim() || undefined,
      location: location.trim() || undefined,
      createdAt: new Date().toISOString(),
      exportFields: {
        includeUnit,
      },
    };

    onSessionCreated(newSession);
  };

  return (
    <div className="session-setup space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to welcome"
          className="btn btn-ghost p-2 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Create Training Session</h2>
          <p className="text-xs text-muted-foreground">Setup session metadata for attendance export</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="session-title" className="block text-sm font-semibold text-foreground mb-1">
            Training Title <span className="text-destructive">*</span>
          </label>
          <input
            id="session-title"
            type="text"
            required
            placeholder="e.g., Annual Cyber Awareness Challenge"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            className="input w-full"
          />
        </div>

        {/* Date & Start Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="session-date" className="block text-sm font-semibold text-foreground mb-1">
              Date <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="session-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-full pl-9"
              />
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="session-time" className="block text-sm font-medium text-foreground mb-1">
              Start Time (Optional)
            </label>
            <div className="relative">
              <input
                id="session-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input w-full pl-9"
              />
              <Clock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div>
          <label htmlFor="session-instructor" className="block text-sm font-medium text-foreground mb-1">
            Instructor / Facilitator (Optional)
          </label>
          <div className="relative">
            <input
              id="session-instructor"
              type="text"
              placeholder="e.g., Capt. Miller"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="input w-full pl-9"
            />
            <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="session-location" className="block text-sm font-medium text-foreground mb-1">
            Location / Classroom (Optional)
          </label>
          <div className="relative">
            <input
              id="session-location"
              type="text"
              placeholder="e.g., Bldg 400 Auditorium"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input w-full pl-9"
            />
            <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Review Export Fields */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Attendee Data Retention Settings
          </p>
          <label className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer">
            <div className="text-xs pr-2">
              <span className="font-semibold block text-foreground mb-0.5">Include Unit / Organization field</span>
              <span className="text-muted-foreground block leading-relaxed">
                By default, only Display Name, Check-in Time, and Entry Method are retained. Check this if your roster requires unit/branch.
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeUnit}
              onChange={(e) => setIncludeUnit(e.target.checked)}
              className="checkbox w-5 h-5 flex-shrink-0 mt-0.5"
            />
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full py-3.5 text-base font-semibold flex items-center justify-center gap-2 mt-4"
        >
          <span>Continue to Scanner</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

