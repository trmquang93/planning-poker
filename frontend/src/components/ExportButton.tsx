import React, { useState } from 'react';
import { exportToCSV, exportToText } from '@shared/utils';
import type { Session } from '@shared/types';

interface ExportButtonProps {
  session: Session;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ session, disabled = false }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const downloadFile = (data: string, filename: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const createSessionSummary = () => {
    const completedStories = session.stories.filter(s => s.status === 'completed');
    
    return {
      sessionId: session.id,
      title: session.title,
      createdAt: session.createdAt,
      participants: session.participants.map(p => p.name),
      totalStories: session.stories.length,
      completedStories: completedStories.length,
      stories: completedStories.map(story => ({
        title: story.title,
        finalEstimate: story.finalEstimate,
        votes: story.votes
      }))
    };
  };

  const handleExportCSV = async () => {
    if (disabled) return;
    
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      const summary = createSessionSummary();
      const exportData = exportToCSV(summary);
      downloadFile(exportData.data, exportData.filename, 'text/csv');
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportText = async () => {
    if (disabled) return;
    
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      const summary = createSessionSummary();
      const exportData = exportToText(summary);
      downloadFile(exportData.data, exportData.filename, 'text/plain');
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    } finally {
      setIsExporting(false);
    }
  };

  const completedStories = session.stories.filter(s => s.status === 'completed');
  const hasCompletedStories = completedStories.length > 0;

  if (!hasCompletedStories) {
    return (
      <button
        disabled
        className="text-sm text-gray-400 cursor-not-allowed"
        title="No completed stories to export"
      >
        📊 Export (No data)
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isExporting}
        className={`text-sm px-3 py-2 rounded-md transition-colors ${
          disabled || isExporting
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
        }`}
      >
        {isExporting ? '⏳ Exporting...' : '📊 Export Results'}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={handleExportCSV}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              📄 Export as CSV
              <div className="text-xs text-gray-500">Spreadsheet format</div>
            </button>
            <button
              onClick={handleExportText}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              📝 Export as Text
              <div className="text-xs text-gray-500">Human-readable format</div>
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default ExportButton;