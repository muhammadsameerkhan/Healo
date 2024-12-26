import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import Typed from 'typed.js';

@Component({
  selector: 'app-hero',
  standalone: true,  // Standalone component declaration
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css']
})
export class HeroComponent implements OnInit, OnDestroy {
  @ViewChild('typedElement', { static: true }) typedElement!: ElementRef;
  typed: Typed | undefined;

  ngOnInit(): void {
    const options = {
      strings: ["Medical Assistant", "Health Companion", "Symptom Checker"],
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000,
      loop: true,
      showCursor: true
    };

    // Initialize Typed.js only if `typedElement` is defined
    if (this.typedElement) {
      this.typed = new Typed(this.typedElement.nativeElement, options);
    }
  }

  ngOnDestroy(): void {
    // Properly destroy the Typed.js instance when the component is destroyed
    if (this.typed) {
      this.typed.destroy();
    }
  }
}
