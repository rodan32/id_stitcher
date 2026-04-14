import { Namespace, Dataset } from './types';

export const NAMESPACES: Namespace[] = [
  { id: 'ECID', label: 'ECID', level: 'device', color: '#3b82f6', defaultUnique: false },
  { id: 'Email', label: 'Email', level: 'person', color: '#10b981', defaultUnique: true },
  { id: 'Phone', label: 'Phone', level: 'person', color: '#f59e0b', defaultUnique: true },
  { id: 'TealiumVisitorID', label: 'Tealium Visitor ID', level: 'device', color: '#06b6d4', defaultUnique: false },
  { id: 'MunchkinID', label: 'Munchkin ID', level: 'device', color: '#e879f9', defaultUnique: false },
  { id: 'MarketoLeadID', label: 'Marketo Lead ID', level: 'person', color: '#ec4899', defaultUnique: true },
  { id: 'SFDCContactID', label: 'SFDC Contact ID', level: 'person', color: '#f97316', defaultUnique: true },
  { id: 'WGU_ID', label: 'WGU ID', level: 'person', color: '#8b5cf6', defaultUnique: true },
];

export const DATASETS: Dataset[] = [
  {
    id: 'WebSDK', label: 'Adobe Web SDK', color: '#3b82f6',
    alwaysPresent: ['ECID'],
    sometimesPresent: ['Email', 'Phone', 'TealiumVisitorID', 'WGU_ID'],
    nature: 'event',
  },
  {
    id: 'Tealium', label: 'Tealium EventStream', color: '#06b6d4',
    alwaysPresent: ['TealiumVisitorID'],
    sometimesPresent: ['ECID', 'Email', 'Phone', 'WGU_ID'],
    nature: 'event',
  },
  {
    id: 'Marketo', label: 'Marketo', color: '#ec4899',
    alwaysPresent: ['MarketoLeadID'],
    sometimesPresent: ['Email', 'MunchkinID', 'SFDCContactID', 'Phone'],
    nature: 'both',
  },
  {
    id: 'Salesforce', label: 'Salesforce CRM', color: '#f97316',
    alwaysPresent: ['SFDCContactID'],
    sometimesPresent: ['Email', 'Phone', 'WGU_ID'],
    nature: 'profile',
  },
  {
    id: 'WGUApp', label: 'WGU Application System', color: '#8b5cf6',
    alwaysPresent: ['WGU_ID'],
    sometimesPresent: ['Email', 'Phone', 'SFDCContactID'],
    nature: 'both',
  },
  {
    id: 'Genesys', label: 'Genesys Calls', color: '#14b8a6',
    alwaysPresent: ['Phone'],
    sometimesPresent: ['Email', 'SFDCContactID', 'WGU_ID'],
    nature: 'event',
  },
  {
    id: 'MarketoLeadIdentities', label: 'Marketo Lead Identities', color: '#f472b6',
    alwaysPresent: ['MarketoLeadID'],
    sometimesPresent: ['Email', 'MunchkinID'],
    nature: 'profile',
  },
  {
    id: 'Databricks', label: 'Databricks (Pre-Resolved)', color: '#a855f7',
    alwaysPresent: ['Email'],
    sometimesPresent: ['WGU_ID', 'Phone', 'SFDCContactID'],
    nature: 'both',
  },
  {
    id: 'ImportEvent', label: 'Import Event (Consolidated)', color: '#64748b',
    alwaysPresent: [],
    sometimesPresent: ['Email', 'Phone', 'MarketoLeadID', 'SFDCContactID'],
    nature: 'event',
  },
];

export function getNamespace(id: string): Namespace | undefined {
  return NAMESPACES.find(n => n.id === id);
}

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find(d => d.id === id);
}
