import SockJS from 'sockjs-client';
import React, {
  FC,
  useEffect,
  useCallback,
  useState,
  useRef,
  memo,
} from '../../../lib/teact/teact';
import { withGlobal } from '../../../lib/teact/teactn';

import { selectUser } from '../../../modules/selectors';

import { ApiUser } from '../../../api/types';

import Button from '../../ui/Button';

import {
  WEBSOCKET_URL,
  INIT,
  GC_RATE,
  REMOVE_THRESHOLD,
  SNAPSHOT_RATE,
  PING_RATE,
  UPDATE_RATE,
  WEBSOCKET_RECONNECTION_RATE,
} from './constants';

import useInterval from '../../../hooks/useInterval';

import { formatRoom } from './helpers';

import './Immedia.scss';

type ParticipantsType = {
  id: string;
  nickname?: string;
  timestamp?: number;
  image?: string;
};

type OwnProps = {
  chatId: string;
};

type StateProps = {
  currentUser?: ApiUser;
};

const Immedia: FC<OwnProps & StateProps> = ({ chatId, currentUser }) => {
  const [roomId, setRoomId] = useState<String | undefined>(undefined);
  // State that tracks when update is being run. Triggers another update after UPDATE_RATE seconds.
  const [lastSnapshot, setLastSnapshot] = useState<string | undefined>(
    undefined,
  );
  const [messageId, setMessageId] = useState(0);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [nickname, setNickname] = useState('');
  const [awareness, setAwareness] = useState(false);
  const [participants, setParticipants] = useState<ParticipantsType[]>([]);
  const [reconnection, setReconnection] = useState(false);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | undefined>(undefined);
  // eslint-disable-next-line  no-null/no-null
  const canvasMeRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line  no-null/no-null
  const videoMeRef = useRef<HTMLVideoElement | null>(null);

  const isParticipantPresent = (id: string) => participants.some((p) => p.id === id);

  const unsubscribeUserId = useCallback(() => {
    const currentMessageId = messageId + 1;
    setMessageId(currentMessageId);
    const message = {
      msgId: currentMessageId,
      id: userId,
      room: roomId,
      type: 'uns',
    };
    wsRef.current?.send(JSON.stringify(message));
  }, [userId, roomId, messageId]);

  const subscribeUserId = useCallback(() => {
    const currentMessageId = messageId + 1;
    setMessageId(currentMessageId);
    const currentRoomId = formatRoom(chatId);
    setRoomId(currentRoomId);
    const message = {
      msgId: currentMessageId,
      type: 'sub',
      room: currentRoomId,
      data: { password: false },
    };
    wsRef.current?.send(JSON.stringify(message));
  }, [messageId, chatId]);

  const createConnection = () => {
    wsRef.current = new SockJS(WEBSOCKET_URL);

    wsRef.current.onopen = () => {
      // eslint-disable-next-line no-console
      console.log(INIT, 'ws opened');
      setConnected(true);
      // if awareness was activated (reconnection), then subscribe to the room again
      if (awareness) subscribeUserId();
    };
    wsRef.current.onclose = () => {
      wsRef.current = undefined;
      setConnected(false);
      unsubscribeUserId();
      setUserId(undefined);
      // eslint-disable-next-line no-console
      console.log(INIT, 'ws closed');
      // reconnect
      setReconnection(true);
    };
    wsRef.current.onerror = (event) => {
      // eslint-disable-next-line no-console
      console.log(INIT, 'ws error');
      // eslint-disable-next-line no-console
      console.log(INIT, event);
      wsRef.current?.close();
    };
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const createConnectionCallback = useCallback(createConnection, [awareness]);

  useEffect(() => {
    if (reconnection) {
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(INIT, 'Reconnecting WS...');
        createConnectionCallback();
      }, WEBSOCKET_RECONNECTION_RATE);
      setReconnection(false);
    }
  }, [reconnection, createConnectionCallback]);

  useEffect(() => {
    if (!wsRef.current) createConnectionCallback();
  }, [createConnectionCallback]);

  const cleanUp = () => {
    // eslint-disable-next-line no-console
    console.log(INIT, 'Cleaning up!');
    setParticipants([]);
    setAwareness(false);
    setLastSnapshot(undefined);
    setUserId(undefined);
    setRoomId(undefined);
    // TODO: Check how to clean up tracks when user changes chats
    // FIX: Sometimes it works (i.e., disable webcam light), sometimes it doesn't.
    if (videoMeRef.current) {
      if (videoMeRef.current.srcObject) {
        const tracks = (videoMeRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    }
  };

  useEffect(() => {
    // log the number of participants in the room
    // eslint-disable-next-line no-console
    if (participants.length) console.log(INIT, `There are ${1 + participants.length} participants in the room`);
  }, [participants]);

  const joinedParticipant = (participant: ParticipantsType) => {
    setParticipants([...participants, participant]);
  };

  const updatedParticipant = (participant: ParticipantsType) => {
    setParticipants(
      participants.map((p) => (p.id === participant.id ? participant : p)),
    );
  };

  const leftParticipant = (participant: ParticipantsType) => {
    setParticipants(participants.filter((p) => p.id !== participant.id));
  };

  // Sends a re-subscription when there are reconnections.
  useInterval(() => {
    subscribeUserId();
  }, awareness && connected && userId === undefined ? WEBSOCKET_RECONNECTION_RATE : undefined);

  const handleMessage = useCallback((data: any) => {
    const messageData = data.data;
    switch (data.type) {
      case 'join':
        // {type: 'join', data: 'idxxx'}
        if (!isParticipantPresent(messageData)) joinedParticipant({ id: messageData });
        break;
      case 'update':
        // {type: 'update', data: {id: 'idxxx', timestamp: 123456789, nickname: 'nckxxx', image: 'img_url'}}
        // check if participant is already present
        if (isParticipantPresent(messageData.id)) updatedParticipant(messageData);
        else joinedParticipant(messageData);
        break;
      case 'left':
        // {type: 'left', data: ['idxxx', 'idyyy', ...]}
        messageData.forEach((id: string) => leftParticipant({ id }));
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  useEffect(() => {
    if (connected && wsRef.current) {
      wsRef.current.onmessage = (event) => {
        const response = JSON.parse(event.data);
        const { data } = response;
        // eslint-disable-next-line no-console
        console.log(INIT, 'RECEIVED MESSAGE!');
        // eslint-disable-next-line no-console
        console.log(INIT, response);
        if (data.id && data.success === true) {
          // eslint-disable-next-line no-console
          console.log(INIT, 'SET USER ID: ', data.id);
          setUserId(data.id);
        }
        handleMessage(response);
      };
    }
  }, [handleMessage, connected]);

  useEffect(() => {
    // Add whitespace until data is loaded
    setNickname(currentUser?.username || '\u00a0\u00a0');
  }, [currentUser]);

  const enableAwareness = () => {
    if (wsRef.current) {
      // eslint-disable-next-line no-console
      console.log(INIT, 'Enabled Awareness');
      subscribeUserId();
      setAwareness(true);
    }
  };

  const disableAwareness = () => {
    // eslint-disable-next-line no-console
    console.log(INIT, 'Disabled Awareness');
    if (wsRef.current && userId !== undefined) unsubscribeUserId();
    cleanUp();
  };

  useEffect(() => {
    const getParticipantsSnapshots = () => {
      // update each participant's snapshot
      participants.forEach((participant) => {
        // eslint-disable-next-line no-console
        console.log(INIT, 'Getting snapshot for', participant);
        const canvas = document.getElementById(
          `canvas-${participant.id}`,
        ) as HTMLCanvasElement;
        if (canvas) {
          const context = canvas.getContext('2d');
          const image = new Image();
          image.onload = () => {
            context?.drawImage(image, 0, 0, canvas.width, canvas.height);
          };
          if (participant.image) image.src = participant.image;
        }
      });
    };
    if (awareness && participants.length) getParticipantsSnapshots();
  }, [participants, awareness]);

  const getSnapshotVideo = () => {
    if (canvasMeRef.current) {
      const context = canvasMeRef.current.getContext('2d');

      const cbk = (stream: MediaStream) => {
        if (videoMeRef.current && context) {
          videoMeRef.current.srcObject = stream;
          // Wait some time beacuse the video is not ready
          // FIX: Maybe there's a better way to do this.
          // TRY: https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/ImageCapture
          setTimeout(() => {
            const video = videoMeRef.current;
            const canvas = canvasMeRef.current;
            // eslint-disable-next-line  no-null/no-null
            if (video === null || canvas === null) return;
            // show snapshot
            context.drawImage(
              video,
              160,
              120,
              360,
              240,
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const image = canvas.toDataURL();
            setLastSnapshot(image);
          }, SNAPSHOT_RATE / 5);
        }
      };

      if (navigator.mediaDevices.getUserMedia) {
        // TODO: Rewrite using async/await
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => cbk(stream))
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error(err);
          });
      } else {
        // eslint-disable-next-line no-console
        console.error(new Error(`${INIT}There is no user media`));
      }
    }
  };

  useInterval(() => {
    getSnapshotVideo();
  }, awareness ? SNAPSHOT_RATE : undefined);

  // GC that runs every GC_RATE seconds and checks if, for each participant,
  // their last snapshot was taken inside a REMOVE_THRESHOLD seconds time frame.
  // If not, it will remove the participant.
  const updateParticipants = () => {
    participants.forEach((participant) => {
      const removeThreshold = new Date().getTime() - REMOVE_THRESHOLD;
      if (participant.timestamp && participant.timestamp < removeThreshold) {
        setParticipants(participants.filter((p) => p.id !== participant.id));
      }
    });
  };

  useInterval(() => {
    updateParticipants();
  }, awareness && wsRef.current !== undefined ? GC_RATE : undefined);

  const sendUpdate = useCallback(() => {
    const currentMessageId = messageId + 1;
    setMessageId(currentMessageId);
    const message = {
      msgId: currentMessageId,
      id: userId,
      type: 'app',
      room: roomId,
      data: {
        type: 'update',
        data: {
          image: lastSnapshot,
          timestamp: new Date().getTime(),
          nickname,
          id: userId,
        },
      },
    };
    // eslint-disable-next-line no-console
    console.log(INIT, 'Updating with message: ', message);
    wsRef.current?.send(JSON.stringify(message));
  }, [userId, messageId, roomId, lastSnapshot, nickname]);

  useInterval(() => {
    sendUpdate();
  }, awareness && connected && userId ? UPDATE_RATE : undefined);

  // TODO: Define the Heartbeat function to keep track user connection.
  // Keep Track of connection status
  const ping = () => {
    const type = 'ping';
    const currentMessageId = messageId + 1;
    setMessageId(currentMessageId);
    const message = {
      msgId: currentMessageId,
      type,
      room: roomId,
      data: undefined,
    };
    // eslint-disable-next-line no-console
    console.log(INIT, `${type.toUpperCase()}: `, message);
    wsRef.current?.send(JSON.stringify(message));
  };

  useInterval(() => {
    ping();
  }, awareness && connected && userId ? PING_RATE : undefined);

  return (
    <div className="immedia-presence">
      {/* Participants Header */}
      <div
        className={`immedia-header custom-scroll ${
          awareness || 'immedia-background'
        }`}
      >
        {awareness && (
          <div className="rows">
            <div key={userId} className="participant participant-me">
              <video
                ref={videoMeRef}
                autoPlay
                className="video-me"
              >
                <track kind="captions" />
              </video>
              <canvas
                ref={canvasMeRef}
                className="photo-canvas"
                width="70"
                height="50"
              />
              <text className="photo-caption">{nickname}</text>
            </div>
            {participants
              && participants.map(
                ({ id, image, nickname: participantNickname }) => {
                  return image === undefined ? (
                    <div key={id} className="participant" />
                  ) : (
                    <div key={id} className="participant participant-not-me">
                      <canvas
                        className="photo-canvas"
                        id={`canvas-${id}`}
                      />
                      <text className="photo-caption">{participantNickname}</text>
                    </div>
                  );
                },
              )}
          </div>
        )}
      </div>
      {/* Action Buttons */}
      { process.env.IMMEDIA_ROOM_ID !== undefined && process.env.IMMEDIA_ROOM_ID === chatId && (
        <Button
          className="enable-disable-awareness"
          color="primary"
          onClick={awareness ? disableAwareness : enableAwareness}
        >
          {awareness ? 'Disable Awareness' : 'Enable Awareness'}
        </Button>
      )}
    </div>
  );
};

export default memo(
  withGlobal<OwnProps>((global): StateProps => {
    const { currentUserId } = global;

    return {
      currentUser: currentUserId
        ? selectUser(global, currentUserId)
        : undefined,
    };
  })(Immedia),
);
