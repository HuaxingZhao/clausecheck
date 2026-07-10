/**
 * Supabase Auth Send SMS Hook → 阿里云号码认证（免资质预置签名/模板）
 *
 * Deploy:
 *   supabase functions deploy send-sms --no-verify-jwt
 *
 * Secrets (supabase secrets set ...):
 *   SEND_SMS_HOOK_SECRET          # Dashboard 生成的 v1,whsec_...
 *   ALIYUN_ACCESS_KEY_ID
 *   ALIYUN_ACCESS_KEY_SECRET
 *   ALIYUN_SMS_SIGN_NAME          # 控制台赠送签名，如「速通互联验证码」
 *   ALIYUN_SMS_TEMPLATE_CODE      # 控制台赠送模板，登录/注册一般为 100001
 *   # 可选：非 +86 回退 Twilio（启用 Hook 后默认短信通道会被替换）
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID  # 或 TWILIO_FROM_NUMBER
 */
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const encoder = new TextEncoder();

function jsonError(httpCode: number, message: string, status = httpCode) {
  return new Response(
    JSON.stringify({
      error: { http_code: httpCode, message },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/** Normalize to digits-only national CN number or keep E.164 for Twilio. */
function parsePhone(raw: string): { e164: string; isChina: boolean; nationalCn: string | null } {
  const phone = raw.trim();
  const e164 = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
  const digits = e164.replace(/\D/g, "");
  const isChina = digits.startsWith("86") && digits.length >= 13;
  const nationalCn = isChina ? digits.slice(2) : null;
  return { e164, isChina, nationalCn };
}

async function hmacSha1Base64(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

/** Aliyun RPC signature (HTTPS GET) for Dypnsapi SendSmsVerifyCode. */
async function aliyunRpcGet(
  action: string,
  params: Record<string, string>
): Promise<{ ok: boolean; body: Record<string, unknown>; status: number }> {
  const accessKeyId = requireEnv("ALIYUN_ACCESS_KEY_ID");
  const accessKeySecret = requireEnv("ALIYUN_ACCESS_KEY_SECRET");

  const common: Record<string, string> = {
    Format: "JSON",
    Version: "2017-05-25",
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    Action: action,
    ...params,
  };

  const sortedKeys = Object.keys(common).sort();
  const canonical = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(common[k]!)}`)
    .join("&");
  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonical)}`;
  const signature = await hmacSha1Base64(`${accessKeySecret}&`, stringToSign);
  const url = `https://dypnsapi.aliyuncs.com/?${canonical}&Signature=${percentEncode(signature)}`;

  const res = await fetch(url, { method: "GET" });
  const body = (await res.json()) as Record<string, unknown>;
  return { ok: res.ok && (body.Code === "OK" || body.Success === true), body, status: res.status };
}

/**
 * Pass Supabase-generated OTP into Aliyun preset template.
 * TemplateParam uses concrete code so Supabase Auth remains the verifier
 * (Aliyun CheckSmsVerifyCode is NOT used).
 */
async function sendAliyunSms(nationalPhone: string, otp: string): Promise<void> {
  const signName = requireEnv("ALIYUN_SMS_SIGN_NAME");
  const templateCode = requireEnv("ALIYUN_SMS_TEMPLATE_CODE");

  const templateParam = JSON.stringify({
    code: otp,
    min: "5",
  });

  const { ok, body } = await aliyunRpcGet("SendSmsVerifyCode", {
    PhoneNumber: nationalPhone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: templateParam,
    CountryCode: "86",
    CodeLength: String(otp.length),
    ValidTime: "300",
    ReturnVerifyCode: "false",
  });

  if (!ok) {
    const msg =
      (typeof body.Message === "string" && body.Message) ||
      (typeof body.Code === "string" && body.Code) ||
      JSON.stringify(body);
    throw new Error(`Aliyun SendSmsVerifyCode failed: ${msg}`);
  }
}

async function sendTwilioSms(e164: string, otp: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")?.trim();

  if (!accountSid || !authToken) {
    throw new Error("Non-+86 number requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
  }
  if (!messagingServiceSid && !fromNumber) {
    throw new Error("Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER for non-+86 SMS");
  }

  const body = new URLSearchParams({
    To: e164.startsWith("+") ? e164 : `+${e164}`,
    Body: `【ClauseCheck】Your code is ${otp}, valid for 5 min. Not legal advice.`,
  });
  if (messagingServiceSid) body.set("MessagingServiceSid", messagingServiceSid);
  else if (fromNumber) body.set("From", fromNumber);

  const cred = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${cred}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
  const data = (await res.json()) as { status?: string; message?: string; code?: number };
  if (!res.ok || (data.status !== "queued" && data.status !== "sent" && data.status !== "accepted")) {
    throw new Error(`Twilio failed: ${data.code ?? res.status} ${data.message ?? JSON.stringify(data)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed", 405);
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let phone = "";
  let otp = "";

  try {
    const hookSecret = requireEnv("SEND_SMS_HOOK_SECRET");
    const base64Secret = hookSecret.replace(/^v1,whsec_/, "");
    const wh = new Webhook(base64Secret);
    const verified = wh.verify(payload, headers) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };
    phone = verified.user?.phone ?? "";
    otp = verified.sms?.otp ?? "";
  } catch (err) {
    console.error("hook verify failed:", err);
    return jsonError(401, "Invalid SMS hook signature", 401);
  }

  if (!phone || !otp) {
    return jsonError(400, "Missing phone or otp in hook payload", 400);
  }

  try {
    const { e164, isChina, nationalCn } = parsePhone(phone);

    if (isChina && nationalCn) {
      await sendAliyunSms(nationalCn, otp);
    } else {
      await sendTwilioSms(e164, otp);
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-sms error:", message);
    return jsonError(500, message, 500);
  }
});
