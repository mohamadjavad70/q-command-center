import { KernelAction, KernelResult } from './contracts/IAction';
import { ILogger } from './contracts/ILogger';
import { IPolicyGuard } from './contracts/IPolicyGuard';
import { ConfigLoader } from './services/ConfigLoader';
import { StructuredLogger } from './services/StructuredLogger';
import { PolicyGuard } from './services/PolicyGuard';

export class QKernelRuntime {
  private logger: ILogger;
  private policy: IPolicyGuard;
  private config: any;

  constructor(configPath: string) {
    this.logger = new StructuredLogger();
    this.policy = new PolicyGuard();
    const loader = new ConfigLoader(configPath);
    this.config = loader.getConfig();
  }

  async execute(action: KernelAction): Promise<KernelResult> {
    this.logger.info('Action received', { action });
    // Rule 2: requestId اجباری
    if (!action.requestId) {
      const error = 'Missing requestId';
      this.logger.error(error, { action });
      return { success: false, error, requestId: '' };
    }
    // Rule 3: policy check
    const allowed = await this.policy.check(action);
    if (!allowed) {
      const error = 'Policy denied';
      this.logger.warn(error, { action });
      return { success: false, error, requestId: action.requestId };
    }
    // اجرای اکشن (در این MVP فقط log)
    this.logger.info('Action executed', { action });
    return { success: true, data: null, requestId: action.requestId };
  }
}
