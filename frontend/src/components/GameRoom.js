import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './GameRoom.css';

// Get the backend URL from environment variable or use localhost for development
const SOCKET_SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5555';

const FIBONACCI_NUMBERS = [1, 2, 3, 5, 8, 13, 21];

function GameRoom() {
    const { sessionId } = useParams();
    const [searchParams] = useSearchParams();
    const username = searchParams.get('username');
    const navigate = useNavigate();

    const [socket, setSocket] = useState(null);
    const [votes, setVotes] = useState({});
    const [revealed, setRevealed] = useState(false);
    const [isScrumMaster, setIsScrumMaster] = useState(false);
    const [members, setMembers] = useState({});
    const [selectedVote, setSelectedVote] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomLink] = useState(`${window.location.origin}/session/${sessionId}`);

    const handleSessionUpdate = useCallback((sessionData) => {
        console.log('Received session update:', sessionData);
        if (sessionData.members) {
            setMembers(sessionData.members);
        }
        if (sessionData.scrumMaster) {
            setIsScrumMaster(sessionData.scrumMaster === socket?.id);
        }
        if (sessionData.revealed) {
            setVotes(sessionData.votes || {});
            setRevealed(true);
        }
    }, [socket]);

    useEffect(() => {
        if (!username) {
            navigate('/');
            return;
        }

        const newSocket = io(SOCKET_SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        setSocket(newSocket);

        const handleConnect = () => {
            console.log('Connected to server, joining session...');
            setIsConnected(true);
            setError(null);
            newSocket.emit('joinSession', { sessionId, username });
        };

        const handleDisconnect = () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        };

        const handleError = (error) => {
            console.error('Socket error:', error);
            setError(error);
        };

        const handleVotesUpdate = ({ votes: newVotes, revealed: isRevealed }) => {
            console.log('Votes updated:', newVotes);
            setVotes(newVotes || {});
            setRevealed(isRevealed);
        };

        const handleVotesRevealed = (newVotes) => {
            console.log('Votes revealed:', newVotes);
            setVotes(newVotes || {});
            setRevealed(true);
        };

        const handleVotesReset = () => {
            console.log('Votes reset');
            setVotes({});
            setRevealed(false);
            setSelectedVote(null);
        };

        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);
        newSocket.on('error', handleError);
        newSocket.on('updateSession', handleSessionUpdate);
        newSocket.on('updateVotes', handleVotesUpdate);
        newSocket.on('votesRevealed', handleVotesRevealed);
        newSocket.on('votesReset', handleVotesReset);

        return () => {
            console.log('Cleaning up socket connection...');
            newSocket.off('connect', handleConnect);
            newSocket.off('disconnect', handleDisconnect);
            newSocket.off('error', handleError);
            newSocket.off('updateSession', handleSessionUpdate);
            newSocket.off('updateVotes', handleVotesUpdate);
            newSocket.off('votesRevealed', handleVotesRevealed);
            newSocket.off('votesReset', handleVotesReset);
            newSocket.disconnect();
        };
    }, [sessionId, username, navigate, handleSessionUpdate]);

    const handleVote = useCallback((value) => {
        if (socket && isConnected && !revealed) {
            console.log('Sending vote:', value);
            socket.emit('vote', { sessionId, vote: value });
            setSelectedVote(value);
        }
    }, [socket, isConnected, revealed, sessionId]);

    const handleReveal = useCallback(() => {
        if (socket && isConnected && isScrumMaster) {
            console.log('Revealing votes');
            socket.emit('revealVotes', { sessionId });
        }
    }, [socket, isConnected, isScrumMaster, sessionId]);

    const handleReset = useCallback(() => {
        if (socket && isConnected && isScrumMaster) {
            console.log('Resetting votes');
            socket.emit('resetVotes', { sessionId });
        }
    }, [socket, isConnected, isScrumMaster, sessionId]);

    const copyRoomLink = useCallback(() => {
        navigator.clipboard.writeText(roomLink);
        alert('Room link copied to clipboard!');
    }, [roomLink]);

    if (!isConnected) {
        return (
            <div className="game-room">
                <div className="connection-status">
                    <h2>Connecting to server...</h2>
                    {error && <p className="error-message">Error: {error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="game-room">
            <div className="game-room-header">
                <h1>Planning Poker - Session: {sessionId}</h1>
                <div className="user-info">
                    Logged in as: {username} {isScrumMaster ? '(Scrum Master)' : ''}
                </div>
                <div className="room-link">
                    <button onClick={copyRoomLink} className="copy-link-button">
                        Copy Room Link
                    </button>
                </div>
            </div>

            <div className="game-content">
                <div className="members-list">
                    <h2>Team Members ({Object.keys(members).length})</h2>
                    <div className="members">
                        {Object.entries(members).map(([id, name]) => (
                            <div key={id} className="member-item">
                                <span className="member-name">
                                    {name}
                                    {id === socket?.id ? ' (You)' : ''}
                                    {id === socket?.id && isScrumMaster ? ' - Scrum Master' : ''}
                                </span>
                                <span className={`member-status ${votes[id] ? 'voted' : 'waiting'}`}>
                                    {votes[id] ? '✓ Voted' : '⌛ Waiting'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="voting-area">
                    <h2>Select Story Points</h2>
                    <div className="voting-cards">
                        {FIBONACCI_NUMBERS.map((number) => (
                            <button
                                key={number}
                                className={`card ${selectedVote === number ? 'selected' : ''}`}
                                onClick={() => handleVote(number)}
                                disabled={revealed}
                            >
                                {number}
                            </button>
                        ))}
                    </div>

                    <div className="results-area">
                        <h2>Votes</h2>
                        <div className="votes-list">
                            {Object.entries(members).map(([id, name]) => (
                                <div key={id} className="vote-item">
                                    <span className="voter-name">{name}</span>
                                    <span className="vote-value">
                                        {revealed
                                            ? (votes[id] || 'No vote')
                                            : (votes[id] ? '🎲' : 'Waiting...')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {revealed && (
                            <div className="vote-summary">
                                <p>Average: {
                                    Object.values(votes).length > 0
                                        ? (Object.values(votes).reduce((a, b) => a + b, 0) / Object.values(votes).length).toFixed(1)
                                        : 'N/A'
                                }</p>
                            </div>
                        )}

                        {isScrumMaster && (
                            <div className="scrum-master-controls">
                                {!revealed ? (
                                    <button
                                        onClick={handleReveal}
                                        className="reveal-button"
                                        disabled={Object.keys(votes).length === 0}
                                    >
                                        Reveal Votes
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleReset}
                                        className="reset-button"
                                    >
                                        Start New Round
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameRoom;
