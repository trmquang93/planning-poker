import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  useToast,
  Heading,
  Badge,
  Flex,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import socket from '../socket';

const VotingScale = ({ roomId, isHost }) => {
  const [currentScale, setCurrentScale] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState([]);
  const toast = useToast();

  useEffect(() => {
    // Get current scale when component mounts
    socket.emit('getCurrentScale', { roomId }, (response) => {
      if (response.success) {
        setCurrentScale(response.scale);
        setEditedValues(response.scale.values);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to get voting scale',
          status: 'error',
          duration: 3000,
        });
      }
    });

    // Listen for scale updates
    const handleScaleUpdate = (data) => {
      setCurrentScale(data.scale);
      setEditedValues(data.scale.values);
      toast({
        title: 'Scale Updated',
        description: 'The voting scale has been updated',
        status: 'info',
        duration: 2000,
      });
    };

    socket.on('scaleUpdated', handleScaleUpdate);

    return () => {
      socket.off('scaleUpdated', handleScaleUpdate);
    };
  }, [roomId, toast]);

  const handleUpdateScale = () => {
    const updatedScale = {
      ...currentScale,
      values: editedValues
    };

    socket.emit('updateScale', { roomId, scale: updatedScale }, (response) => {
      if (response.success) {
        setCurrentScale(response.scale);
        setIsEditing(false);
        toast({
          title: 'Success',
          description: 'Voting scale updated successfully',
          status: 'success',
          duration: 2000,
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update voting scale',
          status: 'error',
          duration: 3000,
        });
      }
    });
  };

  const handleCancelEdit = () => {
    setEditedValues(currentScale.values);
    setIsEditing(false);
  };

  if (!currentScale) return null;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white" shadow="sm">
      <VStack spacing={4} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="sm">Voting Scale</Heading>
          {isHost && (
            <HStack>
              {isEditing ? (
                <>
                  <Tooltip label="Save changes">
                    <IconButton
                      icon={<FaSave />}
                      onClick={handleUpdateScale}
                      colorScheme="green"
                      size="sm"
                      aria-label="Save changes"
                    />
                  </Tooltip>
                  <Tooltip label="Cancel">
                    <IconButton
                      icon={<FaTimes />}
                      onClick={handleCancelEdit}
                      colorScheme="red"
                      size="sm"
                      aria-label="Cancel"
                    />
                  </Tooltip>
                </>
              ) : (
                <Tooltip label="Edit scale">
                  <IconButton
                    icon={<FaEdit />}
                    onClick={() => setIsEditing(true)}
                    colorScheme="blue"
                    size="sm"
                    aria-label="Edit scale"
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </Flex>

        <Flex wrap="wrap" gap={2}>
          {(isEditing ? editedValues : currentScale.values).map((value, index) => (
            <Badge
              key={index}
              colorScheme={value.type === 'numeric' ? 'blue' : 'gray'}
              variant={isEditing ? 'solid' : 'subtle'}
              fontSize="md"
              px={3}
              py={1}
              borderRadius="full"
            >
              {value.displayValue}
            </Badge>
          ))}
        </Flex>

        {isEditing && (
          <Text fontSize="sm" color="gray.500">
            Note: Scale editing feature coming soon
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default VotingScale; 