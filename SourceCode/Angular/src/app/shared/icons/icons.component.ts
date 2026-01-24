import { Component, Input } from '@angular/core';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss',
  standalone: true,
  imports: [FeatherModule]
})
export class IconsComponent {
  @Input() public name?: string;
  @Input() public class?: string;
  constructor() {
  }
}
