import type { EstimationValue, SessionSummary, ExportData } from './types.js';
import { ESTIMATION_SCALES } from './types.js';

// Utility functions for estimation calculations
export const calculateAverage = (votes: EstimationValue[]): number | null => {
  const numericVotes = votes
    .filter((vote): vote is number => typeof vote === 'number')
    .filter(vote => vote > 0);
  
  if (numericVotes.length === 0) return null;
  
  return numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;
};

export const calculateMedian = (votes: EstimationValue[]): number | null => {
  const numericVotes = votes
    .filter((vote): vote is number => typeof vote === 'number')
    .filter(vote => vote > 0)
    .sort((a, b) => a - b);
  
  if (numericVotes.length === 0) return null;
  
  const mid = Math.floor(numericVotes.length / 2);
  
  if (numericVotes.length % 2 === 0) {
    return (numericVotes[mid - 1] + numericVotes[mid]) / 2;
  } else {
    return numericVotes[mid];
  }
};

export const suggestEstimate = (votes: EstimationValue[]): EstimationValue | null => {
  if (votes.length === 0) return null;
  
  // Count vote frequency
  const voteCount = votes.reduce((acc, vote) => {
    acc[String(vote)] = (acc[String(vote)] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Find most frequent vote
  const mostFrequent = Object.entries(voteCount)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (mostFrequent) {
    const vote = mostFrequent[0];
    // Try to convert to number if possible
    const numVote = Number(vote);
    return isNaN(numVote) ? vote as EstimationValue : numVote;
  }
  
  return null;
};

// Session code generation
export const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Session ID generation
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Participant ID generation
export const generateParticipantId = (): string => {
  return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Story ID generation
export const generateStoryId = (): string => {
  return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Validation helpers
export const isValidEstimationValue = (value: unknown, scale: keyof typeof ESTIMATION_SCALES): boolean => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }
  
  const scaleValues = ESTIMATION_SCALES[scale];
  return scaleValues.includes(value as any);
};

// Export utilities
export const exportToCSV = (summary: SessionSummary): ExportData => {
  const headers = ['Story Title', 'Final Estimate', ...summary.participants, 'Votes'];
  const rows = summary.stories.map(story => {
    const row = [
      `"${story.title}"`,
      story.finalEstimate || 'Not estimated',
      ...summary.participants.map(participant => story.votes[participant] || 'No vote'),
      Object.values(story.votes).join(', ') || 'No votes'
    ];
    return row.join(',');
  });
  
  const csv = [headers.join(','), ...rows].join('\n');
  
  return {
    format: 'csv',
    data: csv,
    filename: `planning_poker_${summary.sessionId}_${new Date().toISOString().split('T')[0]}.csv`
  };
};

export const exportToText = (summary: SessionSummary): ExportData => {
  const lines: string[] = [];
  
  lines.push(`Planning Poker Session Results`);
  lines.push(`Session: ${summary.title}`);
  lines.push(`Date: ${summary.createdAt.toLocaleDateString()}`);
  lines.push(`Participants: ${summary.participants.join(', ')}`);
  lines.push(`Total Stories: ${summary.totalStories}`);
  lines.push(`Completed Stories: ${summary.completedStories}`);
  lines.push('');
  
  lines.push('Story Estimates:');
  lines.push('=' .repeat(50));
  
  summary.stories.forEach((story, index) => {
    lines.push(`${index + 1}. ${story.title}`);
    lines.push(`   Final Estimate: ${story.finalEstimate || 'Not estimated'}`);
    lines.push(`   Votes:`);
    
    Object.entries(story.votes).forEach(([participant, vote]) => {
      lines.push(`     ${participant}: ${vote}`);
    });
    
    lines.push('');
  });
  
  const text = lines.join('\n');
  
  return {
    format: 'text',
    data: text,
    filename: `planning_poker_${summary.sessionId}_${new Date().toISOString().split('T')[0]}.txt`
  };
};

// Time utilities
export const formatDuration = (start: Date, end?: Date): string => {
  const endTime = end || new Date();
  const diffMs = endTime.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  } else {
    return `${diffMins}m`;
  }
};

export const isSessionExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

export const getSessionExpiryTime = (createdAt: Date, hoursToExpire: number = 2): Date => {
  const expiryTime = new Date(createdAt);
  expiryTime.setHours(expiryTime.getHours() + hoursToExpire);
  return expiryTime;
};