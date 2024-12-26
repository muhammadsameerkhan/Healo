import { Routes } from '@angular/router';
import { HeroComponent } from './hero/hero.component';
import { ChatComponent } from './chat/chat.component';

export const routes: Routes = [
    { path: '', redirectTo: '', pathMatch: 'full' }
    // { path: 'introduction', component: HeroComponent}, //, data: { animation: 'HomePage' }
    // { path: 'chat', component: ChatComponent}, //, data: { animation: 'ChatPage' } 
];