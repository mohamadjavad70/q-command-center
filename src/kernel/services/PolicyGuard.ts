import { IPolicyGuard } from '../contracts/IPolicyGuard';
import { KernelAction } from '../contracts/IAction';

// نمونه ساده: فقط اجازه به همه اکشن‌ها
export class PolicyGuard implements IPolicyGuard {
  async check(action: KernelAction): Promise<boolean> {
    // TODO: خواندن policy واقعی از فایل یا سرویس
    return true;
  }
}
