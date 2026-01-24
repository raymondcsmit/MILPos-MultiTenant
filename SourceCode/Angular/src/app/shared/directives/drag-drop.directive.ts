import { Directive, HostListener, Input, Output, EventEmitter } from '@angular/core';


@Directive({
  selector: '[appDragDrop]',
  standalone: true
})
export class DragDropDirective {
  @Input() appDragDrop!: string;
  @Output() onFileDropped = new EventEmitter<Array<any>>();
  fileOver: boolean = false;
  @HostListener('dragover', ['$event']) onDragOver(evt: any) {
    // Dragover listener @HostListener('dragover', ['$event']) onDragover (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt: any) {

    // Dragleave listener @HostListener('dragleave', ['$event']) public onDragLeave (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  @HostListener('drop', ['$event']) onDrop(evt: any) {
    // Drop listener @HostListener('drop', ['$event']) public ondrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
    const files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.onFileDropped.emit(files);
    }
  }
}
