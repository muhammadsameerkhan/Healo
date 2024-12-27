import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})

export class HeaderComponent {
  @Output() dataEmitter: EventEmitter<string> = new EventEmitter<string>();
  @Input() currentSection: string = 'hero';
  
  get isChatActive(): boolean {
    return this.currentSection === 'chat';
  }

  sendData(data: string) {
    debugger
    this.currentSection = data;
    this.dataEmitter.emit(data); // Emit the data to the parent
  }
}
