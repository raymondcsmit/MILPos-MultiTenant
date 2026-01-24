import { Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingProgressService } from './loading-progress-service';

@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss'],
  standalone: true,
  imports: [MatProgressBarModule],
})
export class LoadingIndicatorComponent {
  loaderService = inject(LoadingProgressService);
  progress = 100;
}
