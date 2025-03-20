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
    Grid,
    GridItem,
    useToast,
    Heading,
    Badge,
    List,
    ListItem,
    Flex,
    Spacer,
    Icon,
    Tooltip,
    ScaleFade,
    Divider,
    useClipboard,
    InputGroup,
    InputRightElement,
} from '@chakra-ui/react';
import { FaCopy, FaHome, FaPlay, FaEye, FaCheck, FaPlus } from 'react-icons/fa';
import { socket } from '../socket';

const FIBONACCI_SEQUENCE = ['1', '2', '3', '5', '8', '13', '21', '?'];

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
    const { hasCopied, onCopy } = useClipboard(roomId);

    useEffect(() => {
        // Get the user's name and ID from localStorage
        const userName = localStorage.getItem('userName') || 'Guest';
        const userId = localStorage.getItem('userId');

        if (!userId) {
            navigate('/');
            return;
        }

        // Setup all socket event listeners first
        const setupSocketListeners = () => {
            socket.on('userJoined', ({ users: updatedUsers, host }) => {
                setUsers(updatedUsers);
                setIsHost(host === userId);
            });

            socket.on('userLeft', ({ users: updatedUsers, host }) => {
                setUsers(updatedUsers);
                setIsHost(host === userId);
            });

            socket.on('storiesUpdated', ({ stories: updatedStories }) => {
                console.log('Received storiesUpdated event:', updatedStories);
                setStories(updatedStories);

                // Show toast notification for new stories
                const lastStory = updatedStories[updatedStories.length - 1];
                if (lastStory && !stories.find(s => s.id === lastStory.id)) {
                    toast({
                        title: 'New Story Added',
                        description: lastStory.title,
                        status: 'success',
                        duration: 2000,
                        isClosable: true,
                    });
                }
            });

            socket.on('votingStarted', ({ storyId }) => {
                setCurrentStory(storyId);
                setVotesRevealed(false);
                setVotes([]);
                setSelectedVote(null);
            });

            socket.on('voteSubmitted', ({ totalVotes, userCount }) => {
                toast({
                    title: 'Vote submitted',
                    description: `${totalVotes}/${userCount} votes received`,
                    status: 'info',
                    duration: 2000,
                });
            });

            socket.on('votesRevealed', ({ votes: revealedVotes }) => {
                setVotes(revealedVotes);
                setVotesRevealed(true);
            });

            socket.on('votingCompleted', ({ stories: updatedStories }) => {
                setStories(updatedStories);
                setCurrentStory(null);
                setVotes([]);
                setVotesRevealed(false);
                setSelectedVote(null);
            });
        };

        // Clean up function to remove all listeners
        const cleanupSocketListeners = () => {
            socket.off('userJoined');
            socket.off('userLeft');
            socket.off('storiesUpdated');
            socket.off('votingStarted');
            socket.off('voteSubmitted');
            socket.off('votesRevealed');
            socket.off('votingCompleted');
        };

        // Setup listeners and join room
        setupSocketListeners();

        // Join room after setting up listeners
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
        });

        // Cleanup on component unmount
        return () => {
            cleanupSocketListeners();
        };
    }, [roomId, navigate, toast]);

    const addStory = () => {
        if (!newStory.trim()) return;

        // Optimistically add the story locally first
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
                setNewStory(''); // Clear input only on success

                // Remove the temporary story since we'll get the real one from the server
                setStories(prev => prev.filter(s => s.id !== tempStory.id));
            } else {
                // Remove the temporary story if the server request failed
                setStories(prev => prev.filter(s => s.id !== tempStory.id));
                toast({
                    title: 'Error',
                    description: response?.message || 'Failed to add story. Please try again.',
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
        socket.emit('startVoting', { roomId, storyId });
    };

    const submitVote = (value) => {
        setSelectedVote(value);
        socket.emit('submitVote', { roomId, vote: value });
    };

    const revealVotes = () => {
        socket.emit('revealVotes', { roomId });
    };

    const completeVoting = () => {
        const average = calculateAverage();
        socket.emit('completeVoting', { roomId, finalEstimate: average });
    };

    const calculateAverage = () => {
        const numericVotes = votes
            .map(v => v.vote)
            .filter(v => v !== '?')
            .map(Number);
        if (numericVotes.length === 0) return '?';
        const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
        return FIBONACCI_SEQUENCE.reduce((prev, curr) => {
            if (curr === '?') return prev;
            return Math.abs(Number(curr) - avg) < Math.abs(Number(prev) - avg) ? curr : prev;
        });
    };

    return (
        <Container maxW="container.xl" py={8}>
            <VStack spacing={8} align="stretch">
                <ScaleFade in={true} initialScale={0.9}>
                    <Flex align="center" mb={6}>
                        <Box>
                            <HStack spacing={4}>
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
                                    onClick={onCopy}
                                    _hover={{ opacity: 0.8 }}
                                >
                                    Room: {roomId} <Icon as={FaCopy} ml={2} />
                                </Badge>
                            </HStack>
                            <Text mt={2} color="gray.600">
                                Participants: {users.map(u => u.name).join(', ')}
                            </Text>
                        </Box>
                        <Spacer />
                        <Button
                            leftIcon={<FaHome />}
                            colorScheme="gray"
                            onClick={() => navigate('/')}
                            size="sm"
                        >
                            Leave Room
                        </Button>
                    </Flex>
                </ScaleFade>

                {isHost && (
                    <Box
                        p={6}
                        borderWidth={1}
                        borderRadius="xl"
                        boxShadow="lg"
                        bg="white"
                        transition="all 0.3s"
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
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
                    <Box
                        p={6}
                        borderWidth={1}
                        borderRadius="xl"
                        boxShadow="lg"
                        bg="white"
                        transition="all 0.3s"
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                    >
                        <Heading size="sm" mb={6}>Current Voting Session</Heading>
                        <Grid
                            templateColumns="repeat(8, 1fr)"
                            gap={4}
                            mb={6}
                        >
                            {FIBONACCI_SEQUENCE.map((value) => (
                                <GridItem key={value}>
                                    <Button
                                        onClick={() => submitVote(value)}
                                        colorScheme={selectedVote === value ? 'blue' : 'gray'}
                                        width="100%"
                                        height="60px"
                                        fontSize="xl"
                                        isDisabled={votesRevealed}
                                        _hover={!votesRevealed && { transform: 'translateY(-2px)' }}
                                        transition="all 0.2s"
                                    >
                                        {value}
                                    </Button>
                                </GridItem>
                            ))}
                        </Grid>

                        {isHost && (
                            <HStack spacing={4} justify="center">
                                <Button
                                    onClick={revealVotes}
                                    colorScheme="purple"
                                    isDisabled={votesRevealed}
                                    leftIcon={<FaEye />}
                                    size="lg"
                                >
                                    Reveal Votes
                                </Button>
                                {votesRevealed && (
                                    <Button
                                        onClick={completeVoting}
                                        colorScheme="green"
                                        leftIcon={<FaCheck />}
                                        size="lg"
                                    >
                                        Complete Voting
                                    </Button>
                                )}
                            </HStack>
                        )}

                        {votesRevealed && (
                            <Box mt={6}>
                                <Divider mb={4} />
                                <Heading size="sm" mb={4}>Results</Heading>
                                <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
                                    {votes.map((vote, index) => (
                                        <Box
                                            key={index}
                                            p={4}
                                            borderWidth={1}
                                            borderRadius="lg"
                                            bg="gray.50"
                                        >
                                            <Text fontWeight="bold">{vote.user.name}</Text>
                                            <Badge
                                                colorScheme="blue"
                                                fontSize="xl"
                                                p={2}
                                                mt={2}
                                            >
                                                {vote.vote}
                                            </Badge>
                                        </Box>
                                    ))}
                                </Grid>
                                <Box
                                    mt={4}
                                    p={4}
                                    borderWidth={1}
                                    borderRadius="lg"
                                    bg="green.50"
                                >
                                    <Text fontWeight="bold" color="green.700">
                                        Suggested Estimate: {calculateAverage()}
                                    </Text>
                                </Box>
                            </Box>
                        )}
                    </Box>
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
                                                Start
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

export default Room; 