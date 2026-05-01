import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Reusable backdrop + centered container modal. Clicking the backdrop emits `closed`.
// Used by AuthModalComponent and any future modals.
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  @Input() title = '';
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
}
