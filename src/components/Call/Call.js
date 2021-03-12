import React, {
  useEffect,
  useContext,
  // useReducer,
  useState,
  useCallback,
  useMemo,
} from 'react';
import './Call.css';
import Tile from '../Tile/Tile';
import CallObjectContext from '../../CallObjectContext';
import CallMessage from '../CallMessage/CallMessage';
// import {
//   initialCallState,
//   CLICK_ALLOW_TIMEOUT,
//   PARTICIPANTS_CHANGE,
//   CAM_OR_MIC_ERROR,
//   FATAL_ERROR,
//   callReducer,
//   isLocal,
//   isScreenShare,
//   containsScreenShare,
//   shouldIncludeScreenCallItem,
//   getMessage,
// } from './callState';
import { logDailyEvent } from '../../logUtils';

export default function Call() {
  const callObject = useContext(CallObjectContext);
  // const [callState, dispatch] = useReducer(callReducer, initialCallState);
  // const [isScreenSharing, setScreenSharing] = useState(false);
  // const [screenShareTrackId, setScreenShareTrackId] = useState('');
  // const [screenShareStarted, setScreenShareStarted] = useState(false);
  // const [screenShareEvent, setScreenShareEvent] = useState({});
  // const [tiles, setTiles] = useState([]);
  const [participantUpdated, setParticipantUpdated] = useState(null);
  const [participants, setParticipants] = useState([]);

  const handleTrackStarted = useCallback(
    (e) => {
      console.log(`TRACK STARTED`);
      setParticipantUpdated(
        `track-started-${e?.participant?.user_id}-${Date.now()}`
      );
    },
    [setParticipantUpdated]
  );

  const handleTrackStopped = (e) => {
    setParticipantUpdated(
      `track-stopped-${e?.participant?.user_id}-${Date.now()}`
    );
  };

  const handleParticipantUpdate = (e) => {
    console.log(`IN HANDLE UPDATE`);
    console.log(callObject?.participants());
    setParticipantUpdated(
      `participant-updated-${e?.participant?.user_id}-${Date.now()}`
    );
  };

  const getMessage = (e) => {
    let header = null;
    let detail = null;
    let isError = false;

    if (!e) {
      if (participants.length <= 1) {
        header = "Copy and share this page's URL to invite others";
        detail = window.location.href;
      }
    } else if (e.action === 'error') {
      header = `Fatal error ${(e && e.errorMsg) || 'Unknown'}`;
    } else if (e.action === 'camera-error') {
      header = `Camera or mic access error: ${
        (e && e.errorMsg && e.errorMsg.errorMsg) || 'Unknown'
      }`;
      detail =
        'See https://help.daily.co/en/articles/2528184-unblock-camera-mic-access-on-a-computer to troubleshoot.';
      isError = true;
    }
    return header || detail ? { header, detail, isError } : null;
  };

  const handleErrorEvent = (e) => {
    logDailyEvent(e);
    getMessage(e);
  };

  /**
   * When the call object is set, listen and respond to events
   */
  useEffect(() => {
    if (!callObject) return;
    callObject.on('track-started', handleTrackStarted);
    callObject.on('track-stopped', handleTrackStopped);
    callObject.on('participant-updated', handleParticipantUpdate);
    callObject.on('error', handleErrorEvent);
    callObject.on('camera-error', handleErrorEvent);

    return () => {
      callObject.off('track-started', handleTrackStarted);
      callObject.off('track-stopped', handleTrackStopped);
      callObject.off('participant-updated', handleParticipantUpdate);
      callObject.off('error', handleErrorEvent);
      callObject.off('camera-error', handleErrorEvent);
    };
  }, [
    callObject,
    participants,
    handleTrackStarted,
    handleParticipantUpdate,
    handleTrackStopped,
    handleErrorEvent,
  ]);

  /**
   * Update participants for any event that happens to keep local participant list up to date.
   * We grab the whole participant list to make sure everyone's status is most up to date.
   */
  useEffect(() => {
    if (participantUpdated) {
      console.log('[🎨 UPDATING PARTICIPANT LIST]');
      console.log(callObject?.participants());
      const list = Object.values(callObject?.participants());
      setParticipants(list);
    }
  }, [participantUpdated, callObject]);

  useEffect(() => {
    console.log(`✨ Your participants just changed`);
    console.log(participants);
    console.log(callObject?.participants());
  }, [participants, callObject]);

  const isScreenShare = useMemo(() => {
    if (!callObject) return;
    console.log(
      `SCREENSHARE: ${participants?.some((p) => p?.tracks?.screenVideo?.track)}`
    );
    return participants?.some((p) => p?.tracks?.screenVideo?.track);
  }, [participants, callObject]);

  const displayLargeTiles = useMemo(() => {
    console.log('DISPLAY LARGE');
    const isLarge = true;
    // If someone in the participants list has a screenshare
    if (isScreenShare) {
      // Find the person who is screensharing
      const screenShare = participants?.find(
        (p) => p?.tracks?.screenVideo?.track
      );
      return (
        <div className="large-tiles">
          {
            <Tile
              key={`screenshare`}
              videoTrackState={screenShare?.tracks?.screenVideo}
              audioTrackState={screenShare?.tracks?.audio}
              isLocalPerson={screenShare?.local}
              isLarge={isLarge}
              disableCornerMessage={isScreenShare}
              onClick={
                screenShare.local
                  ? null
                  : () => {
                      sendHello(screenShare.id);
                    }
              }
            />
          }
        </div>
      );
    } else {
      const tiles = participants?.filter((p) => !p.local);
      return (
        <div className="large-tiles">
          {tiles?.map((t, i) => (
            <Tile
              key={`large-${i}`}
              videoTrackState={t?.tracks?.video}
              audioTrackState={t?.tracks?.audio}
              isLocalPerson={t?.local}
              isLarge={isLarge}
              disableCornerMessage={isScreenShare}
              onClick={
                t.local
                  ? null
                  : () => {
                      sendHello(t.id);
                    }
              }
            />
          ))}
        </div>
      );
    }
  }, [participants, isScreenShare]);

  const displaySmallTiles = useMemo(() => {
    const isLarge = false;
    // If someone is screensharing
    if (isScreenShare) {
      return (
        <div className="small-tiles">
          {participants?.map((p, i) => (
            <Tile
              key={`small-${i}`}
              videoTrackState={p.tracks.video}
              audioTrackState={p.tracks.audio}
              isLocalPerson={p.local}
              isLarge={isLarge}
              disableCornerMessage={false}
              onClick={
                p.local
                  ? null
                  : () => {
                      sendHello(p.id);
                    }
              }
            />
          ))}
        </div>
      );
    } else {
      const tiles = participants?.filter((p) => p.local);
      return (
        <div className="small-tiles">
          {tiles?.map((t, i) => (
            <Tile
              key={`small-${i}`}
              videoTrackState={t.tracks.video}
              audioTrackState={t.tracks.audio}
              isLocalPerson={t.local}
              isLarge={isLarge}
              disableCornerMessage={false}
              onClick={
                t.local
                  ? null
                  : () => {
                      sendHello(t.id);
                    }
              }
            />
          ))}
        </div>
      );
    }
  }, [participants, isScreenShare]);

  /**
   * Send an app message to the remote participant whose tile was clicked on.
   */
  const sendHello = useCallback(
    (participantId) => {
      callObject &&
        callObject.sendAppMessage({ hello: 'world' }, participantId);
    },
    [callObject]
  );

  const message = getMessage();
  return (
    <div className="call">
      {displayLargeTiles}
      {displaySmallTiles}
      {message && (
        <CallMessage
          header={message.header}
          detail={message.detail}
          isError={message.isError}
        />
      )}
    </div>
  );
}
