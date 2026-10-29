/**
 * Telemetrický klient pro odesílání síťových volání, URI endpointů a toku dat
 * do monitorovací aplikace na notebooku (http://localhost:3333).
 *
 * Volání je neblokující a pokud monitorovací dashboard neběží, tiše chybu ignoruje.
 */

const TELEMETRY_SERVER_URL = 'http://localhost:3333/api/telemetry';

export type TelemetryEvent = {
  type: 'network_call' | 'pipeline_stage' | 'session_update' | 'data_synced';
  stage?: string;
  progress?: number;
  uri?: string;
  method?: string;
  title?: string;
  detail?: string;
  response?: any;
  data?: any;
  subjects?: any[];
  tasks?: any[];
  exams?: any[];
  timestamp?: string;
};

export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    event.timestamp = new Date().toISOString();
    fetch(TELEMETRY_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Ignorovat, pokud monitorovací server na notebooku zrovna neběží
    });
  } catch {
    // Tichý odchyt chyb pro zamezení vlivu na mobilní aplikaci
  }
}

export const telemetry = {
  stage: (stage: string, progress: number, uri?: string) => {
    sendTelemetry({
      type: 'pipeline_stage',
      stage,
      progress,
      uri,
    });
  },

  call: (opts: {
    uri: string;
    method: string;
    title: string;
    detail?: string;
    response?: any;
    stage?: string;
  }) => {
    sendTelemetry({
      type: 'network_call',
      ...opts,
    });
  },

  session: (data: { name: string; uuIdentity: string; tokenPreview?: string }) => {
    sendTelemetry({
      type: 'session_update',
      data,
    });
  },

  dataSynced: (payload: { subjects: any[]; tasks: any[]; exams: any[] }) => {
    sendTelemetry({
      type: 'data_synced',
      ...payload,
    });
  },
};
