export enum TextSafetyField {
  PUBLIC_TITLE = 'PUBLIC_TITLE',
  PUBLIC_DESCRIPTION = 'PUBLIC_DESCRIPTION',
  PRIVATE_NOTE = 'PRIVATE_NOTE',
  MESSAGE = 'MESSAGE',
}

export enum TextSafetySeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFORMATION = 'INFORMATION',
}

export type TextSafetyIssue = {
  code: string;
  field: TextSafetyField;
  severity: TextSafetySeverity;
  blocking: boolean;
  message: string;
};

export type TextSafetyOptions = {
  field: TextSafetyField;
  blockContact?: boolean;
  blockLinks?: boolean;
  blockProfanity?: boolean;
  blockThreat?: boolean;
  detectSpam?: boolean;
  detectTechnicalPaste?: boolean;
};

export type TextSafetyResult = {
  valid: boolean;
  issues: TextSafetyIssue[];
  errors: TextSafetyIssue[];
  warnings: TextSafetyIssue[];
};
