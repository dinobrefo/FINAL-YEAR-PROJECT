export interface StoryStage {
  id: number;
  tag: string;
  title: string;
  body: string;
  stats?: { label: string; value: string }[];
  checklist?: string[];
}

export const STORY_STAGES: StoryStage[] = [
  {
    id: 1,
    tag: "Emergency Detected",
    title: "Incident Telemetry Initiated",
    body: "Incident location captured. The grid lights up and the nearest available ambulance is identified and staged in real time.",
  },
  {
    id: 2,
    tag: "Intelligent Analysis",
    title: "Algorithmic Facility Evaluation",
    body: "Candidate hospitals appear and are scored on clinical capability, real-time capacity and travel time.",
  },
  {
    id: 3,
    tag: "Best Match Found",
    title: "Clinical Safe-Guard Locked",
    body: "The safest viable destination is highlighted with a compatibility score. Other options fade back.",
  },
  {
    id: 4,
    tag: "Navigation",
    title: "Turn-by-Turn Road Guidance",
    body: "A traffic-aware route is confirmed with live distance, ETA and road conditions streamed to the paramedic cockpit.",
    stats: [
      { label: "Transit Distance", value: "8.4 km" },
      { label: "Driving ETA", value: "11 mins" },
      { label: "Traffic Congestion", value: "Low" },
    ],
  },
  {
    id: 5,
    tag: "Hospital Arrival",
    title: "Seamless Patient Handover",
    body: "Hospital notified, trauma team ready, bed reserved. The handover and timings are logged.",
    checklist: [
      "Critical ER Bay #04 Reserved",
      "Trauma Lead & Anesthetist Alerted",
      "Direct GHS Incident Audit Timestamped",
    ],
  },
];
