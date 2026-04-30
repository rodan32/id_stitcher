export type NamespaceId =
  | 'ECID'
  | 'Email'
  | 'Phone'
  | 'TealiumVisitorID'
  | 'MunchkinID'
  | 'MarketoLeadID'
  | 'SFDCContactID'
  | 'WGU_ID';

export type DatasetId =
  | 'WebSDK'
  | 'Tealium'
  | 'Marketo'
  | 'MarketoLeadIdentities'
  | 'Salesforce'
  | 'WGUApp'
  | 'Genesys'
  | 'Databricks'
  | 'ImportEvent';

export interface Namespace {
  id: NamespaceId;
  label: string;
  level: 'device' | 'person';
  color: string;
  defaultUnique: boolean;
}

export interface Dataset {
  id: DatasetId;
  label: string;
  color: string;
  alwaysPresent: NamespaceId[];
  sometimesPresent: NamespaceId[];
  nature: 'event' | 'profile' | 'both';
}

export interface TimelineEvent {
  step: number;
  device: string;
  dataset: DatasetId;
  identifiers: Partial<Record<NamespaceId, string>>;
  description?: string;
  /** Days from scenario start. Used for replay window enforcement.
   *  When undefined, the engine treats all events as within the window. */
  dayOffset?: number;
}

export interface Scenario {
  id: number;
  title: string;
  subtitle: string;
  journey: string;
  events: TimelineEvent[];
  /** How many distinct real-world people are in this scenario */
  realPeopleCount: number;
  verdictColor: 'green' | 'orange' | 'red';
  verdictText: string;
}

export type StitchMethod = 'none' | 'fbs' | 'gbs';

export interface StitchConfig {
  method: StitchMethod;
  personId: NamespaceId;
  persistentId: NamespaceId;
  transientId: NamespaceId;   // FBS: transient field; GBS: target namespace
  uniqueNamespaces: NamespaceId[];
  ioaEnabled: boolean;
  replayWindow: 1 | 7 | 14 | 30;
  profileEnabledDatasets: DatasetId[];
  tealiumCrossDevice: boolean;
  /** When true, Tealium rows only carry person-level IDs after they first appear on that visitor in journey order (send-time); disables cross-device enrichment. */
  tealiumIngestTimeSemantics: boolean;
}

export interface StitchResult {
  eventIndex: number;
  resolvedPersonId: string | null;
  stitchType: 'live' | 'replay' | 'graph' | 'none';
  isOrphaned: boolean;
  explanation: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  sourceNs: NamespaceId;
  targetNs: NamespaceId;
  fromEvent: number;
  active: boolean;
}

export interface GraphNode {
  id: string;
  namespace: NamespaceId;
  value: string;
  level: 'device' | 'person';
}
