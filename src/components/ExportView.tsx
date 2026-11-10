import React, { useState } from 'react';
import { TrainingSession, Attendee } from '../types';
import {
  buildAttendanceCsv,
  downloadAttendanceFile,
  generateSafeExportFilename,
  shareAttendanceFile,
} from '../services/csvExport';
import {
  FileText,
  Share2,
  Download,
  Printer,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface ExportViewProps {
  session: TrainingSession;
  attendees: Attendee[];
  onReturnToSession: () => void;
  onEndAndClearSession: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  session,
  attendees,
  onReturnToSession,
  onEndAndClearSession,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const filename = generateSafeExportFilename(session, 'csv');
  const csvContent = buildAttendanceCsv(session, attendees);

  // Native share sheet or download fallback
  const handleShare = async () => {
    setShareError(null);
    const result = await shareAttendanceFile(filename, csvContent, session.title);
    if (result.shared) {
      setExportSuccessNotice('Export shared successfully via system sheet.');
    } else {
      if (result.error) {
        setShareError(`System sharing unavailable (${result.error}). Downloading file instead.`);
      }
      // Download fallback
      handleDownload();
    }
  };

  const handleDownload = () => {
    downloadAttendanceFile(filename, csvContent);
    setExportSuccessNotice(`Downloaded ${filename} successfully.`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="export-view space-y-6">
      {/* Printable Area Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        #printable-roster {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-roster, #printable-roster * {
            visibility: visible;
          }
          #printable-roster {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="no-print flex items-center justify-between">
        <button
          type="button"
          onClick={onReturnToSession}
          className="btn btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Session</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Export &amp; Complete
        </span>
      </div>

      {exportSuccessNotice && (
        <div className="no-print p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{exportSuccessNotice}</span>
        </div>
      )}

      {shareError && (
        <div className="no-print p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{shareError}</span>
        </div>
      )}

      {/* Export Summary Card */}
      <div className="no-print p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          <span>Roster Export Summary</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-[11px] text-muted-foreground block mb-0.5">Session Title</span>
            <span className="font-semibold text-foreground truncate block">{session.title}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-[11px] text-muted-foreground block mb-0.5">Date</span>
            <span className="font-semibold text-foreground block">{session.date}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-[11px] text-muted-foreground block mb-0.5">Total Attendees</span>
            <span className="font-bold text-foreground text-sm block">{attendees.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-[11px] text-muted-foreground block mb-0.5">File Name</span>
            <span className="font-mono text-[11px] text-foreground truncate block" title={filename}>{filename}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs">
          <strong>Privacy reminder:</strong> This exported file contains real attendance records. Handle and distribute it strictly in compliance with your organizational policies.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print space-y-2">
        <button
          type="button"
          onClick={handleShare}
          className="btn btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          <Share2 className="w-4 h-4" />
          <span>Share File (System Share Sheet)</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-secondary py-3 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-outline py-3 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground pt-1">
          For email: use system share sheet or download and attach in your approved mail client.
        </p>
      </div>

      {/* End Session Section */}
      <div className="no-print pt-4 border-t border-border">
        {showDeleteConfirm ? (
          <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Permanently Clear Session Data?</p>
                <p className="text-xs mt-1 text-destructive/90">
                  Ensure you have downloaded or shared the attendance file before proceeding. All in-memory records and local storage will be erased.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost text-xs flex-1 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onEndAndClearSession}
                className="btn btn-destructive text-xs flex-1 py-2 font-bold"
              >
                Yes, Delete &amp; Reset
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-outline border-destructive/30 text-destructive hover:bg-destructive/10 w-full py-3 text-xs font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>End Session &amp; Erase Records</span>
          </button>
        )}
      </div>

      {/* Clean Printable Roster View (Hidden on screen, visible during window.print) */}
      <div id="printable-roster" className="hidden print:block p-6 bg-white text-black font-sans">
        <div className="border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase">{session.title}</h1>
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div>
              <strong>Date:</strong> {session.date} {session.startTime ? `at ${session.startTime}` : ''}
            </div>
            <div>
              <strong>Instructor:</strong> {session.instructor || 'N/A'}
            </div>
            <div>
              <strong>Location:</strong> {session.location || 'N/A'}
            </div>
            <div>
              <strong>Total Attendees:</strong> {attendees.length}
            </div>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-black font-bold">
              <th className="py-2 px-1 w-10">#</th>
              <th className="py-2 px-2">Attendee Name</th>
              <th className="py-2 px-2">Time</th>
              <th className="py-2 px-2">Method</th>
              {session.exportFields.includeUnit && <th className="py-2 px-2">Unit</th>}
              <th className="py-2 px-2 w-32">Signature / Initial</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a, i) => (
              <tr key={a.id} className="border-b border-gray-300">
                <td className="py-2 px-1 font-mono">{i + 1}</td>
                <td className="py-2 px-2 font-mono font-semibold">{a.displayName}</td>
                <td className="py-2 px-2 font-mono text-gray-600">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2 px-2 capitalize">{a.entryMethod}</td>
                {session.exportFields.includeUnit && <td className="py-2 px-2">{a.unit || '-'}</td>}
                <td className="py-2 px-2 border-l border-gray-200"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 text-[10px] text-gray-500 text-center border-t border-gray-300 pt-2">
          Generated locally with Training Check-In &bull; Session ID: {session.id}
        </div>
      </div>
    </div>
  );
};

