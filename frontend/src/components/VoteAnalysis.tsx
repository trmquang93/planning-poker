import React from 'react';
import { analyzeVotes, calculateStoryStats } from '../shared/utils';
import type { Session, Story, EstimationValue } from '../shared/types';

interface VoteAnalysisProps {
  session: Session;
  story: Story;
  isVisible: boolean;
}

const VoteAnalysis: React.FC<VoteAnalysisProps> = ({ session, story, isVisible }) => {
  if (!isVisible || Object.keys(story.votes).length === 0) {
    return null;
  }

  const voteValues = Object.values(story.votes);
  const analysis = analyzeVotes(voteValues, session.scale);

  const getConsensusColor = (consensus: string) => {
    switch (consensus) {
      case 'strong': return 'text-green-700 bg-green-50 border-green-200';
      case 'moderate': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'weak': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'no-consensus': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getConsensusIcon = (consensus: string) => {
    switch (consensus) {
      case 'strong': return '🎯';
      case 'moderate': return '👍';
      case 'weak': return '🤔';
      case 'no-consensus': return '💭';
      default: return '📊';
    }
  };

  const getDisagreementLevel = (disagreement: number) => {
    if (disagreement === 0) return 'Perfect agreement';
    if (disagreement < 25) return 'Low disagreement';
    if (disagreement < 50) return 'Moderate disagreement';
    if (disagreement < 75) return 'High disagreement';
    return 'Very high disagreement';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        📊 Vote Analysis
      </h4>

      {/* Consensus Assessment */}
      <div className={`p-3 rounded-lg border mb-4 ${getConsensusColor(analysis.consensus)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getConsensusIcon(analysis.consensus)}</span>
            <span className="font-medium capitalize">
              {analysis.consensus.replace('-', ' ')} Consensus
            </span>
          </div>
          {analysis.suggestion && (
            <span className="font-bold text-lg">
              Suggested: {analysis.suggestion}
            </span>
          )}
        </div>
        <p className="text-sm">{analysis.analysis}</p>
      </div>

      {/* Vote Distribution */}
      <div className="mb-4">
        <h5 className="font-medium text-gray-800 mb-2">Vote Distribution</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(analysis.voteDistribution || {}).map(([vote, count]) => {
            const countNum = Number(count);
            const percentage = (countNum / (analysis.totalVotes || 1)) * 100;
            return (
              <div key={vote} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-lg bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {vote}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium text-gray-700">×{countNum}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[40px]">
                    <div 
                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 min-w-[30px]">{Math.round(percentage)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
        {analysis.average && (
          <div className="text-center">
            <div className="font-semibold text-gray-900">{analysis.average}</div>
            <div className="text-gray-500">Average</div>
          </div>
        )}
        {analysis.median && (
          <div className="text-center">
            <div className="font-semibold text-gray-900">{analysis.median}</div>
            <div className="text-gray-500">Median</div>
          </div>
        )}
        <div className="text-center">
          <div className="font-semibold text-gray-900">{analysis.uniqueVotes}</div>
          <div className="text-gray-500">Unique Votes</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{analysis.disagreement}%</div>
          <div className="text-gray-500">Disagreement</div>
        </div>
      </div>

      {/* Disagreement Assessment */}
      {analysis.disagreement > 0 && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Disagreement Level:</strong> {getDisagreementLevel(analysis.disagreement)}
          {analysis.disagreement > 50 && (
            <span className="block mt-1">
              💡 High disagreement suggests the team may benefit from discussing the story requirements before re-voting.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VoteAnalysis;