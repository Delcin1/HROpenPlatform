import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { Button, IconButton, Box, Grid, Paper } from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
} from '@mui/icons-material';

interface VideoCallProps {
  onSignal: (signal: any) => void;
  onEndCall: () => void;
  isIncoming?: boolean;
  wsRef?: React.MutableRefObject<WebSocket | null>;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  onSignal,
  onEndCall,
  isIncoming = false,
  wsRef,
}) => {
  const {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    handleSignal,
  } = useWebRTC(onSignal);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    if (wsRef?.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending call-end message...');
      wsRef.current.send(JSON.stringify({
        type: 'call-end',
        timestamp: new Date().toISOString(),
      }));
    }
    
    endCall();
    onEndCall();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ flex: 1, p: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                padding: '4px 8px',
                borderRadius: 1,
              }}
            >
              You
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: 'black',
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                padding: '4px 8px',
                borderRadius: 1,
              }}
            >
              Remote User
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <IconButton
          color="primary"
          onClick={toggleAudio}
          sx={{ bgcolor: 'background.paper' }}
        >
          {localStream?.getAudioTracks()[0]?.enabled ? <Mic /> : <MicOff />}
        </IconButton>
        <IconButton
          color="primary"
          onClick={toggleVideo}
          sx={{ bgcolor: 'background.paper' }}
        >
          {localStream?.getVideoTracks()[0]?.enabled ? (
            <Videocam />
          ) : (
            <VideocamOff />
          )}
        </IconButton>
        <IconButton
          color="error"
          onClick={handleEndCall}
          sx={{ bgcolor: 'background.paper' }}
        >
          <CallEnd />
        </IconButton>
      </Box>
    </Box>
  );
}; 