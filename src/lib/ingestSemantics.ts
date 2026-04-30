import { TimelineEvent, DatasetId } from '../data/types';

/** How identity on the stored row behaves — Tealium CDP issue is send-time snapshot with no retroactive rewrite. */
export function ingestSemanticsForEvent(evt: TimelineEvent): {
  short: string;
  detail: string;
  variant: 'tealium' | 'realtime' | 'batch' | 'profile';
} {
  const ds = evt.dataset as DatasetId;

  if (ds === 'Tealium') {
    return {
      short: 'Send-time snapshot',
      detail:
        'Tealium→AEP: identity on the row is whatever AudienceStream attached when this event was forwarded. If the profile gains email or cross-device links later, those discoveries do not retroactively update earlier AEP rows (replay / joins / GBS handle recovery separately).',
      variant: 'tealium',
    };
  }

  if (ds === 'Databricks' || ds === 'ImportEvent') {
    return {
      short: 'Batch / file ingest',
      detail: 'Row identity is whatever the batch payload contained at load time; same “no silent rewrite” idea unless you reprocess.',
      variant: 'batch',
    };
  }

  if (ds === 'Salesforce' || ds === 'MarketoLeadIdentities') {
    return {
      short: 'Profile-class payload',
      detail: 'Profile datasets follow CJA profile rules; not the same as Tealium stream timing but still “values at ingest”.',
      variant: 'profile',
    };
  }

  return {
    short: 'Payload @ ingest',
    detail:
      'Streaming hit uses identifiers present when AEP received the event. FBS replay can re-key within the replay window; the underlying row semantics are still time-of-ingest unless replay applies.',
    variant: 'realtime',
  };
}
