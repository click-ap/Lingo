import { getMultiUserStatus } from '/imports/api/common/server/helpers';
import RedisPubSub from '/imports/startup/server/redis';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Annotations from '/imports/api/annotations';

import isPodPresenter from '/imports/api/presentation-pods/server/utils/isPodPresenter';

function isLastMessage(meetingId, annotation, userId) {
  const DRAW_END = Meteor.settings.public.whiteboard.annotations.status.end;

  if (annotation.status === DRAW_END) {
    const selector = {
      meetingId,
      id: annotation.id,
      userId,
    };

    const _annotation = Annotations.findOne(selector);
    return _annotation !== null;
  }

  return false;
}

export default function sendAnnotation(credentials, annotation) {
  const REDIS_CONFIG = Meteor.settings.private.redis;
  const CHANNEL = REDIS_CONFIG.channels.toAkkaApps;
  const EVENT_NAME = 'SendWhiteboardAnnotationPubMsg';

  const { meetingId, requesterUserId, requesterToken } = credentials;
  const whiteboardId = annotation.wbId;

  check(meetingId, String);
  check(requesterUserId, String);
  check(requesterToken, String);
  check(annotation, Object);
  check(whiteboardId, String);

  // We allow messages to pass through in 3 cases:
  // 1. When it's a standard message in presenter mode (Acl check)
  // 2. When it's a standard message in multi-user mode (getMultUserStatus check)
  // 3. When it's the last message, happens when the user is currently drawing
  // and then slide/presentation changes, the user lost presenter rights,
  // or multi-user whiteboard gets turned off
  // So we allow the last "DRAW_END" message to pass through, to finish the shape.
  const allowed = isPodPresenter(meetingId, whiteboardId, requesterUserId)
    || getMultiUserStatus(meetingId, whiteboardId)
    || isLastMessage(meetingId, annotation, requesterUserId);

  if (!allowed) {
    throw new Meteor.Error('not-allowed', `User ${requesterUserId} is not allowed to send an annotation`);
  }

  if (annotation.annotationType === 'text') {
    check(annotation, {
      id: String,
      status: String,
      annotationType: String,
      annotationInfo: {
        x: Number,
        y: Number,
        fontColor: Number,
        calcedFontSize: Number,
        textBoxWidth: Number,
        text: String,
        textBoxHeight: Number,
        id: String,
        whiteboardId: String,
        status: String,
        fontSize: Number,
        dataPoints: String,
        type: String,
      },
      wbId: String,
      userId: String,
      position: Number,
    });
  } else {
    check(annotation, {
      id: String,
      status: String,
      annotationType: String,
      annotationInfo: {
        color: Number,
        thickness: Number,
        points: Array,
        id: String,
        whiteboardId: String,
        status: String,
        type: String,
        dimensions: Match.Maybe([Number]),
      },
      wbId: String,
      userId: String,
      position: Number,
    });
  }

  const payload = {
    annotation,
  };

  return RedisPubSub.publishUserMessage(CHANNEL, EVENT_NAME, meetingId, requesterUserId, payload);
}
