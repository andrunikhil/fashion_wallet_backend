export interface AvatarProcessingJobData {
  avatarId: string;
  userId: string;
  photoUrls: {
    front?: string;
    side?: string;
    back?: string;
  };
  unit: 'metric' | 'imperial';
  customization?: {
    skinTone?: string;
    hairColor?: string;
    bodyShape?: string;
  };
}

export interface JobStatus {
  id: string | undefined;
  state: string;
  progress: number | object;
  data: any;
  returnvalue: any;
  failedReason: string | undefined;
}

export interface ProcessingResult {
  success: boolean;
  avatarId: string;
  modelUrls?: {
    gltf?: string;
    glb?: string;
  };
  error?: string;
}

export interface ProcessingUpdate {
  avatarId: string;
  progress?: number;
  status?: string;
  message?: string;
  currentStep?: string;
  timestamp: Date;
}
