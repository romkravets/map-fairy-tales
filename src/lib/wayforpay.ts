// lib/wayforpay.ts
// Хелпер для підпису WayForPay — тільки серверний код

import crypto from "crypto";

const MERCHANT_ACCOUNT = process.env.WFP_MERCHANT_ACCOUNT!;
const MERCHANT_SECRET = process.env.WFP_MERCHANT_SECRET!;
const MERCHANT_DOMAIN = process.env.WFP_MERCHANT_DOMAIN!; // напр. "yourdomain.com"
const WFP_API_URL = "https://api.wayforpay.com/api";

// ── HMAC-MD5 підпис ─────────────────────────────────
export function sign(fields: (string | number)[]): string {
  const str = fields.join(";");
  return crypto
    .createHmac("md5", MERCHANT_SECRET)
    .update(str, "utf8")
    .digest("hex");
}

// ── Підпис для CREATE_INVOICE ────────────────────────
// Порядок полів строго за документацією WayForPay:
// merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;
// productName[0];productCount[0];productPrice[0]
export function signInvoice(params: {
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
}): string {
  return sign([
    MERCHANT_ACCOUNT,
    MERCHANT_DOMAIN,
    params.orderReference,
    params.orderDate,
    params.amount,
    params.currency,
    ...params.productName,
    ...params.productCount,
    ...params.productPrice,
  ]);
}

// ── Підпис для верифікації webhook ──────────────────
// merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
export function signWebhook(params: {
  orderReference: string;
  amount: string | number;
  currency: string;
  authCode: string;
  cardPan: string;
  transactionStatus: string;
  reasonCode: string | number;
}): string {
  return sign([
    MERCHANT_ACCOUNT,
    params.orderReference,
    params.amount,
    params.currency,
    params.authCode,
    params.cardPan,
    params.transactionStatus,
    params.reasonCode,
  ]);
}

// ── Підпис відповіді на webhook ──────────────────────
// WayForPay очікує відповідь з підписом інакше буде слати повторні запити 4 дні
export function signWebhookResponse(
  orderReference: string,
  status: string,
  time: number,
): string {
  return sign([orderReference, status, time]);
}

// ── Створити інвойс через WayForPay API ──────────────
export interface CreateInvoiceParams {
  orderReference: string;
  amount: number;
  productName: string;
  clientEmail?: string;
  serviceUrl: string; // webhook URL
  returnUrl: string; // redirect після оплати
}

export async function createInvoice(params: CreateInvoiceParams): Promise<{
  invoiceUrl: string;
  qrCode?: string;
  error?: string;
}> {
  const orderDate = Math.floor(Date.now() / 1000);

  const body = {
    transactionType: "CREATE_INVOICE",
    merchantAccount: MERCHANT_ACCOUNT,
    merchantAuthType: "SimpleSignature",
    merchantDomainName: MERCHANT_DOMAIN,
    merchantSignature: signInvoice({
      orderReference: params.orderReference,
      orderDate,
      amount: params.amount,
      currency: "UAH",
      productName: [params.productName],
      productCount: [1],
      productPrice: [params.amount],
    }),
    apiVersion: 1,
    language: "UA",
    serviceUrl: params.serviceUrl,
    returnUrl: params.returnUrl,
    orderReference: params.orderReference,
    orderDate,
    amount: params.amount,
    currency: "UAH",
    orderTimeout: 86400, // 24 години
    productName: [params.productName],
    productPrice: [params.amount],
    productCount: [1],
    paymentSystems: "card;googlePay;applePay;privat24",
    ...(params.clientEmail ? { clientEmail: params.clientEmail } : {}),
  };

  const resp = await fetch(WFP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!data.invoiceUrl) {
    return { invoiceUrl: "", error: data.reason || "WayForPay error" };
  }

  return { invoiceUrl: data.invoiceUrl, qrCode: data.qrCode };
}
