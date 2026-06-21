export type LinaDocumentKind =
  | 'TAPU'
  | 'KIMLIK'
  | 'YETKI_BELGESI'
  | 'KAT_KARSILIGI_SOZLESMESI'
  | 'VERGI_LEVHASI'
  | 'DIGER';

export type LinaDocumentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type LinaTkgmParcelStatus =
  | 'NOT_REQUESTED'
  | 'MISSING_INPUT'
  | 'MATCHED'
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'ERROR';

export type LinaExtractedParcelInfo = {
  ownerName?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  adaNo?: string | null;
  parselNo?: string | null;
  areaText?: string | null;
  areaSquareMeters?: number | null;
  documentDate?: string | null;
  deedType?: string | null;
};

export type LinaTkgmParcelResult = {
  status: LinaTkgmParcelStatus;
  matched: boolean;
  source: 'TKGM' | 'LOCAL' | 'NONE';
  message: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  adaNo?: string | null;
  parselNo?: string | null;
  areaSquareMeters?: number | null;
  nitelik?: string | null;
  pafta?: string | null;
  mevki?: string | null;
  geometryAvailable?: boolean;
  raw?: unknown;
};

export type LinaDocumentDeepAnalysis = {
  documentType: LinaDocumentKind;
  ocrText?: string;
  ocrQualityScore: number;
  confidenceScore: number;
  riskLevel: LinaDocumentRiskLevel;
  qrDetected: boolean;
  signatureDetected: boolean;
  missingPageRisk: boolean;
  forgeryRiskScore: number;
  extracted: LinaExtractedParcelInfo;
  tkgm: LinaTkgmParcelResult;
  warnings: string[];
  linaSummary: string;
};
