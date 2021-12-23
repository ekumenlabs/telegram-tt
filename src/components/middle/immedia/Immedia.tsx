import SockJS from 'sockjs-client';
import React, {
  FC,
  useEffect,
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
} from './constants';

import { formatRoom } from './helpers';

import './Immedia.scss';

// Let prehook commit with console.logs
/* eslint-disable no-console */
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
  // State that tracks when update is being run. Triggers another update after UPDATE_RATE seconds.
  const [lastSnapshot, setLastSnapshot] = useState<string | undefined>(
    undefined,
  );
  const [messageId, setMessageId] = useState(0);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [nickname, setNickname] = useState('');
  const [awareness, setAwareness] = useState(false);
  const [participants, setParticipants] = useState<ParticipantsType[]>([]);

  const wsRef = useRef<WebSocket | undefined>(undefined);
  // eslint-disable-next-line  no-null/no-null
  const canvasMeRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line  no-null/no-null
  const videoMeRef = useRef<HTMLVideoElement | null>(null);

  const isParticipantPresent = (id: string) => participants.some((p) => p.id === id);

  const cleanUp = () => {
    console.log(INIT, 'Cleaning up!');
    setParticipants([]);
    setAwareness(false);
    setLastSnapshot(undefined);
    setUserId(undefined);
    // TODO: Check how to clean up tracks when user changes chats
    // FIX: Sometimes it works (i.e., disable webcam light), sometimes it doesn't.
    if (videoMeRef.current) {
      if (videoMeRef.current.srcObject) {
        const tracks = (videoMeRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    }
    // TODO: We need to also clean up set intervals.
  };

  const joinedParticipant = (participant: ParticipantsType) => {
    console.log(INIT, 'USER JOINED!');
    setParticipants([...participants, participant]);
    console.log(
      INIT,
      'THERE ARE ',
      1 + participants.length,
      'PARTICIPANTS IN THE ROOM',
    );
  };

  const updatedParticipant = (participant: ParticipantsType) => {
    console.log(INIT, 'USER UPDATED!');
    setParticipants(
      participants.map((p) => (p.id === participant.id ? participant : p)),
    );
  };

  const leftParticipant = (participant: ParticipantsType) => {
    console.log(INIT, 'USER LEFT with ID: ', participant);
    setParticipants(participants.filter((p) => p.id !== participant.id));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleMessage = (data: any) => {
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
      default:
        console.log(INIT, 'UNKNOWN MESSAGE TYPE!');
    }
  };

  useEffect(() => {
    // If the user changed chats, we need to clean up the old chat.
    cleanUp();
  }, [chatId]);

  const createConnection = () => {
    wsRef.current = new SockJS(WEBSOCKET_URL);
    wsRef.current.onopen = () => console.log(INIT, 'ws opened');
    wsRef.current.onclose = () => {
      console.log(INIT, 'ws closed');
      // reconnect
      setTimeout(createConnection, 1000);
    };
    wsRef.current.onerror = (event) => {
      console.log(INIT, 'ws error');
      console.log(INIT, event);
      // clean up
      wsRef.current = undefined;
      cleanUp();
    };
  };

  useEffect(() => {
    createConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (event) => {
        const response = JSON.parse(event.data);
        const { data } = response;
        console.log(INIT, 'RECEIVED MESSAGE!');
        console.log(INIT, response);
        if (data.id && data.success === true) {
          console.log(INIT, 'SET USER ID: ', data.id);
          setUserId(data.id);
        }
        handleMessage(response);
      };
    }
  }, [handleMessage]);

  useEffect(() => {
    console.log(INIT, 'Setting nickname');
    // Add whitespace until data is loaded
    setNickname(currentUser?.username || '\u00a0\u00a0');
  }, [currentUser]);

  // TODO: Correct true value of messageId. Using callbacks overwrites the value.
  const enableAwareness = () => {
    if (wsRef.current) {
      const currentMessageId = messageId + 1;
      setMessageId(currentMessageId);
      const message = {
        msgId: currentMessageId,
        type: 'sub',
        room: formatRoom(chatId),
        data: { password: false },
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(INIT, 'Enabled Awareness');
      setAwareness(true);
    }
  };

  const disableAwareness = () => {
    if (wsRef.current) {
      const currentMessageId = messageId + 1;
      setMessageId(currentMessageId);
      const message = {
        msgId: currentMessageId,
        id: userId,
        room: formatRoom(chatId),
        type: 'uns',
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(INIT, 'Disabled Awareness');
      cleanUp();
    }
  };

  useEffect(() => {
    const getParticipantsSnapshots = () => {
      // update each participant's snapshot
      participants.forEach((participant) => {
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

  useEffect(() => {
    const getSnapshotVideo = () => {
      if (awareness) {
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
                const image = canvas.toDataURL('image/png');
                setLastSnapshot(image);
              }, SNAPSHOT_RATE / 5);
            }
          };

          if (navigator.mediaDevices.getUserMedia) {
            // TODO: Rewrite using async/await
            navigator.mediaDevices
              .getUserMedia({ video: true, audio: false })
              .then((stream) => cbk(stream))
              .catch((err) => console.error(err));
          } else {
            console.error(new Error(`${INIT}There is no user media`));
          }
        }
      }
    };

    let result: NodeJS.Timeout;
    if (awareness) {
      // get webcam snapshots every SNAPSHOT_RATE seconds
      result = setInterval(getSnapshotVideo, SNAPSHOT_RATE);
    }
    return () => clearInterval(result);
  }, [awareness]);

  // GC that runs every GC_RATE seconds and checks if, for each participant,
  // their last snapshot was taken inside a REMOVE_THRESHOLD seconds time frame.
  // If not, it will remove the participant.
  useEffect(() => {
    const updateParticipants = () => {
      console.log(INIT, 'Garbage collect participants');
      participants.forEach((participant) => {
        const removeThreshold = new Date().getTime() - REMOVE_THRESHOLD;
        if (participant.timestamp && participant.timestamp < removeThreshold) {
          console.log(INIT, 'Garbage collect participant', participant.id);
          setParticipants(participants.filter((p) => p.id !== participant.id));
        }
      });
      if (participants.length === 0) {
        console.log(INIT, 'There is 1 participant left');
      } else {
        console.log(
          INIT,
          'There are',
          1 + participants.length,
          'participants left.',
        );
      }
    };

    if (participants.length) {
      let participantsInterval: NodeJS.Timeout;
      if (awareness) {
        participantsInterval = setInterval(updateParticipants, GC_RATE);
      }
      return () => clearInterval(participantsInterval);
    }
    return undefined;
  }, [awareness, participants]);

  // FIX: Make the function use the latest value of state.
  // I think the issue arises when the callback is sent the value used is the one when timeout was called.
  // async states?
  useEffect(() => {
    const sendUpdate = () => {
      if (wsRef.current) {
        const currentMessageId = messageId + 1;
        setMessageId(currentMessageId);
        const message = {
          msgId: currentMessageId,
          id: userId,
          type: 'app',
          room: formatRoom(chatId),
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
        console.log(INIT, 'Updating with message: ', message);
        wsRef.current.send(JSON.stringify(message));
      }
    };
    if (lastSnapshot !== undefined && userId !== undefined) {
      let updateInterval: NodeJS.Timeout;
      if (awareness) {
        updateInterval = setInterval(sendUpdate, UPDATE_RATE);
      }
      return () => clearInterval(updateInterval);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awareness, userId, messageId, nickname, chatId]);

  // TODO: Define the Heartbeat function to keep track user connection.
  // Keep Track of connection status
  useEffect(() => {
    const ping = () => {
      const type = 'ping';
      if (wsRef.current) {
        const currentMessageId = messageId + 1;
        setMessageId(currentMessageId);
        const message = {
          msgId: currentMessageId,
          type,
          room: formatRoom(chatId),
          data: undefined,
        };
        console.log(INIT, `${type.toUpperCase()}: `, message);
        wsRef.current.send(JSON.stringify(message));
      }
    };

    if (chatId !== undefined && userId !== undefined) {
      let pingInterval: NodeJS.Timeout;
      if (awareness) {
        console.log(INIT, 'RUNNING PING INTERVAL EVERY ', PING_RATE);
        pingInterval = setInterval(ping, PING_RATE);
      }
      return () => clearInterval(pingInterval);
    }
    return undefined;
  }, [awareness, userId, messageId, chatId]);

  return (
    <div className="MainImmedia">
      {/* Participants Header */}
      <div
        className={`ImmediaHeader custom-scroll ${
          awareness || 'ImmediaBackground'
        }`}
      >
        {awareness && (
          <div className="Participants">
            <div key={userId} className="VideoName VideoNameMe">
              <video
                ref={videoMeRef}
                autoPlay
                className="videoStream"
                width="640"
                height="480"
              >
                <track kind="captions" />
              </video>
              <canvas
                ref={canvasMeRef}
                className="CanvasVideo"
                width="70"
                height="50"
              />
              <text className="Nickname">{nickname}</text>
            </div>
            {participants
              && participants.map(
                ({ id, image, nickname: participantNickname }) => {
                  return image === undefined ? (
                    <div key={id} className="VideoName" />
                  ) : (
                    <div key={id} className="VideoName VideoNameParticipants">
                      <canvas
                        className="CanvasVideo"
                        id={`canvas-${id}`}
                        width="70"
                        height="50"
                      />
                      <text className="Nickname">{participantNickname}</text>
                    </div>
                  );
                },
              )}
          </div>
        )}
      </div>
      {/* Action Buttons */}
      <Button
        className="Awareness"
        color="primary"
        onClick={awareness ? disableAwareness : enableAwareness}
      >
        {awareness ? 'Disable Awareness' : 'Enable Awareness'}
      </Button>
    </div>
  );
};
/* eslint-enable no-console */
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
