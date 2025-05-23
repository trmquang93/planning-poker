import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VotingInterface from '../../src/components/VotingInterface';
import type { Session, Participant } from '@shared/types';

// Mock console methods
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('VotingInterface', () => {
  let mockSession: Session;
  let mockFacilitator: Participant;
  let mockMember: Participant;
  let mockOnSubmitVote: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmitVote = vi.fn();

    mockFacilitator = {
      id: 'facilitator-1',
      name: 'John Facilitator',
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockMember = {
      id: 'member-1',
      name: 'Jane Member',
      role: 'member',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:05:00Z'),
    };

    mockSession = {
      id: 'session-1',
      code: 'ABC123',
      title: 'Test Session',
      scale: 'FIBONACCI',
      status: 'waiting',
      participants: [mockFacilitator, mockMember],
      stories: [],
      currentStoryId: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
    };
  });

  describe('No Current Story', () => {
    it('should show waiting message when no story is selected', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Waiting for Voting')).toBeInTheDocument();
      expect(screen.getByText('The facilitator will start voting when ready.')).toBeInTheDocument();
    });

    it('should show waiting message when currentStoryId points to non-existent story', () => {
      const sessionWithInvalidStory = {
        ...mockSession,
        currentStoryId: 'non-existent-story'
      };

      render(
        <VotingInterface
          session={sessionWithInvalidStory}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Waiting for Voting')).toBeInTheDocument();
    });
  });

  describe('Active Voting Story', () => {
    beforeEach(() => {
      mockSession.stories = [{
        id: 'story-1',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        status: 'voting',
        votes: {},
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';
      mockSession.status = 'voting';
    });

    it('should display story details and voting interface', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Vote on Story')).toBeInTheDocument();
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      expect(screen.getByText('Add login and registration functionality')).toBeInTheDocument();
      expect(screen.getByText('Select your estimate using FIBONACCI scale:')).toBeInTheDocument();
    });

    it('should display all Fibonacci estimation values', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      const fibonacciValues = [1, 2, 3, 5, 8, 13, 21, '?', '∞'];
      fibonacciValues.forEach(value => {
        expect(screen.getByRole('button', { name: value.toString() })).toBeInTheDocument();
      });
    });

    it('should show correct vote count and participant indicators', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Votes submitted: 0 / 2')).toBeInTheDocument();
      
      // Should show indicators for all participants
      const indicators = screen.getByTitle('John Facilitator: Not voted');
      expect(indicators).toBeInTheDocument();
      
      const memberIndicator = screen.getByTitle('Jane Member: Not voted');
      expect(memberIndicator).toBeInTheDocument();
    });

    it('should handle vote submission', async () => {
      const user = userEvent.setup();
      
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      const voteButton = screen.getByRole('button', { name: '5' });
      await user.click(voteButton);

      expect(mockOnSubmitVote).toHaveBeenCalledWith('story-1', 5);
    });

    it('should disable buttons during submission', async () => {
      const user = userEvent.setup();
      
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      const voteButton = screen.getByRole('button', { name: '5' });
      await user.click(voteButton);

      // Buttons should be disabled during submission
      expect(voteButton).toBeDisabled();
      
      // Wait for debounce timeout
      await waitFor(() => {
        expect(voteButton).not.toBeDisabled();
      }, { timeout: 1500 });
    });

    it('should show different scales correctly', () => {
      const tShirtSession = {
        ...mockSession,
        scale: 'T_SHIRT' as const
      };

      render(
        <VotingInterface
          session={tShirtSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Select your estimate using T SHIRT scale:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'XS' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    });
  });

  describe('After Vote Submission', () => {
    beforeEach(() => {
      mockSession.stories = [{
        id: 'story-1',
        title: 'Implement user authentication',
        status: 'voting',
        votes: {
          'John Facilitator': 5
        },
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';
      mockSession.status = 'voting';
    });

    it('should show vote submitted state when user has voted', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
      expect(screen.getByText('Your vote: 5')).toBeInTheDocument();
      expect(screen.getByText('Waiting for other participants to vote...')).toBeInTheDocument();
      expect(screen.getByText('1 / 2 votes submitted')).toBeInTheDocument();
    });

    it('should not allow voting when already voted', async () => {
      const user = userEvent.setup();
      
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      // Should not see voting buttons when already voted
      expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
      expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
    });

    it('should show hidden votes for other participants', () => {
      const sessionWithHiddenVotes = {
        ...mockSession,
        stories: [{
          ...mockSession.stories[0],
          votes: {
            'John Facilitator': 5,
            'Jane Member': '***' // Hidden vote
          }
        }]
      };

      render(
        <VotingInterface
          session={sessionWithHiddenVotes}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Your vote: 5')).toBeInTheDocument();
      expect(screen.getByText('2 / 2 votes submitted')).toBeInTheDocument();
    });
  });

  describe('Vote Revelation', () => {
    beforeEach(() => {
      mockSession.stories = [{
        id: 'story-1',
        title: 'Implement user authentication',
        status: 'voting',
        votes: {
          'John Facilitator': 5,
          'Jane Member': 8
        },
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';
      mockSession.status = 'revealing';
    });

    it('should show revealed votes when session is in revealing state', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Votes Revealed!')).toBeInTheDocument();
      expect(screen.getByText('John Facilitator:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Jane Member:')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should show both submitted vote state and revealed votes', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      // Should show the submitted vote state
      expect(screen.getByText('Vote Submitted')).toBeInTheDocument();
      expect(screen.getByText('Your vote: 5')).toBeInTheDocument();
      
      // AND the revealed votes section
      expect(screen.getByText('Votes Revealed!')).toBeInTheDocument();
    });
  });

  describe('Participant Status Indicators', () => {
    beforeEach(() => {
      mockSession.stories = [{
        id: 'story-1',
        title: 'Test Story',
        status: 'voting',
        votes: {
          'John Facilitator': 5
        },
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';
    });

    it('should show correct participant status indicators', () => {
      // Add an offline participant
      const sessionWithOfflineParticipant = {
        ...mockSession,
        participants: [
          mockFacilitator,
          { ...mockMember, isOnline: false }
        ]
      };

      render(
        <VotingInterface
          session={sessionWithOfflineParticipant}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByTitle('John Facilitator: Voted')).toBeInTheDocument();
      expect(screen.getByTitle('Jane Member: Offline')).toBeInTheDocument();
    });

    it('should show legend for participant indicators', () => {
      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('🟢 Voted • ⚪ Not voted • 🔴 Offline')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing story description gracefully', () => {
      mockSession.stories = [{
        id: 'story-1',
        title: 'Story without description',
        status: 'voting',
        votes: {},
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';

      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Story without description')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });

    it('should handle empty participant list', () => {
      mockSession.participants = [];
      mockSession.stories = [{
        id: 'story-1',
        title: 'Test Story',
        status: 'voting',
        votes: {},
        createdAt: new Date('2024-01-01T10:10:00Z'),
      }];
      mockSession.currentStoryId = 'story-1';

      render(
        <VotingInterface
          session={mockSession}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      expect(screen.getByText('Votes submitted: 0 / 0')).toBeInTheDocument();
    });

    it('should prevent multiple rapid clicks', async () => {
      const user = userEvent.setup();
      
      render(
        <VotingInterface
          session={{
            ...mockSession,
            stories: [{
              id: 'story-1',
              title: 'Test Story',
              status: 'voting',
              votes: {},
              createdAt: new Date(),
            }],
            currentStoryId: 'story-1'
          }}
          currentParticipant={mockFacilitator}
          onSubmitVote={mockOnSubmitVote}
        />
      );

      const voteButton = screen.getByRole('button', { name: '5' });
      
      // Rapid clicks
      await user.click(voteButton);
      await user.click(voteButton);
      await user.click(voteButton);

      // Should only be called once due to debouncing
      expect(mockOnSubmitVote).toHaveBeenCalledTimes(1);
    });
  });
});