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
  | 'Salesforce'
  | 'WGUApp';

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
}

export interface Scenario {
  id: number;
  title: string;
  subtitle: string;
  journey: string;
  events: TimelineEvent[];
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
