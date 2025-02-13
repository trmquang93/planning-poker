import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Lobby.css';

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function Lobby() {
    const [sessionId, setSessionId] = useState('');
    const [username, setUsername] = useState('');
    const [showJoinLink, setShowJoinLink] = useState(false);
    const [createdRoomId, setCreatedRoomId] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (sessionId && username) {
            navigate(`/session/${sessionId}?username=${encodeURIComponent(username)}`);
        }
    };

    const handleCreateRoom = () => {
        if (!username) {
            alert('Please enter your name first');
            return;
        }
        const newRoomId = generateRoomId();
        setCreatedRoomId(newRoomId);
        setShowJoinLink(true);
    };

    const handleJoinCreatedRoom = () => {
        navigate(`/session/${createdRoomId}?username=${encodeURIComponent(username)}`);
    };

    const copyJoinLink = () => {
        const link = `${window.location.origin}/session/${createdRoomId}`;
        navigator.clipboard.writeText(link);
        alert('Join link copied to clipboard!');
    };

    return (
        <div className="lobby">
            <div className="lobby-container">
                <h1>Planning Poker</h1>
                <form onSubmit={handleJoin} className="lobby-form">
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Enter Your Name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    
                    {!showJoinLink ? (
                        <>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Enter Session ID"
                                    value={sessionId}
                                    onChange={(e) => setSessionId(e.target.value)}
                                />
                            </div>
                            <div className="button-group">
                                <button type="submit" className="join-button">
                                    Join Session
                                </button>
                                <button 
                                    type="button" 
                                    className="create-button"
                                    onClick={handleCreateRoom}
                                >
                                    Create New Room
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="created-room-info">
                            <h3>Room Created!</h3>
                            <p>Room ID: {createdRoomId}</p>
                            <div className="button-group">
                                <button 
                                    type="button" 
                                    className="copy-button"
                                    onClick={copyJoinLink}
                                >
                                    Copy Join Link
                                </button>
                                <button 
                                    type="button" 
                                    className="join-button"
                                    onClick={handleJoinCreatedRoom}
                                >
                                    Enter Room
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default Lobby;
