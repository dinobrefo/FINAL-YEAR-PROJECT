/**
 * Ghana Health Service (GHS) adapted South African Triage Scale (SATS)
 * Triage Early Warning Score (TEWS) Clinical Calculation Engine
 * Reference: South African Triage Group (SATG) & Ghana Emergency Medicine Clinical Guidelines
 */

export type MobilityStatus = 'walking' | 'with_help' | 'stretcher';
export type AvpuStatus = 'A' | 'V' | 'P' | 'U'; // Alert, Voice, Pain, Unresponsive

export interface TewsVitalsInput {
  heartRate?: number | string;
  systolicBp?: number | string;
  respiratoryRate?: number | string;
  temperature?: number | string;
  oxygenSaturation?: number | string;
  mobility?: MobilityStatus;
  avpu?: AvpuStatus;
  hasTrauma?: boolean;
}

export type TriageColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';

export interface TewsResult {
  tewsScore: number;
  triageColor: TriageColor;
  triageName: string;
  traumaLevel: 1 | 2 | 3 | 4 | 5;
  targetResponseTime: string;
  clinicalAction: string;
  breakdown: {
    mobilityScore: number;
    heartRateScore: number;
    bpScore: number;
    respScore: number;
    tempScore: number;
    avpuScore: number;
    traumaModifier: number;
  };
}

export function calculateTEWS(input: TewsVitalsInput): TewsResult {
  const hr = Number(input.heartRate) || 80;
  const sbp = Number(input.systolicBp) || 120;
  const rr = Number(input.respiratoryRate) || 16;
  const temp = Number(input.temperature) || 37.0;
  const spo2 = Number(input.oxygenSaturation) || 98;
  const mobility = input.mobility || 'walking';
  const avpu = input.avpu || 'A';
  const hasTrauma = Boolean(input.hasTrauma);

  // 1. Mobility Score
  let mobilityScore = 0;
  if (mobility === 'with_help') mobilityScore = 1;
  else if (mobility === 'stretcher') mobilityScore = 2;

  // 2. Heart Rate Score
  let heartRateScore = 0;
  if (hr < 41) heartRateScore = 2;
  else if (hr >= 41 && hr <= 50) heartRateScore = 1;
  else if (hr >= 51 && hr <= 100) heartRateScore = 0;
  else if (hr >= 101 && hr <= 110) heartRateScore = 1;
  else if (hr >= 111 && hr <= 129) heartRateScore = 2;
  else if (hr >= 130) heartRateScore = 3;

  // 3. Systolic Blood Pressure Score
  let bpScore = 0;
  if (sbp < 71) bpScore = 3;
  else if (sbp >= 71 && sbp <= 80) bpScore = 2;
  else if (sbp >= 81 && sbp <= 100) bpScore = 1;
  else if (sbp >= 101 && sbp <= 199) bpScore = 0;
  else if (sbp >= 200) bpScore = 2;

  // 4. Respiratory Rate Score
  let respScore = 0;
  if (rr < 9) respScore = 2;
  else if (rr >= 9 && rr <= 14) respScore = 0;
  else if (rr >= 15 && rr <= 20) respScore = 1;
  else if (rr >= 21 && rr <= 29) respScore = 2;
  else if (rr >= 30) respScore = 3;

  // 5. Temperature Score
  let tempScore = 0;
  if (temp < 35.0) tempScore = 2;
  else if (temp >= 35.0 && temp <= 38.4) tempScore = 0;
  else if (temp >= 38.5) tempScore = 2;

  // 6. AVPU Consciousness Score
  let avpuScore = 0;
  if (avpu === 'A') avpuScore = 0;
  else if (avpu === 'V') avpuScore = 1;
  else if (avpu === 'P') avpuScore = 2;
  else if (avpu === 'U') avpuScore = 3;

  // 7. Trauma Modifier
  const traumaModifier = hasTrauma ? 1 : 0;

  const totalScore = mobilityScore + heartRateScore + bpScore + respScore + tempScore + avpuScore + traumaModifier;

  // Critical clinical overrides (SATS Discriminators)
  const isHypoxicResus = spo2 > 0 && spo2 < 85;
  const isUnresponsiveResus = avpu === 'U';

  let triageColor: TriageColor = 'green';
  let triageName = 'Non-Urgent (Green)';
  let traumaLevel: 1 | 2 | 3 | 4 | 5 = 1;
  let targetResponseTime = '< 4 hours';
  let clinicalAction = 'Standard outpatient ward evaluation or observational care.';

  if (totalScore >= 7 || isHypoxicResus || isUnresponsiveResus) {
    triageColor = 'red';
    triageName = 'Resuscitation (Red)';
    traumaLevel = 5;
    targetResponseTime = 'Immediate / 0 minutes';
    clinicalAction = 'Direct handover to Resuscitation Bay / Red Room. Activate Trauma / ICU team.';
  } else if (totalScore >= 5) {
    triageColor = 'orange';
    triageName = 'Very Urgent (Orange)';
    traumaLevel = 4;
    targetResponseTime = '< 10 minutes';
    clinicalAction = 'Transfer to High Dependency Unit (HDU) or acute emergency bay. Prepare ventilator.';
  } else if (totalScore >= 3) {
    triageColor = 'yellow';
    triageName = 'Urgent (Yellow)';
    traumaLevel = 3;
    targetResponseTime = '< 60 minutes';
    clinicalAction = 'Admit to general observation bay. Monitor vitals every 30 minutes.';
  } else {
    triageColor = 'green';
    triageName = 'Non-Urgent (Green)';
    traumaLevel = totalScore >= 1 ? 2 : 1;
    targetResponseTime = '< 240 minutes';
    clinicalAction = 'Stable general acute bed or ambulatory care.';
  }

  return {
    tewsScore: totalScore,
    triageColor,
    triageName,
    traumaLevel,
    targetResponseTime,
    clinicalAction,
    breakdown: {
      mobilityScore,
      heartRateScore,
      bpScore,
      respScore,
      tempScore,
      avpuScore,
      traumaModifier
    }
  };
}
