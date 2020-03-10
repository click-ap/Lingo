package org.bigbluebutton.core.apps.presentationpod

import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.bus.MessageBus
import org.bigbluebutton.core.domain.MeetingState2x
import org.bigbluebutton.core.running.LiveMeeting
import org.bigbluebutton.common2.domain.{ PageVO }
import org.bigbluebutton.core.models.PresentationInPod

trait PresentationConversionCompletedSysPubMsgHdlr {

  this: PresentationPodHdlrs =>

  def handle(
      msg: PresentationConversionCompletedSysPubMsg, state: MeetingState2x,
      liveMeeting: LiveMeeting, bus: MessageBus
  ): MeetingState2x = {

    val meetingId = liveMeeting.props.meetingProp.intId

    val pages = new collection.mutable.HashMap[String, PageVO]

    msg.body.presentation.pages.foreach { p =>
      val page = PageVO(p.id, p.num, p.thumbUri, p.swfUri, p.txtUri, p.svgUri, p.current, p.xOffset, p.yOffset,
        p.widthRatio, p.heightRatio)
      pages += page.id -> page
    }

    val downloadable = msg.body.presentation.downloadable
    val presentationId = msg.body.presentation.id
    val pres = new PresentationInPod(presentationId, msg.body.presentation.name, msg.body.presentation.current,
      pages.toMap, downloadable)
    val presVO = PresentationPodsApp.translatePresentationToPresentationVO(pres)
    val podId = msg.body.podId

    val newState = for {
      pod <- PresentationPodsApp.getPresentationPod(state, podId)
    } yield {
      PresentationSender.broadcastPresentationConversionCompletedEvtMsg(bus, meetingId,
        pod.id, msg.header.userId, msg.body.messageKey, msg.body.code, presVO)
      PresentationSender.broadcastSetPresentationDownloadableEvtMsg(bus, meetingId, pod.id,
        msg.header.userId, presentationId, downloadable, pres.name)

      var pods = state.presentationPodManager.addPod(pod)
      pods = pods.addPresentationToPod(pod.id, pres)
      pods = pods.setCurrentPresentation(pod.id, pres.id)

      state.update(pods)
    }

    newState match {
      case Some(ns) => ns
      case None     => state
    }

  }
}

