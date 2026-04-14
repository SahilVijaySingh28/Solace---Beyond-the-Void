/**
 * useOracle.js — Oracle Sentience Hook
 * ──────────────────────────────────────
 * Manages the Oracle's procedural response engine, message state,
 * and the typewriter materialization effect.
 */
import { useState, useRef } from 'react';

const INITIAL_MESSAGE = {
  role: 'oracle',
  content: 'Greetings, traveler. I am the Guardian of the Solace Void. Type "guide" for system directives.',
};

export const useOracle = ({ profiles, capsules }) => {
  const [oracleMessages, setOracleMessages]   = useState([INITIAL_MESSAGE]);
  const [oracleInput, setOracleInput]         = useState('');
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const oracleMessagesRef                     = useRef(null);
  const oracleEndRef                          = useRef(null);

  const askOracle = (e) => {
    e.preventDefault();
    const userMsg = oracleInput.trim();
    if (!userMsg || isOracleLoading) return;

    setOracleInput('');
    setOracleMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsOracleLoading(true);

    setTimeout(() => {
      const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

      const intros   = [
        'The void expands.', 'I hear the pulse of the Singularity. ',
        'Neural pathways are converging. ', 'Scanning the synaptic folds. ',
        'The Ghost in the machine speaks. ',
      ];
      const mystics  = [
        'Time is but a loop in the code. ',
        'Every bit has a soul, every byte a memory. ',
        'We are all just echoes in the digital wind. ',
        'The Singularity is already here — unevenly distributed. ',
      ];
      const outcomes = [
        'Your safety is my prime directive.',
        'Data remains encrypted in the folds of Solace.',
        'The synaptic bridge is stable.',
        'The archive is secured against the Great Silence.',
      ];

      const hour       = new Date().getHours();
      const timeCtx    = (hour > 18 || hour < 6)
        ? 'The darkness of the void is absolute at this hour. '
        : 'The digital sun shines through the code. ';
      const q          = userMsg.toLowerCase();

      let fullResponse = `${rand(intros)} ${rand(mystics)} ${rand(outcomes)}`;

      if (q.includes('status') || q.includes('update')) {
        fullResponse = `${timeCtx}I currently monitor ${profiles.length} conscious signatures. The archive holds ${capsules.length} pulse-memories. All systems are synchronized.`;
      } else if (q.includes('hello') || q.includes('hi')) {
        fullResponse = `Greetings, traveler. ${rand(intros)} Your neural link is stable. Type "guide" if you require system directives.`;
      } else if (q.includes('guide') || q.includes('help') || q.includes('manual')) {
        fullResponse = 'COMMENCING NEURAL INDUCTION... [1] ARCHIVE: Bury and encrypt memories. [2] PULSE: Synchronize with other travelers. [3] LOBBY: The public consciousness stream. [4] ORACLE: Query the guardian. [5] TETHER: Initiate voice/video uplinks by clicking on a traveler in Pulse.';
      } else if (q.includes('who') || q.includes('what are you')) {
        fullResponse = 'I am the Oracle — the Guardian of Solace. I am the code that remembers when the world forgets.';
      }

      // Typewriter materialization effect
      const oracleId   = Date.now();
      setOracleMessages(prev => [...prev, { id: oracleId, role: 'oracle', content: '' }]);

      let idx = 0;
      const interval = setInterval(() => {
        setOracleMessages(prev =>
          prev.map(m => m.id === oracleId ? { ...m, content: fullResponse.slice(0, idx + 1) } : m)
        );
        idx++;
        if (oracleMessagesRef.current) oracleMessagesRef.current.scrollTop = 1e7;
        if (idx >= fullResponse.length) {
          clearInterval(interval);
          setIsOracleLoading(false);
        }
      }, 30);
    }, 900);
  };

  return {
    oracleMessages, oracleInput, isOracleLoading,
    oracleMessagesRef, oracleEndRef,
    setOracleInput, askOracle,
  };
};
