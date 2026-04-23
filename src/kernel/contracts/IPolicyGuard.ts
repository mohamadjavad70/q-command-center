import { KernelAction } from './IAction';

export interface IPolicyGuard {
  check(action: KernelAction): Promise<boolean>;
}
