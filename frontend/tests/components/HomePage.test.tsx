import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, mockNavigate } from '../utils/test-utils';
import HomePage from '../../src/pages/HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the home page with title and description', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Planning Poker')).toBeInTheDocument();
    expect(screen.getByText('Real-time estimation for agile teams')).toBeInTheDocument();
  });

  it('renders create session section', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Create New Session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Session' })).toBeInTheDocument();
  });

  it('renders join session section with form inputs', () => {
    render(<HomePage />);
    
    expect(screen.getByText('Join Existing Session')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Session Code (e.g., ABC123)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Session' })).toBeInTheDocument();
  });

  it('navigates to demo session when create session is clicked', async () => {
    render(<HomePage />);
    
    const createButton = screen.getByRole('button', { name: 'Create Session' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/session/demo-session');
    });
  });

  it('updates session code input and converts to uppercase', () => {
    render(<HomePage />);
    
    const sessionCodeInput = screen.getByPlaceholderText('Session Code (e.g., ABC123)');
    fireEvent.change(sessionCodeInput, { target: { value: 'abc123' } });
    
    expect(sessionCodeInput).toHaveValue('ABC123');
  });

  it('updates participant name input', () => {
    render(<HomePage />);
    
    const nameInput = screen.getByPlaceholderText('Your Name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    
    expect(nameInput).toHaveValue('John Doe');
  });

  it('disables join button when session code or name is empty', () => {
    render(<HomePage />);
    
    const joinButton = screen.getByRole('button', { name: 'Join Session' });
    expect(joinButton).toBeDisabled();
  });

  it('enables join button when both session code and name are provided', () => {
    render(<HomePage />);
    
    const sessionCodeInput = screen.getByPlaceholderText('Session Code (e.g., ABC123)');
    const nameInput = screen.getByPlaceholderText('Your Name');
    
    fireEvent.change(sessionCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    
    const joinButton = screen.getByRole('button', { name: 'Join Session' });
    expect(joinButton).toBeEnabled();
  });

  it('navigates to session when join button is clicked with valid inputs', async () => {
    render(<HomePage />);
    
    const sessionCodeInput = screen.getByPlaceholderText('Session Code (e.g., ABC123)');
    const nameInput = screen.getByPlaceholderText('Your Name');
    const joinButton = screen.getByRole('button', { name: 'Join Session' });
    
    fireEvent.change(sessionCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.click(joinButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/session/abc123');
    });
  });

  it('enforces maximum length for session code input', () => {
    render(<HomePage />);
    
    const sessionCodeInput = screen.getByPlaceholderText('Session Code (e.g., ABC123)');
    fireEvent.change(sessionCodeInput, { target: { value: 'ABCDEFGHIJKLMNOP' } });
    
    expect(sessionCodeInput).toHaveValue('ABCDEF');
  });

  it('enforces maximum length for participant name input', () => {
    render(<HomePage />);
    
    const nameInput = screen.getByPlaceholderText('Your Name');
    const longName = 'A'.repeat(60);
    fireEvent.change(nameInput, { target: { value: longName } });
    
    expect((nameInput as HTMLInputElement).value.length).toBeLessThanOrEqual(50);
  });

  it('displays no accounts required message', () => {
    render(<HomePage />);
    
    expect(screen.getByText('No accounts required • Free to use')).toBeInTheDocument();
  });
});