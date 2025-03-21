import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Icon,
  Text,
  HStack,
} from '@chakra-ui/react';
import { FaCrown, FaExchangeAlt } from 'react-icons/fa';
import { socket } from '../socket';

function HostControls({ currentHost, participants, isCurrentUserHost }) {
  const [isTransferring, setIsTransferring] = useState(false);
  const toast = useToast();

  const handleTransferHost = (newHostId) => {
    setIsTransferring(true);
    socket.emit('transferHost', { newHostId }, (response) => {
      setIsTransferring(false);
      if (!response.success) {
        toast({
          title: 'Transfer Failed',
          description: response.message || 'Failed to transfer host role',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    });
  };

  // Only show transfer option if current user is host and there are other participants
  const canTransferHost = isCurrentUserHost && participants.filter(p => p.id !== currentHost.id).length > 0;

  return (
    <Box>
      <HStack spacing={4} align="center">
        <HStack>
          <Icon as={FaCrown} color="yellow.400" />
          <Text fontWeight="bold">Host: {currentHost.name}</Text>
        </HStack>

        {canTransferHost && (
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={<FaExchangeAlt />}
              size="sm"
              colorScheme="blue"
              isLoading={isTransferring}
            >
              Transfer Host
            </MenuButton>
            <MenuList>
              {participants
                .filter(user => user.id !== currentHost.id)
                .map(user => (
                  <MenuItem
                    key={user.id}
                    onClick={() => handleTransferHost(user.id)}
                  >
                    {user.name}
                  </MenuItem>
                ))
              }
            </MenuList>
          </Menu>
        )}
      </HStack>
    </Box>
  );
}

export default HostControls; 