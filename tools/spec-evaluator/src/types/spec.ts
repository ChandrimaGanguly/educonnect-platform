/**
 * Types for representing parsed OpenSpec specification documents
 */

export enum SectionType {
  TITLE = 'title',
  PURPOSE = 'purpose',
  REQUIREMENTS = 'requirements',
  REQUIREMENT = 'requirement',
  SCENARIO = 'scenario',
  NON_FUNCTIONAL = 'non_functional',
  UNKNOWN = 'unknown'
}

export enum RFCKeyword {
  SHALL = 'SHALL',
  MUST = 'MUST',
  SHOULD = 'SHOULD',
  MAY = 'MAY'
}

export interface SpecMetadata {
  title: string;
  purpose?: string;
  lastModified?: Date;
  wordCount: number;
  lineCount: number;
}

export interface SpecSection {
  type: SectionType;
  level: number;
  title: string;
  content: string;
  lineNumber: number;
  children: SpecSection[];
  parent?: SpecSection;
}

export interface ParsedSpec {
  filePath: string;
  metadata: SpecMetadata;
  sections: SpecSection[];
  requirements: Requirement[];
  rawContent: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  keywords: RFCKeyword[];
  scenarios: Scenario[];
  lineNumber: number;
  section: SpecSection;
}

export interface Scenario {
  title: string;
  given: string[];
  when: string[];
  then: string[];
  lineNumber: number;
  isComplete: boolean;
}

export interface NFRCategory {
  name: string;
  requirements: string[];
  lineNumber: number;
}
