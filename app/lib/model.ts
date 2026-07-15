export interface Indicator {
  studentId: string;
  studentName: string;
  corrects: number;
  progress: number;
  stumble: number | null;
  speed: number | null;
  prudence: number | null;
}
