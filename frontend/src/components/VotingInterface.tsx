import React, { useState, useCallback } from 'react';
import type { Session, Participant, EstimationValue } from '../shared/types';
import { ESTIMATION_SCALES } from '../shared/types';

interface VotingInterfaceProps {
  session: Session;
  currentParticipant: Participant;
  onSubmitVote: (storyId: string, vote: EstimationValue) => void;
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({
  session,
  currentParticipant,
  onSubmitVote,
}) => {
  const [selectedVote, setSelectedVote] = useState<EstimationValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStory = session.currentStoryId 
    ? session.stories.find(s => s.id === session.currentStoryId)
    : null;
  const hasVoted = currentStory ? currentParticipant.name in currentStory.votes : false;
  const myVote = currentStory ? currentStory.votes[currentParticipant.name] : null;
  const isVotingDisabled = session.status === 'revealing' || session.status === 'completed';

  const handleVoteSubmit = useCallback((vote: EstimationValue) => {
    if (isSubmitting || !currentStory || isVotingDisabled) {
      return; // Prevent submission when voting is disabled or during submission
    }
    
    setIsSubmitting(true);
    setSelectedVote(vote);
    onSubmitVote(currentStory.id, vote);
    
    // Reset submitting state after a short delay
    setTimeout(() => setIsSubmitting(false), 1000);
  }, [isSubmitting, currentStory, hasVoted, onSubmitVote]);

  const estimationValues = ESTIMATION_SCALES[session.scale];

  if (!currentStory) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Waiting for Voting</h3>
          <p className="text-gray-600">
            The facilitator will start voting when ready.
          </p>
        </div>
      </div>
    );
  }

  // Remove the early return for hasVoted - we want to show voting cards always

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vote on Story</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">{currentStory.title}</h4>
          {currentStory.description && (
            <p className="text-blue-800 text-sm">{currentStory.description}</p>
          )}
        </div>
        
        {/* Show current vote status */}
        {hasVoted && !isVotingDisabled && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-green-800 text-sm font-medium">✅ Your current vote: </span>
                <span className="text-green-900 font-semibold">{myVote}</span>
              </div>
              <span className="text-green-600 text-xs">Click another card to change your vote</span>
            </div>
          </div>
        )}
        
        {isVotingDisabled && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-800 text-sm font-medium">🔒 Voting is now closed</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {isVotingDisabled 
            ? `Final estimates using ${session.scale.replace('_', ' ')} scale:`
            : hasVoted 
              ? `Change your estimate using ${session.scale.replace('_', ' ')} scale:`
              : `Select your estimate using ${session.scale.replace('_', ' ')} scale:`
          }
        </h4>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {estimationValues.map((value) => {
            const isCurrentVote = hasVoted && myVote === value;
            const isDisabled = isSubmitting || isVotingDisabled;
            
            return (
              <button
                key={value}
                onClick={() => handleVoteSubmit(value)}
                disabled={isDisabled}
                className={`
                  aspect-square p-4 border-2 rounded-lg font-semibold text-lg
                  transition-all duration-200 
                  ${!isDisabled ? 'hover:scale-105 active:scale-95' : ''}
                  ${isDisabled
                    ? 'border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed'
                    : isCurrentVote
                      ? 'border-green-500 bg-green-500 text-white shadow-lg ring-2 ring-green-200' 
                      : selectedVote === value 
                        ? 'border-blue-500 bg-blue-500 text-white shadow-lg' 
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                {value}
                {isCurrentVote && <div className="text-xs mt-1">✓</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm text-gray-500 mb-3">
          Votes submitted: {Object.keys(currentStory.votes).length} / {session.participants.length}
        </div>
        
        {/* Participant status list with names visible */}
        <div className="space-y-2 mb-3">
          {session.participants.map((participant) => {
            const hasVoted = participant.name in currentStory.votes;
            const isOnline = participant.isOnline;
            
            return (
              <div
                key={participant.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`
                      w-3 h-3 rounded-full flex-shrink-0
                      ${hasVoted 
                        ? 'bg-green-500' 
                        : isOnline 
                          ? 'bg-gray-300' 
                          : 'bg-red-300'
                      }
                    `}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {participant.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {hasVoted 
                    ? '✅ Voted' 
                    : isOnline 
                      ? '⏳ Pending' 
                      : '🔴 Offline'
                  }
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-xs text-gray-400">
          🟢 Voted • ⚪ Pending • 🔴 Offline
        </div>
      </div>

      {session.status === 'revealing' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h4 className="font-medium text-yellow-900 mb-2">Votes Revealed!</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(currentStory.votes).map(([participant, vote]) => (
                <div key={participant} className="flex justify-between">
                  <span className="text-yellow-700">{participant}:</span>
                  <span className="font-medium text-yellow-900">{vote}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingInterface;