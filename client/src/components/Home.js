import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Heading,
    Input,
    VStack,
    Text,
    useToast,
    ScaleFade,
    InputGroup,
    InputLeftElement,
    Icon,
} from '@chakra-ui/react';
import { FaUser, FaHashtag, FaPlus, FaDoorOpen } from 'react-icons/fa';
import { socket } from '../socket';

function Home() {
    const [userName, setUserName] = useState('');
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        // Load saved username if it exists
        const savedName = localStorage.getItem('userName');
        if (savedName) {
            setUserName(savedName);
        }
    }, []);

    const createRoom = () => {
        if (!userName) {
            toast({
                title: 'Error',
                description: 'Please enter your name',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        localStorage.setItem('userName', userName);
        socket.emit('createRoom', (response) => {
            if (response.success) {
                navigate(`/room/${response.roomId}`);
            }
        });
    };

    const joinRoom = () => {
        if (!userName || !roomId) {
            toast({
                title: 'Error',
                description: 'Please enter your name and room ID',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        localStorage.setItem('userName', userName);
        socket.emit('joinRoom', { roomId, userName }, (response) => {
            if (response.success) {
                navigate(`/room/${roomId}`);
            } else {
                toast({
                    title: 'Error',
                    description: response.message || 'Failed to join room',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });
    };

    return (
        <Container maxW="container.md" centerContent py={10} minH="100vh" bgGradient="linear(to-br, blue.50, purple.50)">
            <ScaleFade in={true} initialScale={0.9}>
                <VStack spacing={8} width="100%">
                    <Heading
                        as="h1"
                        size="2xl"
                        mb={4}
                        bgGradient="linear(to-r, blue.500, purple.500)"
                        bgClip="text"
                        fontWeight="extrabold"
                        letterSpacing="tight"
                    >
                        Planning Poker
                    </Heading>
                    <Box
                        width="100%"
                        p={8}
                        borderWidth={1}
                        borderRadius="xl"
                        boxShadow="2xl"
                        bg="white"
                        transition="all 0.3s"
                        _hover={{ transform: 'translateY(-2px)', boxShadow: '3xl' }}
                    >
                        <VStack spacing={6}>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                    <Icon as={FaUser} color="gray.400" />
                                </InputLeftElement>
                                <Input
                                    placeholder="Enter your name"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    size="lg"
                                    focusBorderColor="purple.400"
                                    _hover={{ borderColor: 'purple.300' }}
                                />
                            </InputGroup>
                            <Button
                                leftIcon={<FaPlus />}
                                colorScheme="blue"
                                width="100%"
                                size="lg"
                                onClick={createRoom}
                                _hover={{ transform: 'translateY(-2px)' }}
                                transition="all 0.2s"
                            >
                                Create New Room
                            </Button>
                            <Text
                                textAlign="center"
                                fontSize="lg"
                                fontWeight="bold"
                                color="gray.500"
                                px={4}
                                py={2}
                                borderRadius="md"
                                bg="gray.50"
                            >
                                OR
                            </Text>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                    <Icon as={FaHashtag} color="gray.400" />
                                </InputLeftElement>
                                <Input
                                    placeholder="Enter Room ID"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    size="lg"
                                    focusBorderColor="green.400"
                                    _hover={{ borderColor: 'green.300' }}
                                />
                            </InputGroup>
                            <Button
                                leftIcon={<FaDoorOpen />}
                                colorScheme="green"
                                width="100%"
                                size="lg"
                                onClick={joinRoom}
                                _hover={{ transform: 'translateY(-2px)' }}
                                transition="all 0.2s"
                            >
                                Join Room
                            </Button>
                        </VStack>
                    </Box>
                </VStack>
            </ScaleFade>
        </Container>
    );
}

export default Home; 