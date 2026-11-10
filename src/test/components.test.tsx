import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { AttendanceList } from '../components/AttendanceList';
import { ScanConfirmationModal } from '../components/ScanConfirmationModal';
import { Attendee } from '../types';

describe('UI Components Integration', () => {
  it('renders welcome screen with mandatory privacy copy', () => {
    render(
      <WelcomeScreen
        onCreateSession={() => {}}
        onResumeSession={() => {}}
        onTrySyntheticDemo={() => {}}
        savedSession={null}
        onOpenPrivacySettings={() => {}}
      />
    );

    expect(
      screen.getByText(/Use only where authorized by your organization/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Camera images and attendance records are processed locally by this app/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Training Session/i })
    ).toBeInTheDocument();
  });

  it('renders duplicate warning in ScanConfirmationModal when same name is scanned', () => {
    let confirmed = false;
    render(
      <ScanConfirmationModal
        result={{
          status: 'success',
          displayName: 'CONNOR, SARAH',
        }}
        isPossibleDuplicate={true}
        existingAttendeeTime={new Date().toISOString()}
        includeUnitField={false}
        onConfirm={() => {
          confirmed = true;
        }}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/Possible Duplicate Attendee/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Separate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep Existing/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add Separate/i }));
    expect(confirmed).toBe(true);
  });

  it('filters and allows editing attendees in AttendanceList', () => {
    const attendees: Attendee[] = [
      {
        id: '1',
        sessionId: 'sess-1',
        displayName: 'CONNOR, SARAH',
        timestamp: new Date().toISOString(),
        entryMethod: 'scan',
      },
      {
        id: '2',
        sessionId: 'sess-1',
        displayName: 'REESE, KYLE',
        timestamp: new Date().toISOString(),
        entryMethod: 'manual',
      },
    ];

    let updatedName = '';
    render(
      <AttendanceList
        attendees={attendees}
        includeUnitField={false}
        onUpdateAttendee={(_id, newName) => {
          updatedName = newName;
        }}
        onDeleteAttendee={() => {}}
        onUndoLastCheckIn={() => {}}
        canUndo={true}
      />
    );

    expect(screen.getByText('CONNOR, SARAH')).toBeInTheDocument();
    expect(screen.getByText('REESE, KYLE')).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search by attendee name/i);
    fireEvent.change(searchInput, { target: { value: 'Kyle' } });

    expect(screen.queryByText('CONNOR, SARAH')).not.toBeInTheDocument();
    expect(screen.getByText('REESE, KYLE')).toBeInTheDocument();

    // Trigger edit
    fireEvent.change(searchInput, { target: { value: '' } });
    const editButtons = screen.getAllByTitle(/Edit Attendee/i);
    fireEvent.click(editButtons[0]);

    const editInput = screen.getByDisplayValue('CONNOR, SARAH');
    fireEvent.change(editInput, { target: { value: 'CONNOR, SARAH J' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(updatedName).toBe('CONNOR, SARAH J');
  });
});
