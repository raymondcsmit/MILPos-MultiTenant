import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TextEditorComponent } from './text-editor.component';

describe('TextEditorComponent', () => {
  let component: TextEditorComponent;
  let fixture: ComponentFixture<TextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextEditorComponent, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TextEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create and init editor with toolbar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.editor).toBeTruthy();
    expect(component.toolbar.length).toBe(6);
  });

  it('hides toolbar when hideToolBar input is true', () => {
    component.hideToolBar = true;
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('ngx-editor-menu');
    expect(menu).toBeNull();
  });

  it('shows toolbar when hideToolBar input is false', () => {
    component.hideToolBar = false;
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('ngx-editor-menu');
    expect(menu).toBeTruthy();
  });

  it('writeValue sets value and coerces null to empty string', () => {
    component.writeValue('<p>hello</p>');
    expect(component.value).toBe('<p>hello</p>');
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('onChange updates value and emits registered callback', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.onChange('<p>x</p>');
    expect(component.value).toBe('<p>x</p>');
    expect(onChange).toHaveBeenCalledWith('<p>x</p>');
  });

  it('registerOnTouched is a safe no-op', () => {
    expect(() => component.registerOnTouched(() => { })).not.toThrow();
  });
});
