import { useCallback, useEffect, useRef, useState } from 'react';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const extensionFor = (type) => (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');

/** Records microphone audio, or accepts an uploaded file. `audio` is { blob, url, name } once available. */
export function useRecorder({ maxSeconds = 120 } = {}) {
  const [status, setStatus] = useState('idle'); // idle | recording | ready
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState(null);
  const [error, setError] = useState('');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const releaseMic = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  const replaceAudio = useCallback((next) => {
    setAudio((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Use Chrome, or upload an audio file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        replaceAudio({ blob, url: URL.createObjectURL(blob), name: `speech.${extensionFor(type)}` });
        releaseMic();
        setStatus('ready');
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setStatus('recording');
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone access was blocked. Allow the microphone for this site and try again.');
    }
  }, [replaceAudio]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const useFile = useCallback((file) => {
    replaceAudio({ blob: file, url: URL.createObjectURL(file), name: file.name });
    setStatus('ready');
  }, [replaceAudio]);

  const reset = useCallback(() => {
    replaceAudio(null);
    setSeconds(0);
    setStatus('idle');
  }, [replaceAudio]);

  // Stop automatically at the time limit.
  useEffect(() => {
    if (status === 'recording' && seconds >= maxSeconds) stop();
  }, [status, seconds, maxSeconds, stop]);

  // Release the microphone if the page is left mid-recording.
  useEffect(() => () => {
    if (recorderRef.current) recorderRef.current.onstop = null;
    releaseMic();
  }, []);

  return { status, seconds, audio, error, start, stop, useFile, reset };
}
