import Logger from '/imports/startup/server/logger';
import Meetings from '/imports/api/meetings';
import { check } from 'meteor/check';

export default function changeLockSettings(meetingId, payload) {
  check(meetingId, String);
  check(payload, {
    disableCam: Boolean,
    disableMic: Boolean,
    disablePrivChat: Boolean,
    disablePubChat: Boolean,
    disableNote: Boolean,
    hideUserList: Boolean,
    lockedLayout: Boolean,
    lockOnJoin: Boolean,
    lockOnJoinConfigurable: Boolean,
    setBy: Match.Maybe(String),
  });

  const {
    disableCam,
    disableMic,
    disablePrivChat,
    disablePubChat,
    disableNote,
    hideUserList,
    lockedLayout,
    lockOnJoin,
    lockOnJoinConfigurable,
    setBy,
  } = payload;

  const selector = {
    meetingId,
  };

  const modifier = {
    $set: {
      lockSettingsProps: {
        disableCam,
        disableMic,
        disablePrivateChat: disablePrivChat,
        disablePublicChat: disablePubChat,
        disableNote,
        hideUserList,
        lockedLayout,
        lockOnJoin,
        lockOnJoinConfigurable,
        setBy,
      },
    },
  };

  const cb = (err, numChanged) => {
    if (err) {
      return Logger.error(`Changing meeting={${meetingId}} lock settings: ${err}`);
    }

    if (!numChanged) {
      return Logger.info(`meeting={${meetingId}} lock settings were not updated`);
    }

    return Logger.info(`Changed meeting={${meetingId}} updated lock settings`);
  };

  return Meetings.upsert(selector, modifier, cb);
}
