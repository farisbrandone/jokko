import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Result } from '@jokko/domain-kernel';
import type {
  Conversation as ConversationView,
  ConversationList,
  ConversationWithMessages,
  StartConversationInput,
  StartedConversation,
} from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import { Conversation } from '../domain/conversation.aggregate';
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from '../domain/ports/conversation.repository';

const ONE_HOUR_MS = 3_600_000;

@Injectable()
export class MessagingService {
  private readonly maxNewPerHour: number;

  constructor(
    @Inject(CONVERSATION_REPOSITORY) private readonly repo: ConversationRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    this.maxNewPerHour = config.get('messaging', { infer: true }).maxNewConversationsPerHour;
  }

  async start(shopId: string, input: StartConversationInput): Promise<Result<StartedConversation>> {
    const recent = await this.repo.countRecentByBuyerPhone(shopId, input.buyerPhone, ONE_HOUR_MS);
    if (recent >= this.maxNewPerHour) {
      throw new HttpException(
        'Trop de demandes de contact depuis ce numéro. Réessayez dans une heure.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const started = Conversation.start({
      shopId,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail,
      productId: input.productId,
      productName: input.productName,
      firstMessage: input.message,
    });
    if (started.isErr) return Result.err(started.getError());
    const { conversation, buyerToken } = started.unwrap();
    await this.repo.save(conversation);
    return Result.ok({ conversationId: conversation.id.value, buyerToken });
  }

  async buyerView(
    shopId: string,
    id: string,
    token: string,
  ): Promise<ConversationWithMessages> {
    const conv = await this.load(shopId, id);
    if (!conv.verifyBuyerToken(token)) throw new ForbiddenException('Jeton invalide');
    return conv.toViewWithMessages();
  }

  async buyerReply(shopId: string, id: string, token: string, body: string): Promise<void> {
    const conv = await this.load(shopId, id);
    if (!conv.verifyBuyerToken(token)) throw new ForbiddenException('Jeton invalide');
    const res = conv.addBuyerMessage(body);
    if (res.isErr) throw new ForbiddenException(res.getError());
    await this.repo.save(conv);
  }

  async list(
    shopId: string,
    filter: { status?: 'open' | 'closed'; page: number; pageSize: number },
  ): Promise<ConversationList> {
    const page = await this.repo.findByShop(shopId, filter);
    return {
      items: page.items.map((c) => c.toView()),
      total: page.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async thread(shopId: string, id: string): Promise<ConversationWithMessages> {
    return (await this.load(shopId, id)).toViewWithMessages();
  }

  async sellerReply(shopId: string, id: string, body: string): Promise<ConversationView> {
    const conv = await this.load(shopId, id);
    const res = conv.addSellerMessage(body);
    if (res.isErr) throw new ForbiddenException(res.getError());
    await this.repo.save(conv);
    return conv.toView();
  }

  async close(shopId: string, id: string): Promise<ConversationView> {
    const conv = await this.load(shopId, id);
    conv.close();
    await this.repo.save(conv);
    return conv.toView();
  }

  private async load(shopId: string, id: string): Promise<Conversation> {
    const conv = await this.repo.findById(shopId, id);
    if (!conv) throw new NotFoundException('Conversation introuvable');
    return conv;
  }
}
