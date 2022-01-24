import {
  useEffect, useState, useRef, useCallback,
} from '../lib/teact/teact';

const Cleanup = (val: HTMLVideoElement | undefined) => {
  const valRef = useRef(val);
  useEffect(() => {
    valRef.current = val;
  }, [val]);

  useEffect(() => {
    return () => {
      // cleanup based on valRef.current
      // eslint-disable-next-line no-console
      console.log('clean up based on valRef.current: ', valRef.current);
    };
  }, []);
};

const initializeCamera = () => navigator.mediaDevices.getUserMedia({ audio: false, video: true });

export default function useCamera(videoRef: { current: HTMLVideoElement | null }) {
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (video || !videoRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    if (videoElement instanceof HTMLVideoElement) {
      setVideo(videoRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current, video]);

  useEffect(() => {
    Cleanup(video);
  }, [video]);

  const gotStream = useCallback((stream: MediaStream) => {
    if (!video) return;
    video.srcObject = stream;
    setIsCameraInitialized(true);
  }, [video]);

  useEffect(() => {
    async function initCamera() {
      if (!video || isCameraInitialized) {
        return;
      }
      try {
        const stream = await initializeCamera();
        gotStream(stream);
      } catch (err) {
        let message;
        if (err instanceof Error) message = err.message;
        else message = String(err);
        setError(message);
        setIsCameraInitialized(false);
      }
    }
    initCamera();
  }, [video, gotStream, isCameraInitialized]);

  return { video, isCameraInitialized, error };
}
