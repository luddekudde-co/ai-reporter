/**
 * ArticleChatComponent — renders the chat message list and input row.
 * All state lives in the parent (ArticleDetailComponent); this component
 * is purely presentational: it receives messages + isSending as inputs
 * and emits a send event when the user submits a message.
 */
import {
  Component,
  input,
  output,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../../core/services/chat.service';

@Component({
  selector: 'app-article-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './article-chat.component.html',
  styleUrl: './article-chat.component.scss',
})
export class ArticleChatComponent implements AfterViewChecked {
  messages = input<ChatMessage[]>([]);
  isSending = input<boolean>(false);
  send = output<string>();

  @ViewChild('messageList') messageList!: ElementRef<HTMLElement>;

  draft = '';

  ngAfterViewChecked(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  submit(): void {
    const text = this.draft.trim();
    if (!text || this.isSending()) return;
    this.send.emit(text);
    this.draft = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }
}
