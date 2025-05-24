import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '../../src/stores/sessionStore';
import type { Session, Story } from '../../src/shared/types';

describe('Story Duplication Prevention Tests', () => {
  let initialSession: Session;
  let newStory: Story;

  beforeEach(() => {
    // Clear the store before each test
    useSessionStore.getState().reset();

    initialSession = {
      id: 'session-1',
      code: 'ABC123',
      title: 'Test Session',
      scale: 'FIBONACCI',
      status: 'waiting',
      participants: [],
      stories: [
        {
          id: 'story-1',
          title: '1',
          status: 'completed',
          votes: {},
          finalEstimate: 2,
          createdAt: new Date('2024-01-01T10:10:00Z'),
        }
      ],
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
    };

    newStory = {
      id: 'story-2',
      title: '2',
      status: 'pending',
      votes: {},
      createdAt: new Date('2024-01-01T10:25:00Z'),
    };
  });

  it('should NOT duplicate stories when both SESSION_UPDATED and STORY_ADDED events are fired', () => {
    const { result } = renderHook(() => useSessionStore());

    // Set initial session
    act(() => {
      result.current.setSession(initialSession);
    });

    expect(result.current.session?.stories).toHaveLength(1);

    // Simulate the backend bug: both SESSION_UPDATED and STORY_ADDED events fired
    act(() => {
      // First: SESSION_UPDATED event (contains the new story)
      const updatedSession = {
        ...initialSession,
        stories: [...initialSession.stories, newStory],
        updatedAt: new Date(),
      };
      result.current.setSession(updatedSession);
    });

    // At this point, stories should be 2
    expect(result.current.session?.stories).toHaveLength(2);

    // Second: STORY_ADDED event (should NOT add the story again)
    // This simulates the bug where the same story gets added twice
    act(() => {
      result.current.addStory(newStory); // This would cause duplication
    });

    // After both events, should still be 2 stories, NOT 3
    expect(result.current.session?.stories).toHaveLength(2); // Will FAIL if duplication occurs
    
    // Verify the story titles
    const storyTitles = result.current.session?.stories.map(s => s.title) || [];
    expect(storyTitles).toEqual(['1', '2']); // Should be unique
  });

  it('should handle SESSION_UPDATED event without duplication', () => {
    const { result } = renderHook(() => useSessionStore());

    // Set initial session
    act(() => {
      result.current.setSession(initialSession);
    });

    // Simulate only SESSION_UPDATED event (correct behavior)
    act(() => {
      const updatedSession = {
        ...initialSession,
        stories: [...initialSession.stories, newStory],
        updatedAt: new Date(),
      };
      result.current.setSession(updatedSession);
    });

    // Should have exactly 2 stories
    expect(result.current.session?.stories).toHaveLength(2);
    
    const storyTitles = result.current.session?.stories.map(s => s.title) || [];
    expect(storyTitles).toEqual(['1', '2']);
  });
});