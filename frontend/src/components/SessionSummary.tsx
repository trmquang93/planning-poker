import React from 'react';
import { calculateStoryStats, formatDuration } from '@shared/utils';
import type { Session } from '@shared/types';

interface SessionSummaryProps {
  session: Session;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ session }) => {
  const stats = calculateStoryStats(session.stories);
  const duration = formatDuration(session.createdAt);

  const getProgressPercentage = () => {
    return stats.totalStories > 0 ? Math.round((stats.completedStories / stats.totalStories) * 100) : 0;
  };

  const getVelocityColor = (velocity: number) => {
    if (velocity === 0) return 'text-gray-600';
    if (velocity < 20) return 'text-green-600';
    if (velocity < 50) return 'text-blue-600';
    if (velocity < 100) return 'text-yellow-600';
    return 'text-purple-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Session Summary</h2>
        <div className="text-sm text-gray-500">Duration: {duration}</div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">
            {stats.completedStories} of {stats.totalStories} stories
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          {getProgressPercentage()}% complete
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalStories}</div>
          <div className="text-sm text-blue-700">Total Stories</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.completedStories}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingStories}</div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.votingStories}</div>
          <div className="text-sm text-purple-700">In Voting</div>
        </div>
      </div>

      {/* Estimation Summary */}
      {stats.completedStories > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium text-gray-800 mb-3">Estimation Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className={`text-xl font-bold ${getVelocityColor(stats.totalStoryPoints)}`}>
                {stats.totalStoryPoints}
              </div>
              <div className="text-sm text-gray-600">Total Story Points</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-700">
                {stats.averageEstimate}
              </div>
              <div className="text-sm text-gray-600">Average Estimate</div>
            </div>
          </div>
          
          {stats.totalStoryPoints > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Sprint Velocity:</strong> {stats.estimatedVelocity} story points
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Based on completed estimations in this session
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participants Summary */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="font-medium text-gray-800 mb-3">Team Participation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {session.participants.filter(p => p.isOnline).length}
            </div>
            <div className="text-sm text-green-700">Online</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-600">
              {session.participants.length}
            </div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex flex-wrap gap-2">
          {stats.completedStories > 0 && (
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              ✅ {stats.completedStories} stories estimated
            </div>
          )}
          {stats.pendingStories > 0 && (
            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              ⏳ {stats.pendingStories} stories remaining
            </div>
          )}
          {stats.votingStories > 0 && (
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded animate-pulse">
              🗳️ Voting in progress
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;