import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryManager from '../../src/components/StoryManager';
import type { Session, Participant } from '../../src/shared/types';

describe('StoryManager - Revote Functionality', () => {
  let mockSession: Session;
  let mockFacilitator: Participant;
  let mockMember: Participant;
  let mockOnRevoteStory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFacilitator = {
      id: 'facilitator-1',
      name: 'Facilitator',
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockMember = {
      id: 'member-1',
      name: 'Member',
      role: 'member',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:01:00Z'),
    };

    mockOnRevoteStory = vi.fn();

    mockSession = {
      id: 'session-1',
      code: 'ABC123',
      title: 'Test Session',
      scale: 'FIBONACCI',
      status: 'waiting',
      participants: [mockFacilitator, mockMember],
      stories: [
        {
          id: 'completed-story',
          title: 'Completed Story',
          description: 'This story is completed',
          status: 'completed',
          votes: {
            'Facilitator': 5,
            'Member': 8
          },
          finalEstimate: 8,
          createdAt: new Date('2024-01-01T10:10:00Z'),
          completedAt: new Date('2024-01-01T10:15:00Z'),
        },
        {
          id: 'pending-story',
          title: 'Pending Story',
          status: 'pending',
          votes: {},
          createdAt: new Date('2024-01-01T10:20:00Z'),
        }
      ],
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
    };
  });

  it('should show revote button for completed stories when user is facilitator', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    // Should see a revote button for the completed story
    const revoteButton = screen.getByRole('button', { name: /revote/i });
    expect(revoteButton).toBeInTheDocument();
    expect(revoteButton).toHaveTextContent('🔄 Revote');
  });

  it('should not show revote button for pending stories', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    // Should see start voting button for pending story, not revote
    const startVotingButton = screen.getByRole('button', { name: /start voting/i });
    expect(startVotingButton).toBeInTheDocument();

    // Should not have multiple revote buttons (only one for completed story)
    const revoteButtons = screen.getAllByText(/revote/i);
    expect(revoteButtons).toHaveLength(1);
  });

  it('should not show revote button when user is not a facilitator', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockMember}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    // Should not see any revote buttons as a member
    const revoteButtons = screen.queryByText(/revote/i);
    expect(revoteButtons).not.toBeInTheDocument();

    // Should also not see start voting button as a member
    const startVotingButton = screen.queryByRole('button', { name: /start voting/i });
    expect(startVotingButton).not.toBeInTheDocument();
  });

  it('should call onRevoteStory when revote button is clicked', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    const revoteButton = screen.getByRole('button', { name: /revote/i });
    fireEvent.click(revoteButton);

    expect(mockOnRevoteStory).toHaveBeenCalledWith('completed-story');
    expect(mockOnRevoteStory).toHaveBeenCalledTimes(1);
  });

  it('should not show revote button when there is an active voting session', () => {
    // Modify session to have an active voting story
    const sessionWithActiveVoting = {
      ...mockSession,
      status: 'voting' as const,
      currentStoryId: 'pending-story',
      stories: [
        {
          ...mockSession.stories[0], // Keep completed story
        },
        {
          ...mockSession.stories[1], // Change pending story to voting
          status: 'voting' as const,
        }
      ]
    };

    render(
      <StoryManager
        session={sessionWithActiveVoting}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    // Should not see revote button when there's active voting
    const revoteButtons = screen.queryByText(/revote/i);
    expect(revoteButtons).not.toBeInTheDocument();
  });

  it('should show revote button only for stories with final estimates', () => {
    // Create a completed story without final estimate
    const sessionWithIncompleteStory = {
      ...mockSession,
      stories: [
        {
          ...mockSession.stories[0],
          finalEstimate: undefined, // Remove final estimate
        },
        mockSession.stories[1]
      ]
    };

    render(
      <StoryManager
        session={sessionWithIncompleteStory}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={mockOnRevoteStory}
      />
    );

    // Should not see revote button for story without final estimate
    const revoteButtons = screen.queryByText(/revote/i);
    expect(revoteButtons).not.toBeInTheDocument();
  });
});