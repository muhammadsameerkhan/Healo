import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { HeroComponent } from './hero/hero.component';
import { ChatComponent } from './chat/chat.component';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, HeroComponent, ChatComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [
    trigger('fadeAnimation', [
      // Chat entering (sliding up)
      transition('hero => chat', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateY(0)', opacity: 1 })
        )
      ]),
      // Hero entering (sliding down)
      transition('chat => hero', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateY(0)', opacity: 1 })
        )
      ]),
      // Component exiting
      transition(':leave', [
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 0 })
        )
      ])
    ])
  ]
})

export class AppComponent {
  title = 'doctorai';
  currentSection: string = 'hero';
  
  @ViewChild('scrollContainer', { static: true }) private scrollContainer!: ElementRef;
  //  prepareRoute(outlet: RouterOutlet) {
  //   return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  // }
  onDataReceived(data: string) {
    debugger
    this.currentSection = data;
    const element = this.scrollContainer.nativeElement.querySelector(`app-${this.currentSection}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
