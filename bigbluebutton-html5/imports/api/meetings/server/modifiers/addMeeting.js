import flat from 'flat';
import {
  check,
  Match,
} from 'meteor/check';
import Meetings, { RecordMeetings } from '/imports/api/meetings';
import Logger from '/imports/startup/server/logger';
import createNote from '/imports/api/note/server/methods/createNote';
import createCaptions from '/imports/api/captions/server/methods/createCaptions';
import { addAnnotationsStreamer } from '/imports/api/annotations/server/streamer';
import { addCursorStreamer } from '/imports/api/cursor/server/streamer';

export default function addMeeting(meeting) {
  const meetingId = meeting.meetingProp.intId;

  check(meetingId, String);
  check(meeting, {
    breakoutProps: {
      sequence: Number,
      freeJoin: Boolean,
      breakoutRooms: Array,
      parentId: String,
      enabled: Boolean,
      record: Boolean,
      privateChatEnabled: Boolean,
    },
    meetingProp: {
      intId: String,
      extId: String,
      isBreakout: Boolean,
      name: String,
    },
    usersProp: {
      webcamsOnlyForModerator: Boolean,
      guestPolicy: String,
      maxUsers: Number,
      allowModsToUnmuteUsers: Boolean,
    },
    durationProps: {
      createdTime: Number,
      duration: Number,
      createdDate: String,
      maxInactivityTimeoutMinutes: Number,
      warnMinutesBeforeMax: Number,
      meetingExpireIfNoUserJoinedInMinutes: Number,
      meetingExpireWhenLastUserLeftInMinutes: Number,
      userInactivityInspectTimerInMinutes: Number,
      userInactivityThresholdInMinutes: Number,
      userActivitySignResponseDelayInMinutes: Number,
      timeRemaining: Number,
    },
    welcomeProp: {
      welcomeMsg: String,
      modOnlyMessage: String,
      welcomeMsgTemplate: String,
    },
    recordProp: Match.ObjectIncluding({
      allowStartStopRecording: Boolean,
      autoStartRecording: Boolean,
      record: Boolean,
    }),
    password: {
      viewerPass: String,
      moderatorPass: String,
    },
    voiceProp: {
      voiceConf: String,
      dialNumber: String,
      telVoice: String,
      muteOnStart: Boolean,
    },
    screenshareProps: {
      red5ScreenshareIp: String,
      red5ScreenshareApp: String,
      screenshareConf: String,
    },
    metadataProp: Object,
    lockSettingsProps: {
      disableCam: Boolean,
      disableMic: Boolean,
      disablePrivateChat: Boolean,
      disablePublicChat: Boolean,
      disableNote: Boolean,
      hideUserList: Boolean,
      lockOnJoin: Boolean,
      lockOnJoinConfigurable: Boolean,
      lockedLayout: Boolean,
    },
  });

  const {
    recordProp,
    ...restProps
  } = meeting;

  const newMeeting = restProps;

  const selector = {
    meetingId,
  };

  newMeeting.lockSettingsProps = Object.assign(meeting.lockSettingsProps, { setBy: 'temp' });

  const meetingEnded = false;

  newMeeting.welcomeProp.welcomeMsg = newMeeting.welcomeProp.welcomeMsg.replace(
    'href="event:',
    'href="',
  );

  const insertBlankTarget = (s, i) => `${s.substr(0, i)} target="_blank"${s.substr(i)}`;
  const linkWithoutTarget = new RegExp('<a href="(.*?)">', 'g');
  linkWithoutTarget.test(newMeeting.welcomeProp.welcomeMsg);

  if (linkWithoutTarget.lastIndex > 0) {
    newMeeting.welcomeProp.welcomeMsg = insertBlankTarget(
      newMeeting.welcomeProp.welcomeMsg,
      linkWithoutTarget.lastIndex - 1,
    );
  }

  const modifier = {
    $set: Object.assign({
      meetingId,
      meetingEnded,
      publishedPoll: false,
    }, flat(newMeeting, {
      safe: true,
    })),
  };

  const cb = (err, numChanged) => {
    if (err) {
      Logger.error(`Adding meeting to collection: ${err}`);
      return;
    }

    const {
      insertedId,
    } = numChanged;

    if (insertedId) {
      Logger.info(`Added meeting id=${meetingId}`);
      // TODO: Here we call Etherpad API to create this meeting notes. Is there a
      // better place we can run this post-creation routine?
      createNote(meetingId);
      createCaptions(meetingId);
    }

    if (numChanged) {
      Logger.info(`Upserted meeting id=${meetingId}`);
    }
  };

  const cbRecord = (err, numChanged) => {
    if (err) {
      Logger.error(`Adding record prop to collection: ${err}`);
      return;
    }

    const {
      insertedId,
    } = numChanged;

    if (insertedId) {
      Logger.info(`Added record prop id=${meetingId}`);
    }

    if (numChanged) {
      Logger.info(`Upserted record prop id=${meetingId}`);
    }
  };

  RecordMeetings.upsert(selector, {
    meetingId,
    ...recordProp,
  }, cbRecord);

  addAnnotationsStreamer(meetingId);
  addCursorStreamer(meetingId);

  return Meetings.upsert(selector, modifier, cb);
}
