import { Logger, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentCallbackController } from './payment-callback.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import { ZarinpalPaymentGateway } from './gateways/zarinpal-payment.gateway';
import { OrderModule } from '../order/order.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { assertPaymentUrls, env } from '../../config/env.config';

// The swap, exactly as SmsModule does it: PAYMENT_PROVIDER decides which class
// answers the token, once, at boot. A missing merchant id is then a startup
// failure instead of a customer stranded on a broken gateway page.
const paymentGatewayProvider: Provider = {
  provide: PAYMENT_GATEWAY,
  useFactory: () => {
    const logger = new Logger('Payment');

    // Before the provider choice, because both urls are used whichever gateway
    // answers the token — including mock, which still sends the customer to
    // the result url.
    assertPaymentUrls();

    const provider = Object.values(PaymentProvider).find(
      // String(), because the env value is a plain string and the enum
      // members are not: comparing them directly is exactly the mistake the
      // no-unsafe-enum-comparison rule exists to catch.
      (value) => String(value) === env.payment.provider,
    );

    if (!provider)
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${env.payment.provider}". Use one of: ${Object.values(PaymentProvider).join(', ')}.`,
      );

    if (provider === PaymentProvider.Zarinpal) {
      if (!env.payment.zarinpal.merchantId)
        throw new Error(
          'PAYMENT_PROVIDER=zarinpal but ZARINPAL_MERCHANT_ID is empty.',
        );

      logger.log(
        `Zarinpal, charging in Toman (${env.payment.zarinpal.currency}), callback ${env.payment.callbackUrl}`,
      );
      return new ZarinpalPaymentGateway();
    }

    // Loud in production: a shop left on mock marks orders paid without ever
    // taking money, and nothing else in the logs would say so.
    if (env.isProduction)
      logger.warn(
        'PAYMENT_PROVIDER=mock in production — orders are marked paid without taking any money.',
      );
    else logger.log('Mock gateway: the redirect url completes the payment.');

    return new MockPaymentGateway();
  },
};

@Module({
  // OrderModule for OrderService.markPaid — the order's status and the cart
  // belong to that module, so the payment module asks rather than writing
  // them itself. SettingsModule only for the shop name in the gateway
  // description the customer sees on their bank statement.
  imports: [TypeOrmModule.forFeature([Payment]), OrderModule, SettingsModule],
  controllers: [
    PaymentsController,
    PaymentCallbackController,
    AdminPaymentsController,
  ],
  providers: [PaymentsService, paymentGatewayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
