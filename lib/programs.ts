export interface ProgramManifestEntry {
  id: string;
  name: string;
  description: string;
  hexFile: string;
  tohostAddr: number;
  resultAddr: number;
  resultLabel: string;
  expected?: number;
  expectedArray?: number[];
}
