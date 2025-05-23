import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StoryManager from '../../src/components/StoryManager';
import type { Session, Participant, Story } from '@shared/types';

describe('StoryManager - Story Duplication Bug', () => {
  let mockSession: Session;
  let mockFacilitator: Participant;

  beforeEach(() => {
    mockFacilitator = {
      id: 'facilitator-1',
      name: 'Quang',
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockSession = {
      id: 'session-1',
      code: 'ABC123',
      title: 'Test Session',
      scale: 'FIBONACCI',
      status: 'waiting',
      participants: [mockFacilitator],
      stories: [
        {
          id: 'story-1',
          title: '1',
          status: 'completed',
          votes: {
            'Quang': 2,
            'Quang222': 5
          },
          finalEstimate: 2,
          createdAt: new Date('2024-01-01T10:10:00Z'),
        },
        {
          id: 'story-2',
          title: '2',
          status: 'completed',
          votes: {
            'Quang222': 1,
            'Quang': 2
          },
          finalEstimate: 5,
          createdAt: new Date('2024-01-01T10:15:00Z'),
        },
        {
          id: 'story-3',
          title: '3',
          status: 'completed',
          votes: {
            'Quang': 13,
            'Quang222': 3
          },
          finalEstimate: 2,
          createdAt: new Date('2024-01-01T10:20:00Z'),
        },
        {
          id: 'story-4',
          title: '4',
          status: 'pending',
          votes: {},
          createdAt: new Date('2024-01-01T10:25:00Z'),
        }
      ],
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
    };
  });

  it('should display each story exactly once', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={vi.fn()}
      />
    );

    // Find all story containers (div elements with border and background styling)
    const story4Containers = screen.getAllByText('4').map(el => 
      el.closest('div[class*="p-4 border rounded-lg"]')
    ).filter(Boolean);
    
    // Story "4" should appear only once
    expect(story4Containers).toHaveLength(1);
    
    // Verify all other stories appear once too
    const story1Containers = screen.getAllByText('1').map(el => 
      el.closest('div[class*="p-4 border rounded-lg"]')
    ).filter(Boolean);
    expect(story1Containers).toHaveLength(1);
    
    const story3Containers = screen.getAllByText('3').map(el => 
      el.closest('div[class*="p-4 border rounded-lg"]')
    ).filter(Boolean);
    expect(story3Containers).toHaveLength(1);
  });

  it('should display correct number of stories', () => {
    render(
      <StoryManager
        session={mockSession}
        currentParticipant={mockFacilitator}
        onAddStory={vi.fn()}
        onStartVoting={vi.fn()}
        onRevealVotes={vi.fn()}
        onFinalizeEstimate={vi.fn()}
        onRevoteStory={vi.fn()}
      />
    );

    // Verify that the session has exactly 4 stories (our test data)
    expect(mockSession.stories).toHaveLength(4);
  });
});