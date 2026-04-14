import { SecurityService } from './security.service';
import { ToastrService } from '@core/services/toastr.service';

export function initializeApp(toastrService: ToastrService, securityService: SecurityService): () => Promise<void> {
  return () => new Promise<void>((resolve, reject) => {
    // Bypass license check as per user request
    securityService.setCompany();
    return resolve();
  });
}

