import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  VStack,
  HStack,
  Grid,
  GridItem,
  Button,
  Progress,
  Text,
  Badge,
  Heading,
  Divider,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { FaEye, FaCheck, FaRedo } from 'react-icons/fa';
import VotingScale from './VotingScale';
import socket from '../socket';

function VotingSession({
  story,
  roomId,
  selectedVote,
  votes,
  votesRevealed,
  isHost,
  users,
  onVote,
  onReveal,
  onReset,
  onComplete
}) {
  const [currentScale, setCurrentScale] = useState(null);

  useEffect(() => {
    // Get current scale when component mounts
    socket.emit('getCurrentScale', { roomId }, (response) => {
      if (response.success) {
        setCurrentScale(response.scale);
      }
    });

    // Listen for scale updates
    const handleScaleUpdate = (data) => {
      setCurrentScale(data.scale);
    };

    socket.on('scaleUpdated', handleScaleUpdate);

    return () => {
      socket.off('scaleUpdated', handleScaleUpdate);
    };
  }, [roomId]);

  const getVotingProgress = () => {
    if (!users.length) return 0;
    return (votes.length / users.length) * 100;
  };

  const calculateStatistics = () => {
    const numericVotes = votes
      .map(v => v.vote)
      .filter(v => {
        // Find the vote value in the current scale
        const scaleValue = currentScale?.values.find(sv => sv.value === v);
        // Only include if it's a numeric type
        return scaleValue && scaleValue.type === 'numeric';
      })
      .map(Number);

    if (numericVotes.length === 0) {
      return {
        average: '?',
        median: '?',
        mode: '?',
        spread: 0
      };
    }

    // Calculate average
    const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

    // Calculate median
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Calculate mode
    const frequency = {};
    numericVotes.forEach(vote => {
      frequency[vote] = (frequency[vote] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency)
      .filter(key => frequency[key] === maxFreq)
      .map(Number);

    // Calculate spread (max - min)
    const spread = Math.max(...numericVotes) - Math.min(...numericVotes);

    return {
      average: avg.toFixed(1),
      median: median.toString(),
      mode: modes.join(', '),
      spread: spread
    };
  };

  const getNonVoters = () => {
    const voterIds = new Set(votes.map(v => v.user.id));
    return users.filter(user => !voterIds.has(user.id));
  };

  const stats = calculateStatistics();
  const nonVoters = getNonVoters();

  return (
    <Box p={6} borderWidth={1} borderRadius="xl" boxShadow="lg" bg="white">
      <VStack spacing={4} align="stretch">
        <Heading size="sm">
          Current Story: {story.title}
        </Heading>

        <Box>
          <Text fontSize="sm" mb={2}>Voting Progress</Text>
          <Progress
            value={getVotingProgress()}
            size="sm"
            colorScheme="blue"
            borderRadius="full"
            hasStripe
            isAnimated
          />
          {nonVoters.length > 0 && (
            <Text fontSize="sm" color="gray.600" mt={2}>
              Waiting for: {nonVoters.map(u => u.name).join(', ')}
            </Text>
          )}
        </Box>

        <Box>
          <VotingScale roomId={roomId} isHost={isHost} />
        </Box>

        {currentScale && (
          <Grid templateColumns="repeat(8, 1fr)" gap={4} mb={6}>
            {currentScale.values.map((value) => (
              <GridItem key={value.value}>
                <Tooltip
                  label={selectedVote === value.value ? "Your vote" : "Click to vote"}
                  hasArrow
                >
                  <Button
                    onClick={() => onVote(value.value)}
                    colorScheme={selectedVote === value.value ? 'blue' : 'gray'}
                    width="100%"
                    height="60px"
                    fontSize="xl"
                    isDisabled={votesRevealed}
                    _hover={!votesRevealed && { transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    {value.displayValue}
                  </Button>
                </Tooltip>
              </GridItem>
            ))}
          </Grid>
        )}

        {isHost && (
          <HStack spacing={4} justify="center">
            <Button
              onClick={onReveal}
              colorScheme="purple"
              isDisabled={votesRevealed || votes.length === 0}
              leftIcon={<FaEye />}
              size="lg"
            >
              Reveal Votes
            </Button>
            {votesRevealed && (
              <Button
                onClick={onComplete}
                colorScheme="green"
                leftIcon={<FaCheck />}
                size="lg"
              >
                Complete Voting
              </Button>
            )}
            <Button
              onClick={onReset}
              colorScheme="red"
              leftIcon={<FaRedo />}
              size="lg"
            >
              Reset Voting
            </Button>
          </HStack>
        )}

        {votesRevealed && (
          <Box mt={6}>
            <Divider mb={4} />
            <VStack spacing={6} align="stretch">
              <StatGroup>
                <Stat>
                  <StatLabel>Average</StatLabel>
                  <StatNumber>{stats.average}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Median</StatLabel>
                  <StatNumber>{stats.median}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Mode</StatLabel>
                  <StatNumber>{stats.mode}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Spread</StatLabel>
                  <StatNumber>{stats.spread}</StatNumber>
                </Stat>
              </StatGroup>

              <Box>
                <Heading size="sm" mb={4}>Individual Votes</Heading>
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
                      {vote.updates > 0 && (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          Changed {vote.updates} time{vote.updates > 1 ? 's' : ''}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Grid>
              </Box>
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

VotingSession.propTypes = {
  story: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string,
    finalEstimate: PropTypes.string,
  }).isRequired,
  roomId: PropTypes.string.isRequired,
  selectedVote: PropTypes.string,
  votes: PropTypes.arrayOf(PropTypes.shape({
    user: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,
    vote: PropTypes.string.isRequired,
    updates: PropTypes.number,
  })).isRequired,
  votesRevealed: PropTypes.bool.isRequired,
  isHost: PropTypes.bool.isRequired,
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  onVote: PropTypes.func.isRequired,
  onReveal: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
};

VotingSession.defaultProps = {
  selectedVote: null,
};

export default VotingSession; 