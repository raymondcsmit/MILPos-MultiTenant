import { Component, Input, OnInit } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  imports: [
    FormsModule,
    NgxEditorModule,
    TranslateModule,
    ReactiveFormsModule
  ],
  templateUrl: './text-editor.component.html',
  styleUrl: './text-editor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TextEditorComponent,
      multi: true,
    },
  ]
})
export class TextEditorComponent implements OnInit {
  @Input() disabled: boolean = false;
  @Input() hideToolBar: boolean = false;
  editor!: Editor;
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline', 'strike'],
    ['code', 'blockquote'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];

  value: string = '';

  ngOnInit(): void {
    this.editor = new Editor();
  }

  private onChangeFn: (value: any) => void = () => { };

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    // ignore
  }

  onChange(value: string): void {
    this.value = value;
    this.onChangeFn(value);
  }
}
