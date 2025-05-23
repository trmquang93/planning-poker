import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Create a custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Common test utilities
export const mockNavigate = vi.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Test data factories
export const createMockSession = (overrides = {}) => ({
  id: 'test-session-id',
  code: 'ABC123',
  title: 'Test Session',
  scale: 'FIBONACCI' as const,
  status: 'waiting' as const,
  participants: [],
  stories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  ...overrides,
});

export const createMockParticipant = (overrides = {}) => ({
  id: 'test-participant-id',
  name: 'Test Participant',
  role: 'member' as const,
  isOnline: true,
  joinedAt: new Date(),
  ...overrides,
});

export const createMockStory = (overrides = {}) => ({
  id: 'test-story-id',
  title: 'Test Story',
  description: 'Test story description',
  status: 'pending' as const,
  votes: {},
  createdAt: new Date(),
  ...overrides,
});