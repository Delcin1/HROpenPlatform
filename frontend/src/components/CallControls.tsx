import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { VideoCall } from './VideoCall';

interface CallControlsProps {
  isCallActive: boolean;
  isIncomingCall: boolean;
  callerName?: string;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onSignal: (signal: any) => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isCallActive,
  isIncomingCall,
  callerName,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onSignal,
}) => {
  if (isCallActive) {
    return (
      <Dialog
        open={isCallActive}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'background.default',
          },
        }}
      >
        <VideoCall
          onSignal={onSignal}
          onEndCall={onEndCall}
          isIncoming={isIncomingCall}
        />
      </Dialog>
    );
  }

  if (isIncomingCall) {
    return (
      <Dialog
        open={isIncomingCall}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle>Incoming Call</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" gutterBottom>
              {callerName || 'Unknown Caller'}
            </Typography>
            <CircularProgress size={40} sx={{ my: 2 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            color="error"
            onClick={onRejectCall}
            sx={{ mr: 2 }}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onAcceptCall}
          >
            Accept
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return null;
}; 