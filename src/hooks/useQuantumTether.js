/**
 * useQuantumTether.js — WebRTC Calling Hook
 * ───────────────────────────────────────────
 * Manages the full lifecycle of the Quantum Tether:
 * peer connection, media streams, ICE negotiation,
 * and the Always-On signaling channel (dead-zone free).
 */
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useQuantumTether = ({ user, myProfile, onCallLog }) => {
  const [callState,   setCallState]   = useState('idle'); // idle | calling | ringing | active
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [callerInfo,  setCallerInfo]  = useState(null);

  const peerConnection     = useRef(null);
  const signalingChannel   = useRef(null);
  const signalingHandlers  = useRef({});  // Late-binding pattern — prevents stale closures
  const localVideoRef      = useRef(null);
  const remoteVideoRef     = useRef(null);

  // ── Always-On Signaling Channel ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    signalingChannel.current = supabase.channel(`calls:${user.id}`)
      .on('broadcast', { event: 'call-offer'  }, (p) => signalingHandlers.current.handleIncomingCall(p))
      .on('broadcast', { event: 'call-answer' }, (p) => signalingHandlers.current.handleCallAnswer(p))
      .on('broadcast', { event: 'ice-candidate' }, (p) => signalingHandlers.current.handleIceCandidate(p))
      .on('broadcast', { event: 'call-reject' }, (p) => signalingHandlers.current.handleCallReject(p))
      .on('broadcast', { event: 'call-hangup' }, () => signalingHandlers.current.endCall(false))
      .subscribe();

    return () => {
      if (signalingChannel.current) supabase.removeChannel(signalingChannel.current);
    };
  }, [user]);

  // ── Attach media streams to video elements when available ─────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Core WebRTC helpers ───────────────────────────────────────────────────
  const initPeer = async (targetId, isVideo) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        supabase.channel(`calls:${targetId}`)
          .httpSend('ice-candidate', { candidate: e.candidate, from: user.id });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    peerConnection.current = pc;
    return pc;
  };

  const endCall = (sendSignal = true) => {
    if (sendSignal && callerInfo) {
      supabase.channel(`calls:${callerInfo.id}`)
        .httpSend('call-hangup', { from: user.id });
    }
    localStream?.getTracks().forEach(t => t.stop());
    peerConnection.current?.close();
    setCallState('idle');
    setLocalStream(null);
    setCallerInfo(null);
  };

  const startCall = async (targetUser, isVideo = true) => {
    setCallState('calling');
    setCallerInfo(targetUser);
    setIsVideoCall(isVideo);

    const pc     = await initPeer(targetUser.id, isVideo);
    const offer  = await pc.createOffer();
    await pc.setLocalDescription(offer);

    supabase.channel(`calls:${targetUser.id}`)
      .httpSend('call-offer', { offer, from: user.id, username: myProfile?.username || user.email, isVideo });

    onCallLog?.(targetUser.id, isVideo ? 'video' : 'voice', 'initiated');
  };

  const handleIncomingCall = ({ payload }) => {
    if (callState !== 'idle') return;
    setCallState('ringing');
    setCallerInfo({ id: payload.from, username: payload.username });
    setIsVideoCall(payload.isVideo);
    peerConnection.current = payload; // Temporarily holds offer payload
  };

  const acceptCall = async () => {
    const offer = peerConnection.current;
    const pc    = await initPeer(offer.from, offer.isVideo);
    await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setCallState('active');

    supabase.channel(`calls:${offer.from}`)
      .httpSend('call-answer', { answer, from: user.id });

    onCallLog?.(offer.from, offer.isVideo ? 'video' : 'voice', 'accepted');
  };

  const handleCallAnswer = async ({ payload }) => {
    if (callState !== 'calling') return;
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setCallState('active');
    } catch {
      setCallState('idle');
    }
  };

  const handleIceCandidate = async ({ payload }) => {
    if (peerConnection.current && payload.from !== user.id) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch { /* non-fatal */ }
    }
  };

  const handleCallReject = () => {
    if (callState === 'calling') { alert('Connection rejected.'); endCall(); }
  };

  const rejectCall = () => {
    supabase.channel(`calls:${callerInfo.id}`).httpSend('call-reject', { from: user.id });
    endCall();
  };

  // Keep handler refs fresh every render (prevents stale closure bugs)
  signalingHandlers.current = { handleIncomingCall, handleCallAnswer, handleIceCandidate, handleCallReject, endCall };

  return {
    callState, isVideoCall, localStream, callerInfo,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, endCall,
  };
};
