import { TemplateRef, ViewContainerRef } from '@angular/core';
import { HasClaimDirective } from './has-claim.directive';
import { SecurityService } from '../core/security/security.service';

describe('HasClaimDirective', () => {
  let templateRef: jasmine.SpyObj<TemplateRef<any>>;
  let viewContainer: jasmine.SpyObj<ViewContainerRef>;
  let securityService: jasmine.SpyObj<SecurityService>;

  beforeEach(() => {
    templateRef = jasmine.createSpyObj('TemplateRef', ['noop']);
    viewContainer = jasmine.createSpyObj('ViewContainerRef', ['createEmbeddedView', 'clear']);
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
  });

  it('creates embedded view when claim is present', () => {
    securityService.hasClaim.and.returnValue(true);
    const directive = new HasClaimDirective(templateRef, viewContainer, securityService);
    directive.hasClaim = 'ORDER_VIEW';
    expect(securityService.hasClaim).toHaveBeenCalledWith('ORDER_VIEW');
    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(templateRef);
    expect(viewContainer.clear).not.toHaveBeenCalled();
  });

  it('clears the view container when claim is absent', () => {
    securityService.hasClaim.and.returnValue(false);
    const directive = new HasClaimDirective(templateRef, viewContainer, securityService);
    directive.hasClaim = 'ORDER_VIEW';
    expect(securityService.hasClaim).toHaveBeenCalledWith('ORDER_VIEW');
    expect(viewContainer.clear).toHaveBeenCalled();
    expect(viewContainer.createEmbeddedView).not.toHaveBeenCalled();
  });

  it('creates embedded view when array of claims matches', () => {
    securityService.hasClaim.and.returnValue(true);
    const directive = new HasClaimDirective(templateRef, viewContainer, securityService);
    const claims = ['A', 'B'];
    directive.hasClaim = claims;
    expect(securityService.hasClaim).toHaveBeenCalledWith(claims);
    expect(viewContainer.createEmbeddedView).toHaveBeenCalledWith(templateRef);
  });
});
