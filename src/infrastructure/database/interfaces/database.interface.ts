export interface DatabaseHealth {
  healthy: boolean;
  responseTime: number;
  connections?: {
    total: number;
    active: number;
    idle: number;
  };
  error?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  checks: {
    postgres: DatabaseHealth;
    mongodb: DatabaseHealth;
  };
}
