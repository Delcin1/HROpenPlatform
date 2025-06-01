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

export const useWebRTC = (onSignal: (signal: any) => void, isIncoming: boolean = false): WebRTCHook => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([]);
  const remoteDescriptionSetRef = useRef<boolean>(false);

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
    console.log('🔧 Initializing peer connection...', {isIncoming});
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate:', event.candidate);
        onSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      } else {
        console.log('✅ All ICE candidates have been sent');
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('📺 Received remote track:', event.streams[0]);
      console.log('📺 Track details:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streamId: event.streams[0]?.id
      });
      setRemoteStream(event.streams[0]);
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state changed:', peerConnection.connectionState);
      setIsConnected(peerConnection.connectionState === 'connected');
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed:', peerConnection.iceConnectionState);
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log('🧊 ICE gathering state changed:', peerConnection.iceGatheringState);
    };

    return peerConnection;
  };

  const startCall = async () => {
    try {
      console.log('Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('Got local stream:', stream);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const peerConnection = initializePeerConnection();
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track);
        peerConnection.addTrack(track, stream);
      });

      if (!isIncoming) {
        console.log('Creating offer...');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Sending offer:', offer);
        onSignal({
          type: 'offer',
          sdp: offer,
        });
      } else {
        console.log('Incoming call - waiting for offer...');
      }
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
    
    // Сбрасываем флаги и очищаем буфер
    remoteDescriptionSetRef.current = false;
    iceCandidateBufferRef.current = [];
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
    console.log('🔄 Received WebRTC signal:', signal.type, signal);
    
    if (!peerConnectionRef.current) {
      console.log('⚠️ No peer connection, initializing...');
      initializePeerConnection();
    }

    const peerConnection = peerConnectionRef.current!;
    console.log('📡 Current peer connection state:', peerConnection.connectionState);

    switch (signal.type) {
      case 'offer':
        console.log('📨 Processing offer...', {isIncoming});
        try {
          // Правильно извлекаем SDP из сигнала
          const sdp = signal.sdp?.sdp || signal.sdp;
          console.log('📄 SDP received:', typeof sdp, sdp?.substring(0, 50) + '...');
          
          const sessionDescription = new RTCSessionDescription({
            type: 'offer',
            sdp: sdp
          });
          
          await peerConnection.setRemoteDescription(sessionDescription);
          remoteDescriptionSetRef.current = true;
          console.log('✅ Remote description (offer) set successfully');
          
          // Обрабатываем буферизованные ICE кандидаты
          console.log(`🧊 Processing ${iceCandidateBufferRef.current.length} buffered ICE candidates`);
          for (const candidate of iceCandidateBufferRef.current) {
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('✅ Buffered ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Error adding buffered ICE candidate:', error);
            }
          }
          iceCandidateBufferRef.current = []; // Очищаем буфер
          
          console.log('🔄 Creating answer...');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('📤 Sending answer:', answer);
          onSignal({
            type: 'answer',
            sdp: answer,
          });
        } catch (error) {
          console.error('❌ Error processing offer:', error);
        }
        break;

      case 'answer':
        console.log('📨 Processing answer...', {isIncoming});
        try {
          // Правильно извлекаем SDP из сигнала
          const sdp = signal.sdp?.sdp || signal.sdp;
          console.log('📄 SDP received:', typeof sdp, sdp?.substring(0, 50) + '...');
          
          const sessionDescription = new RTCSessionDescription({
            type: 'answer',
            sdp: sdp
          });
          
          await peerConnection.setRemoteDescription(sessionDescription);
          remoteDescriptionSetRef.current = true;
          console.log('✅ Remote description (answer) set successfully');
          
          // Обрабатываем буферизованные ICE кандидаты
          console.log(`🧊 Processing ${iceCandidateBufferRef.current.length} buffered ICE candidates`);
          for (const candidate of iceCandidateBufferRef.current) {
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('✅ Buffered ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Error adding buffered ICE candidate:', error);
            }
          }
          iceCandidateBufferRef.current = []; // Очищаем буфер
        } catch (error) {
          console.error('❌ Error processing answer:', error);
        }
        break;

      case 'ice-candidate':
        console.log('🧊 Processing ICE candidate...', {isIncoming});
        if (signal.candidate) {
          const candidate = new RTCIceCandidate(signal.candidate);
          
          if (remoteDescriptionSetRef.current) {
            // Remote description установлена, добавляем кандидата сразу
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('✅ ICE candidate added successfully');
            } catch (error) {
              console.error('❌ Error adding ICE candidate:', error);
            }
          } else {
            // Remote description еще не установлена, буферизуем кандидата
            console.log('📦 Buffering ICE candidate until remote description is set');
            iceCandidateBufferRef.current.push(candidate);
          }
        }
        break;
        
      default:
        console.warn('⚠️ Unknown signal type:', signal.type);
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