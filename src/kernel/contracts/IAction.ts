export interface KernelAction {
  domain: string;
  type: string;
  payload: any;
  requestId: string;
}

export interface KernelResult {
  success: boolean;
  data?: any;
  error?: string;
  requestId: string;
}
