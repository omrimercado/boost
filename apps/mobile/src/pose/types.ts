export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[];
  visibleCount: number;
  confidence: number;
}
