import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import RedisPubSub from '/imports/startup/server/redis';

export default function toggleWebcamsOnlyForModerator(credentials, webcamsOnlyForModerator) {
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
  const EVENT_NAME = 'UpdateWebcamsOnlyForModeratorCmdMsg';

  const { meetingId, requesterUserId } = credentials;

  check(meetingId, String);
  check(requesterUserId, String);
  check(webcamsOnlyForModerator, Boolean);

  const payload = {
    webcamsOnlyForModerator,
    setBy: requesterUserId,
  };

  RedisPubSub.publishUserMessage(CHANNEL, EVENT_NAME, meetingId, requesterUserId, payload);
}
