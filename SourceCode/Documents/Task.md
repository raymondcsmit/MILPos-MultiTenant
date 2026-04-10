# Dynamic Theming Implementation Tasks

- [/] **Phase 1: Core Layout & SCSS Infrastructure**
    - [x] Create `_var-generator.scss` mixin
    - [/] **Phase 1: Core Layout & SCSS Infrastructure**
    - [x] Create `_var-generator.scss` mixin
    - [x] Refactor `custom-theme.scss` to use generator
    - [x] Define default, ocean, and dark themes
    - [x] Update `variables.scss` to bridge SCSS vars to CSS vars
- [x] **Phase 2: Angular Service & State**
    - [x] Create `ThemeService`
    - [x] Implement local storage persistence
    - [x] Integrate service into `AppComponent`
- [x] **Phase 3: UI Controls**
    - [x] Create `ThemeSelectorComponent`
    - [x] validte `ThemeSelectorComponent` functionality
    - [x] Add selector to Settings/Sidebar
- [x] **Phase 4: Component Migration (Ongoing)**
    - [x] Audit hardcoded colors in key components
    - [x] Refactor Dashboard cards to use dynamic variables
    - [x] Refactor `sales-order-invoice.component.html` (hardcoded `#fff`, `#dee2e6`)
    - [x] Refactor `purchase-order-invoice.component.html`
- [ ] **Phase 5: Verification**
    - [x] Fix SCSS build error (Undefined variable `mat.$warn-palette`, `mat.$pink-palette`)
    - [x] Fix Backend MemoryCache Dependency (ValidationHandler error)
    - [ ] Manual test of theme switching
    - [ ] Manual test of theme switching
    - [ ] Verify persistence on reload

- [x] **Phase 7: Enhanced Theming (10+ Themes)**
    - [x] Add missing Material Palettes (Orange, Teal, Deep Purple, Blue Grey, Brown)
    - [x] Implement new SCSS Theme Classes (Sunset, Forest, Berry, Royal, Slate, Sky)
    - [x] Update ThemeService Types
    - [x] Update ThemeSelector UI
    - [x] Fix 'Pay Online Now' broken link (SubscriptionComponent)

- [x] **Phase 8: Final Polish**
    - [x] Update Application Logo (MIL Logo - Transparent)
    - [x] Generate Logo 382x104
    - [x] Generate Logo 646x147
    - [x] Generate Logo 620x196
    - [x] Generate Logo 232x57

- [x] **Phase 9: Bug Fixes**
    - [x] Fix Electron Print Preview Issue
    - [x] Restore Button Colors (Save/Cancel/Login)

- [ ] **Phase 10: Hardware Support**
    - [ ] Implement Thermal Receipt Layout

- [/] **Phase 11: Database Support**
    - [x] Create POS.Migrations.PostgreSQL project
    - [x] Configure PostgreSQL in API (Program.cs, appsettings.json)
    - [x] Add migration commands to documentation
    - [x] Verify PostgreSQL support

- [/] **Phase 12: Deployment**
    - [x] Configure `appsettings.Cloud.json`
    - [x] Create Deployment Script/Guide
    - [x] Enable WinRM on Client/Server
    - [x] Fix HTTP 500.19 Error (Deleted obsolete `web.config`)
    - [ ] Deploy successfully to Production
