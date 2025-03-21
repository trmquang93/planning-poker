import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    VStack,
    HStack,
    Text,
    Button,
    Input,
    useToast,
    Heading,
    Badge,
    List,
    ListItem,
    Flex,
    Tooltip,
    ScaleFade,
    InputGroup,
    InputRightElement,
} from '@chakra-ui/react';
import { FaHome, FaPlay, FaPlus } from 'react-icons/fa';
import { socket } from '../socket';
import HostControls from './HostControls';
import VotingSession from './VotingSession';
import ErrorBoundary from './ErrorBoundary';

function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [stories, setStories] = useState([]);
    const [newStory, setNewStory] = useState('');
    const [currentStory, setCurrentStory] = useState(null);
    const [selectedVote, setSelectedVote] = useState(null);
    const [votes, setVotes] = useState([]);
    const [votesRevealed, setVotesRevealed] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [currentHost, setCurrentHost] = useState(null);
    const [currentScale, setCurrentScale] = useState(null);

    useEffect(() => {
        const userName = localStorage.getItem('userName') || 'Guest';
        const userId = localStorage.getItem('userId');

        if (!userId) {
            navigate('/');
            return;
        }

        // Fetch current scale when component mounts
        socket.emit('getCurrentScale', { roomId }, (response) => {
            if (response.success) {
                setCurrentScale(response.scale);
            }
        });

        const setupSocketListeners = () => {
            socket.on('userJoined', ({ users: updatedUsers, host }) => {
                setUsers(updatedUsers);
                setIsHost(host.id === userId);
                setCurrentHost(host);
            });

            socket.on('userLeft', ({ users: updatedUsers, host }) => {
                setUsers(updatedUsers);
                setIsHost(host.id === userId);
                setCurrentHost(host);
            });

            socket.on('hostTransferred', ({ oldHostId, newHostId }) => {
                setIsHost(newHostId === userId);
                const newHost = users.find(u => u.id === newHostId);
                setCurrentHost(newHost);
                toast({
                    title: 'Host Transferred',
                    description: `Host role transferred to ${newHost?.name}`,
                    status: 'info',
                    duration: 3000,
                });
            });

            socket.on('storiesUpdated', ({ stories: updatedStories }) => {
                setStories(updatedStories);
            });

            socket.on('votingStarted', ({ storyId }) => {
                setCurrentStory(storyId);
                setVotesRevealed(false);
                setVotes([]);
                setSelectedVote(null);
                setStories(prevStories => {
                    return prevStories.map(story => ({
                        ...story,
                        isVoting: story.id === storyId
                    }));
                });
            });

            socket.on('voteSubmitted', ({ totalVotes, userCount, lastVoteTime, userId: voterId }) => {
                const voterName = users.find(u => u.id === voterId)?.name;
                toast({
                    title: voterName ? `${voterName} voted` : 'Vote submitted',
                    description: `${totalVotes}/${userCount} votes received`,
                    status: 'info',
                    duration: 2000,
                });
            });

            socket.on('voteUpdated', ({ userId: updatedUserId }) => {
                const voterName = users.find(u => u.id === updatedUserId)?.name;
                toast({
                    title: 'Vote Updated',
                    description: voterName ? `${voterName} updated their vote` : 'A vote was updated',
                    status: 'info',
                    duration: 2000,
                });
            });

            socket.on('votesRevealed', ({ votes: revealedVotes, statistics }) => {
                setVotes(revealedVotes);
                setVotesRevealed(true);

                if (statistics.consensus) {
                    toast({
                        title: 'Perfect Consensus!',
                        description: `Everyone voted ${statistics.mode}`,
                        status: 'success',
                        duration: 3000,
                    });
                } else if (statistics.spread > 5) {
                    toast({
                        title: 'High Variance',
                        description: 'Consider discussing the different perspectives',
                        status: 'warning',
                        duration: 3000,
                    });
                }
            });

            socket.on('votingCompleted', ({ stories: updatedStories }) => {
                setStories(updatedStories);
                setCurrentStory(null);
                setVotes([]);
                setVotesRevealed(false);
                setSelectedVote(null);
            });

            socket.on('votingReset', () => {
                setCurrentStory(null);
                setVotes([]);
                setVotesRevealed(false);
                setSelectedVote(null);
                toast({
                    title: 'Voting Reset',
                    description: 'The voting session has been reset',
                    status: 'info',
                    duration: 2000,
                });
            });

            socket.on('scaleUpdated', ({ scale }) => {
                setCurrentScale(scale);
            });
        };

        const cleanupSocketListeners = () => {
            socket.off('userJoined');
            socket.off('userLeft');
            socket.off('hostTransferred');
            socket.off('storiesUpdated');
            socket.off('votingStarted');
            socket.off('voteSubmitted');
            socket.off('voteUpdated');
            socket.off('votesRevealed');
            socket.off('votingCompleted');
            socket.off('votingReset');
            socket.off('scaleUpdated');
        };

        setupSocketListeners();

        socket.emit('joinRoom', { roomId, userName }, (response) => {
            if (!response.success) {
                toast({
                    title: 'Error',
                    description: response.message || 'Failed to join room',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                navigate('/');
                return;
            }
            setUsers(response.room.users);
            setStories(response.room.stories || []);
            setIsHost(response.room.isHost);
            setCurrentHost(response.room.host);

            if (response.room.currentStory) {
                setCurrentStory(response.room.currentStory);
            }
        });

        return cleanupSocketListeners;
    }, [roomId, navigate, toast, users]);

    const addStory = () => {
        if (!newStory.trim()) return;

        const tempStory = {
            id: 'temp-' + Date.now(),
            title: newStory.trim(),
            status: 'pending'
        };
        setStories(prev => [...prev, tempStory]);

        socket.emit('addStory', {
            roomId,
            story: { title: newStory.trim() }
        }, (response) => {
            if (response && response.success) {
                setNewStory('');
                setStories(prev => prev.filter(s => s.id !== tempStory.id));
            } else {
                setStories(prev => prev.filter(s => s.id !== tempStory.id));
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to add story',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addStory();
        }
    };

    const startVoting = (storyId) => {
        if (!socket.connected || !roomId || !storyId) {
            socket.connect();
            toast({
                title: 'Connection Error',
                description: 'Trying to reconnect to server...',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        socket.emit('startVoting', { roomId, storyId }, (response) => {
            if (!response || !response.success) {
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to start voting',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });
    };

    const submitVote = (value) => {
        if (!roomId) return;

        setSelectedVote(value);
        socket.emit('submitVote', { roomId, vote: value }, (response) => {
            if (!response || !response.success) {
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to submit vote',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                // Revert selected vote on error
                setSelectedVote(null);
            }
        });
    };

    const revealVotes = () => {
        if (!currentStory) {
            toast({
                title: 'Error',
                description: 'No active voting session',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        socket.emit('revealVotes', { roomId }, (response) => {
            if (!response || !response.success) {
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to reveal votes',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });
    };

    const resetVoting = () => {
        if (!currentStory) {
            toast({
                title: 'Error',
                description: 'No active voting session',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        socket.emit('resetVoting', { roomId }, (response) => {
            if (!response || !response.success) {
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to reset voting',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });
    };

    const completeVoting = () => {
        const average = calculateAverage();
        socket.emit('completeVoting', { roomId, finalEstimate: average });
    };

    const calculateAverage = () => {
        if (!votes || votes.length === 0 || !currentScale) return '?';

        const numericVotes = votes
            .map(v => v?.vote || '?')
            .filter(v => v !== '?')
            .map(Number);

        if (numericVotes.length === 0) return '?';

        const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

        const numericValues = currentScale.values
            .filter(v => v.type === 'numeric')
            .map(v => Number(v.value));

        if (numericValues.length === 0) return '?';

        // Find the closest value in the scale
        return numericValues.reduce((prev, curr) => {
            if (!curr) return prev;
            return Math.abs(curr - avg) < Math.abs(Number(prev) - avg) ? curr : prev;
        }, numericValues[0]).toString();
    };

    return (
        <Container maxW="container.xl" py={8}>
            <VStack spacing={8} align="stretch">
                <ScaleFade in={true} initialScale={0.9}>
                    <Flex align="center" mb={6}>
                        <Box flex="1">
                            <HStack spacing={4} mb={2}>
                                <Heading
                                    size="lg"
                                    bgGradient="linear(to-r, blue.500, purple.500)"
                                    bgClip="text"
                                >
                                    Planning Poker
                                </Heading>
                                <Badge
                                    colorScheme="purple"
                                    p={2}
                                    borderRadius="md"
                                    cursor="pointer"
                                    onClick={() => {
                                        const text = roomId;
                                        navigator.clipboard.writeText(text);
                                        toast({
                                            title: 'Room ID copied',
                                            description: 'Room ID has been copied to clipboard',
                                            status: 'info',
                                            duration: 3000,
                                        });
                                    }}
                                    _hover={{ opacity: 0.8 }}
                                >
                                    Room: {roomId}
                                </Badge>
                            </HStack>
                            <Text color="gray.600">
                                Participants: {users.map(u => u.name).join(', ')}
                            </Text>
                        </Box>
                        <Button
                            leftIcon={<FaHome />}
                            colorScheme="gray"
                            onClick={() => navigate('/')}
                            size="sm"
                        >
                            Leave Room
                        </Button>
                    </Flex>

                    {currentHost && (
                        <HostControls
                            currentHost={currentHost}
                            participants={users}
                            isCurrentUserHost={isHost}
                        />
                    )}
                </ScaleFade>

                {isHost && (
                    <Box
                        p={6}
                        borderWidth={1}
                        borderRadius="xl"
                        boxShadow="lg"
                        bg="white"
                    >
                        <Heading size="sm" mb={4}>Add New Story</Heading>
                        <InputGroup size="md">
                            <Input
                                value={newStory}
                                onChange={(e) => setNewStory(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter story description"
                                pr="4.5rem"
                            />
                            <InputRightElement width="4.5rem">
                                <Button
                                    h="1.75rem"
                                    size="sm"
                                    onClick={addStory}
                                    colorScheme="blue"
                                    leftIcon={<FaPlus />}
                                >
                                    Add
                                </Button>
                            </InputRightElement>
                        </InputGroup>
                    </Box>
                )}

                {currentStory && (
                    <ErrorBoundary>
                        <VotingSession
                            story={stories.find(s => s.id === currentStory)}
                            roomId={roomId}
                            selectedVote={selectedVote}
                            votes={votes}
                            votesRevealed={votesRevealed}
                            isHost={isHost}
                            users={users}
                            onVote={submitVote}
                            onReveal={revealVotes}
                            onReset={resetVoting}
                            onComplete={completeVoting}
                        />
                    </ErrorBoundary>
                )}

                <Box
                    p={6}
                    borderWidth={1}
                    borderRadius="xl"
                    boxShadow="lg"
                    bg="white"
                >
                    <Heading size="sm" mb={6}>Stories</Heading>
                    <List spacing={4}>
                        {stories.map((story) => (
                            <ListItem
                                key={story.id}
                                p={4}
                                borderWidth={1}
                                borderRadius="lg"
                                bg={currentStory === story.id ? 'blue.50' : 'white'}
                                transition="all 0.2s"
                                _hover={{ transform: 'translateY(-2px)' }}
                            >
                                <Flex align="center">
                                    <Box flex="1">
                                        <Text fontSize="lg">{story.title}</Text>
                                        {story.status === 'completed' && (
                                            <Badge
                                                colorScheme="green"
                                                mt={2}
                                                p={2}
                                                borderRadius="md"
                                            >
                                                Final Estimate: {story.finalEstimate}
                                            </Badge>
                                        )}
                                        {currentStory === story.id && (
                                            <Badge
                                                colorScheme="blue"
                                                mt={2}
                                                p={2}
                                                borderRadius="md"
                                            >
                                                Voting in Progress
                                            </Badge>
                                        )}
                                    </Box>
                                    {isHost && story.status === 'pending' && (
                                        <Tooltip label="Start Voting" hasArrow>
                                            <Button
                                                onClick={() => startVoting(story.id)}
                                                isDisabled={currentStory !== null}
                                                colorScheme="blue"
                                                size="sm"
                                                leftIcon={<FaPlay />}
                                                ml={4}
                                            >
                                                {currentStory === story.id ? 'Voting...' : 'Start'}
                                            </Button>
                                        </Tooltip>
                                    )}
                                </Flex>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </VStack>
        </Container>
    );
}

const RoomWithErrorBoundary = () => (
    <ErrorBoundary>
        <Room />
    </ErrorBoundary>
);

export default RoomWithErrorBoundary; 