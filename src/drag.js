import {dispatch} from "d3-dispatch";
import {event, customEvent, select, mouse} from "d3-selection";
import nodrag, {yesdrag} from "./nodrag";
import noevent, {nopropagation} from "./noevent";
import constant from "./constant";
import DragEvent from "./event";

// Ignore right-click, since that should open the context menu.
function defaultFilter() {
  return !event.button;
}

function defaultContainer() {
  return this.parentNode;
}

function defaultSubject(d) {
  return d == null ? {x: event.x, y: event.y} : d;
}

export default function() {
  var filter = defaultFilter,
      container = defaultContainer,
      subject = defaultSubject,
      gestures = {},
      listeners = dispatch("start", "drag", "end"),
      active = 0,
      pointerdownx,
      pointerdowny,
      pointermoving,
      // touchending,
      clickDistance2 = 0;

  function drag(selection) {
    selection
        .on("pointerdown.drag", pointerdowned)
        .on("pointermove.drag", pointermoved)
        .on("pointerup.drag pointercancel.drag", pointerended)
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }

  function pointerdowned() {
    if (!filter.apply(this, arguments)) return;
    var gesture = beforestart(event.pointerId, container.apply(this, arguments), mouse, this, arguments);
    if (!gesture) return;
    if (event.pointerType!='touch'){
      select(event.view).on("pointermove.drag", pointermoved, true).on("pointerup.drag", pointerended, true);
    }
    nodrag(event.view);
    nopropagation();
    pointermoving = false;
    pointerdownx = event.clientX;
    pointerdowny = event.clientY;
    gesture("start");
  }

  function pointermoved() {
    if (!filter.apply(this, arguments)) return;
    noevent();
    if (!pointermoving) {
      var dx = event.clientX - pointerdownx, dy = event.clientY - pointerdowny;
      pointermoving = dx * dx + dy * dy > clickDistance2;
    }
    let gesture = gestures[event.pointerId];
    if (gesture){
      gesture("drag");
    }
  }

  function pointerended() {
    if (!filter.apply(this, arguments)) return;
    if (event.pointerType!='touch'){
      select(event.view).on("pointermove.drag pointerup.drag", null);
    }
    yesdrag(event.view, pointermoving);
    noevent();

    let gesture = gestures[event.pointerId];
    if (gesture){
      gesture("end");
    }
  }

  function beforestart(id, container, point, that, args) {
    var p = point(container, id), s, dx, dy,
        sublisteners = listeners.copy();

    if (!customEvent(new DragEvent(drag, "beforestart", s, id, active, p[0], p[1], 0, 0, sublisteners), function() {
      if ((event.subject = s = subject.apply(that, args)) == null) return false;
      dx = s.x - p[0] || 0;
      dy = s.y - p[1] || 0;
      return true;
    })) return;

    return function gesture(type) {
      var p0 = p, n;
      switch (type) {
        case "start": gestures[id] = gesture, n = active++; break;
        case "end": delete gestures[id], --active; // nobreak
        case "drag": p = point(container, id), n = active; break;
      }
      customEvent(new DragEvent(drag, type, s, id, n, p[0] + dx, p[1] + dy, p[0] - p0[0], p[1] - p0[1], sublisteners), sublisteners.apply, sublisteners, [type, that, args]);
    };
  }

  drag.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant(!!_), drag) : filter;
  };

  drag.container = function(_) {
    return arguments.length ? (container = typeof _ === "function" ? _ : constant(_), drag) : container;
  };

  drag.subject = function(_) {
    return arguments.length ? (subject = typeof _ === "function" ? _ : constant(_), drag) : subject;
  };

  drag.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? drag : value;
  };

  drag.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
  };

  return drag;
}
