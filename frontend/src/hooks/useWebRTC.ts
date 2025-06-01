import { useEffect, useRef, useState } from 'react';

interface WebRTCHook {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  handleSignal: (signal: any) => Promise<void>;
}

export const useWebRTC = (onSignal: (signal: any) => void): WebRTCHook => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.onconnectionstatechange = () => {
      setIsConnected(peerConnection.connectionState === 'connected');
    };

    return peerConnection;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const peerConnection = initializePeerConnection();
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      onSignal({
        type: 'offer',
        sdp: offer,
      });
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const handleSignal = async (signal: any) => {
    if (!peerConnectionRef.current) {
      initializePeerConnection();
    }

    const peerConnection = peerConnectionRef.current!;

    switch (signal.type) {
      case 'offer':
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        onSignal({
          type: 'answer',
          sdp: answer,
        });
        break;

      case 'answer':
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        break;

      case 'ice-candidate':
        if (signal.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
        break;
    }
  };

  return {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    handleSignal,
  };
}; 