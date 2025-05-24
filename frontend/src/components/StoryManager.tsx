import React, { useState } from 'react';
import type { Session, Story, Participant } from '../shared/types';
import { ESTIMATION_SCALES } from '../shared/types';
import { analyzeVotes } from '../shared/utils';
import VoteAnalysis from './VoteAnalysis';

interface StoryManagerProps {
  session: Session;
  currentParticipant: Participant;
  onAddStory: (title: string, description?: string) => void;
  onStartVoting: (storyId: string) => void;
  onRevealVotes: (storyId: string) => void;
  onFinalizeEstimate: (storyId: string, estimate: string | number) => void;
  onRevoteStory: (storyId: string) => void;
}

const StoryManager: React.FC<StoryManagerProps> = ({
  session,
  currentParticipant,
  onAddStory,
  onStartVoting,
  onRevealVotes,
  onFinalizeEstimate,
  onRevoteStory,
}) => {
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryDescription, setNewStoryDescription] = useState('');
  const [finalEstimate, setFinalEstimate] = useState<string | number>('');

  const isFacilitator = currentParticipant.role === 'facilitator';
  const currentStory = session.currentStoryId 
    ? session.stories.find(s => s.id === session.currentStoryId)
    : null;
  const revealedStory = session.status === 'revealing' && session.currentStoryId
    ? session.stories.find(s => s.id === session.currentStoryId)
    : null;

  const handleAddStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoryTitle.trim()) {
      onAddStory(newStoryTitle.trim(), newStoryDescription.trim() || undefined);
      setNewStoryTitle('');
      setNewStoryDescription('');
      setIsAddingStory(false);
    }
  };

  const handleFinalizeEstimate = (story: Story) => {
    if (finalEstimate) {
      onFinalizeEstimate(story.id, finalEstimate);
      setFinalEstimate('');
    }
  };

  const getStoryStatusIcon = (status: Story['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'voting':
        return '🗳️';
      case 'completed':
        return '✅';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Stories</h2>
        {isFacilitator && (
          <button
            onClick={() => setIsAddingStory(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Story
          </button>
        )}
      </div>

      {/* Add Story Form */}
      {isAddingStory && (
        <form onSubmit={handleAddStory} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <label htmlFor="storyTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              value={newStoryTitle}
              onChange={(e) => setNewStoryTitle(e.target.value)}
              placeholder="Enter story title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={200}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="storyDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="storyDescription"
              value={newStoryDescription}
              onChange={(e) => setNewStoryDescription(e.target.value)}
              placeholder="Enter story description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Add Story
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingStory(false);
                setNewStoryTitle('');
                setNewStoryDescription('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Current Voting Story */}
      {currentStory && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                {getStoryStatusIcon(currentStory.status)} Currently Voting
              </h3>
              <h4 className="font-medium text-gray-900 mb-1">{currentStory.title}</h4>
              {currentStory.description && (
                <p className="text-gray-600 text-sm mb-3">{currentStory.description}</p>
              )}
              <div className="text-sm text-blue-600">
                Votes: {Object.keys(currentStory.votes).length} / {session.participants.length}
              </div>
            </div>
            {isFacilitator && (
              <button
                onClick={() => onRevealVotes(currentStory.id)}
                disabled={Object.keys(currentStory.votes).length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reveal Votes
              </button>
            )}
          </div>
        </div>
      )}

      {/* Revealed Story (waiting for final estimate) */}
      {revealedStory && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">
            ✅ Votes Revealed
          </h3>
          <h4 className="font-medium text-gray-900 mb-3">{revealedStory.title}</h4>
          
          <div className="mb-4">
            <h5 className="font-medium text-gray-800 mb-2">Votes:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {Object.entries(revealedStory.votes).map(([participant, vote]) => (
                <div key={participant} className="flex items-center gap-2">
                  <span className="text-gray-600">{participant}:</span>
                  <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                    {vote}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Vote Analysis */}
          <VoteAnalysis
            session={session}
            story={revealedStory}
            isVisible={true}
          />

          {isFacilitator && (
            <div className="mt-4">
              {/* Smart Suggestions */}
              {(() => {
                const analysis = analyzeVotes(Object.values(revealedStory.votes), session.scale);
                return analysis.suggestion && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm text-blue-800">
                      <strong>💡 Suggested Estimate:</strong> {analysis.suggestion}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {analysis.analysis}
                    </div>
                    <button
                      onClick={() => setFinalEstimate(String(analysis.suggestion))}
                      className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Use Suggestion
                    </button>
                  </div>
                );
              })()}
              
              <div className="flex items-center gap-2">
                <select
                  value={finalEstimate}
                  onChange={(e) => setFinalEstimate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select final estimate...</option>
                  {ESTIMATION_SCALES[session.scale].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleFinalizeEstimate(revealedStory)}
                  disabled={!finalEstimate}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Finalize
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stories List */}
      <div className="space-y-3">
        {session.stories.map((story) => (
          <div
            key={story.id}
            className={`p-4 border rounded-lg ${
              story.status === 'voting' ? 'border-blue-300 bg-blue-50' :
              story.status === 'completed' ? 'border-green-300 bg-green-50' :
              'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getStoryStatusIcon(story.status)}</span>
                  <h4 className="font-medium text-gray-900">{story.title}</h4>
                  {story.finalEstimate && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      {story.finalEstimate}
                    </span>
                  )}
                </div>
                {story.description && (
                  <p className="text-gray-600 text-sm mb-2">{story.description}</p>
                )}
                {story.status === 'completed' && Object.keys(story.votes).length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Votes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(story.votes).map(([p, v]) => (
                        <span key={p} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                          {p}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {isFacilitator && (
                <div className="flex gap-2">
                  {story.status === 'pending' && !currentStory && (
                    <button
                      onClick={() => onStartVoting(story.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Start Voting
                    </button>
                  )}
                  {story.status === 'completed' && !currentStory && story.finalEstimate && (
                    <button
                      onClick={() => onRevoteStory(story.id)}
                      className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition-colors text-sm"
                      title="Start revoting on this story"
                    >
                      🔄 Revote
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {session.stories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No stories added yet.
            {isFacilitator && " Click 'Add Story' to get started."}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryManager;