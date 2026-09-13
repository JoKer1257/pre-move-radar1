import type { Bias, RadarState } from "./types";

export const STATE_LABEL: Record<RadarState, string> = {
  IDLE: "IDLE",
  WATCH: "WATCH",
  ARMED: "ARMED",
  TRIGGERED: "TRIGGERED",
  TOO_LATE: "TOO_LATE",
};

export function stateTone(state: RadarState): "idle" | "watch" | "armed" | "triggered" | "late" {
  if (state === "WATCH") return "watch";
  if (state === "ARMED") return "armed";
  if (state === "TRIGGERED") return "triggered";
  if (state === "TOO_LATE") return "late";
  return "idle";
}

export function biasTone(bias: Bias): "long" | "short" | "mute" {
  if (bias === "LONG") return "long";
  if (bias === "SHORT") return "short";
  return "mute";
}

export const STATE_HINT: Record<RadarState, string> = {
  IDLE: "无结构 / 方向未定",
  WATCH: "可观察，只盯不下手",
  ARMED: "可准备：结构已转，等确认，不要提前下手",
  TRIGGERED: "第一段已启动，这一段不追",
  TOO_LATE: "已迟到，放弃这一波，冷却中",
};
