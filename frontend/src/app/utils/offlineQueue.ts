// LocalStorage queue manager for low-connectivity offline emergency intakes

export interface OfflineEmergencyPayload {
  id: string;
  ambulance_id: string;
  assigned_hospital_id: string;
  patient_identifier: string;
  trauma_level: number;
  patient_vitals: any;
  status: string;
  timestamp: string;
}

const STORAGE_KEY = 'ierbms_offline_emergency_queue';

export const offlineQueue = {
  getQueue(): OfflineEmergencyPayload[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueue(payload: Omit<OfflineEmergencyPayload, 'id' | 'timestamp'>): OfflineEmergencyPayload {
    const item: OfflineEmergencyPayload = {
      ...payload,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    const current = this.getQueue();
    current.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return item;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  async syncPendingItems(): Promise<number> {
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    const remaining: OfflineEmergencyPayload[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('/api/ambulances/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ambulance_id: item.ambulance_id,
            assigned_hospital_id: item.assigned_hospital_id,
            patient_identifier: item.patient_identifier,
            trauma_level: item.trauma_level,
            patient_vitals: item.patient_vitals,
            status: item.status,
          }),
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } else {
      this.clear();
    }

    return syncedCount;
  }
};
