import { SecurityService } from './security.service';
import { LicenseInitializerService } from '@mlglobtech/license-validator-pos';
import { ToastrService } from '@core/services/toastr.service';

export function initializeApp(licenseService: LicenseInitializerService, toastrService: ToastrService, securityService: SecurityService): () => Promise<void> {
  return () => new Promise<void>((resolve, reject) => {
    return licenseService.initialize().then((result) => {
      if (result == "success") {
        securityService.setCompany();
        return resolve();
      }
      if (result == "tokenremoved") {
        securityService.resetSecurityObject();
        setTimeout(() => {
          toastrService.success("License key removed successfully.");
          return resolve();
        }, 200);
      }
      else if (result == "tokenadded") {
        securityService.resetSecurityObject();
        setTimeout(() => {
          toastrService.success("License key activated successfully.");
          return resolve();
        }, 200);
      }
      else if (result == "notupdated" || result == "error") {
        toastrService.error("The license key is not updated. Please try again.");
        return resolve();
      }
      else if (result == "error_msg") {
        return resolve();
      }
    }).catch((error) => {
      console.error("License initialization failed", error);
      return reject();
    }
    );
  });
}

