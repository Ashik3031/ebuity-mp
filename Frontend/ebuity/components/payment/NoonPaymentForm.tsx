"use client";

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { NPPaymentSession, warmupSdk, CardBrand, EndPoint } from "@noonpayments/np-payment-session-sdk";
import { noonPaymentApi, NoonSessionResponse } from "../../lib/api-client";
import { CreditCard, ShieldCheck, Lock, AlertCircle, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export interface NoonPaymentFormHandle {
  executePayment: () => Promise<string>;
  isReady: boolean;
  isValid: boolean;
}

interface NoonPaymentFormProps {
  containerId?: string;
  onValidityChange?: (isValid: boolean) => void;
  accentColor?: string; // e.g. "#CF565D" or "#E11D74"
}

export const NoonPaymentForm = forwardRef<NoonPaymentFormHandle, NoonPaymentFormProps>(
  ({ containerId = "noon-payment-mount-container", onValidityChange, accentColor = "#CF565D" }, ref) => {
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [configMessage, setConfigMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isValidCard, setIsValidCard] = useState(false);
    const [cardBrand, setCardBrand] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [iframeHeight, setIframeHeight] = useState<number>(370);

    const sessionRef = useRef<NPPaymentSession | null>(null);
    const isMountedRef = useRef(true);

    // Expose executePayment() to parent component (e.g. Checkout / Booking)
    useImperativeHandle(ref, () => ({
      isReady: !loading && configured === true && !!sessionRef.current,
      isValid: isValidCard,
      async executePayment(): Promise<string> {
        if (!sessionRef.current) {
          throw new Error("Payment session is not initialized.");
        }
        try {
          const result = await sessionRef.current.pay();
          if (!result || !result.sessionIdentifier) {
            throw new Error("No sessionIdentifier was returned by the payment gateway.");
          }
          return result.sessionIdentifier;
        } catch (payErr: any) {
          console.error("[NoonPaymentForm] pay() error:", payErr);
          throw new Error(payErr?.message || "Failed to process card details. Please verify your card information.");
        }
      },
    }));

    useEffect(() => {
      isMountedRef.current = true;
      let activeSession: NPPaymentSession | null = null;

      async function initializeNoonSession() {
        try {
          setLoading(true);
          setErrorMessage(null);

          // 1. Fetch Session JWT from backend
          const res: NoonSessionResponse = await noonPaymentApi.createSession();

          if (!isMountedRef.current) return;

          if (!res.success) {
            setConfigured(false);
            setConfigMessage(res.message || "Noon Payments credentials are not configured in the environment.");
            setLoading(false);
            return;
          }

          if (!res.jwt) {
            setConfigured(false);
            setConfigMessage("A valid payment session JWT could not be retrieved from the server.");
            setLoading(false);
            return;
          }

          setConfigured(true);

          const targetEndpoint = (res.endPoint || "https://api-test.noonpayments.com") as EndPoint;

          // 2. Pre-warm the SDK
          try {
            warmupSdk(targetEndpoint);
          } catch (warmErr) {
            console.warn("[NoonPaymentForm] warmupSdk note:", warmErr);
          }

          // 3. Initialize NPPaymentSession instance
          const supportedNetworks: CardBrand[] = ["visa", "mastercard", "mada", "amex"];

          const paymentSession = new NPPaymentSession({
            endPoint: targetEndpoint,
            jwt: res.jwt,
            supportedNetworks,
            locale: "en",
            showCardHolderName: true,
            style: {
              base: {
                fontFamily: "inherit",
                color: "#292525",
                fontSize: "14px",
              },
              input: {
                borderColor: "#E8D8C8",
                borderRadius: "12px",
                padding: "10px 14px",
                height: "44px",
                fontSize: "14px",
                placeholderColor: "#A8A29E",
              },
              inputFocus: {
                borderColor: accentColor,
              },
              inputError: {
                borderColor: "#E11D48",
              },
            },
            events: {
              onValid(cardInfo) {
                if (!isMountedRef.current) return;
                setIsValidCard(true);
                setCardBrand(cardInfo?.brand || null);
                setErrorMessage(null);
                onValidityChange?.(true);
              },
              onInvalid() {
                if (!isMountedRef.current) return;
                setIsValidCard(false);
                onValidityChange?.(false);
              },
              onBinChange(binInfo) {
                if (binInfo?.brand) {
                  setCardBrand(binInfo.brand);
                }
              },
            },
          });

          activeSession = paymentSession;
          sessionRef.current = paymentSession;

          // 4. Render into the container
          const containerSelector = `#${containerId}`;
          const renderResult = await paymentSession.render(containerSelector);

          // The SDK returns { height: number } representing the document.documentElement.scrollHeight of the iframe.
          // By HTML standards, an <iframe> defaults to 150px if not given explicit height.
          // We apply the reported height (minimum 370px) so Expiry and CVV fields are fully visible.
          const detectedHeight = renderResult?.height && renderResult.height > 200 ? renderResult.height : 370;
          const targetHeight = Math.max(detectedHeight, 370);
          setIframeHeight(targetHeight);

          if (typeof document !== "undefined") {
            const mountNode = document.querySelector(containerSelector);
            const iframeEl = mountNode?.querySelector("iframe") as HTMLIFrameElement | null;
            if (iframeEl) {
              iframeEl.style.height = `${targetHeight}px`;
              iframeEl.style.minHeight = `${targetHeight}px`;
              iframeEl.style.width = "100%";
              iframeEl.style.display = "block";
              iframeEl.style.border = "0";
            }
          }

          if (isMountedRef.current) {
            setLoading(false);
          }
        } catch (err: any) {
          console.error("[NoonPaymentForm] initialization error:", err);
          if (isMountedRef.current) {
            setErrorMessage(err?.message || "Failed to initialize Noon Payments iframe.");
            setLoading(false);
          }
        }
      }

      // Dynamic listener for iframe FRAME_READY resize payloads
      const handleWindowMessage = (event: MessageEvent) => {
        try {
          if (
            event.origin &&
            event.origin.includes("noonpayments.com") &&
            event.data &&
            typeof event.data === "object"
          ) {
            if (event.data.type === "FRAME_READY" && event.data.payload?.height) {
              const frameH = Math.max(Number(event.data.payload.height) || 0, 370);
              setIframeHeight(frameH);
              const mountNode = document.querySelector(`#${containerId}`);
              const iframeEl = mountNode?.querySelector("iframe") as HTMLIFrameElement | null;
              if (iframeEl) {
                iframeEl.style.height = `${frameH}px`;
                iframeEl.style.minHeight = `${frameH}px`;
              }
            }
          }
        } catch {
          // ignore
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("message", handleWindowMessage);
      }

      initializeNoonSession();

      return () => {
        isMountedRef.current = false;
        if (typeof window !== "undefined") {
          window.removeEventListener("message", handleWindowMessage);
        }
        if (activeSession) {
          try {
            activeSession.destroy();
          } catch {
            // ignore
          }
        }
        sessionRef.current = null;
      };
    }, [containerId, accentColor, retryCount]);

    return (
      <div className="w-full space-y-4">
        {/* Secure Trust Badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 border border-[#E8D8C8]/60 text-xs text-[#746D69]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-[#292525]">noon payments Secure Hosted Checkout</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3 h-3 text-stone-500" />
            <span>256-Bit SSL • PCI SAQ A</span>
          </div>
        </div>

        {/* Unconfigured State (Credentials not yet in .env) */}
        {configured === false && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-amber-950 text-sm">Noon Payments Gateway Enabled</h4>
                <p className="text-amber-800 leading-relaxed">
                  {configMessage ||
                    "Merchant credentials have not been configured in the backend environment yet. To process card transactions, insert your Application ID, Business Identifier, and Authorization Key into NOON_PAYMENTS_* variables in backend/.env."}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-200/70 flex items-center justify-between text-[11px] text-amber-700">
              <span>Card Networks: Visa, Mastercard, Mada, Amex</span>
              <span className="font-semibold text-amber-900">Sandbox Ready</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && configured !== false && (
          <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-xs text-[#746D69]">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
            <span>Connecting to noon payments secure gateway...</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Enforce full dimensions and responsive height on the Noon SDK iframe */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #${containerId} {
                width: 100% !important;
                min-height: ${iframeHeight}px !important;
                overflow: visible !important;
                transition: min-height 0.2s ease;
              }
              #${containerId} iframe {
                width: 100% !important;
                min-height: 360px !important;
                height: ${iframeHeight}px !important;
                display: block !important;
                border: 0 !important;
                overflow: visible !important;
              }
            `,
          }}
        />

        {/* Iframe Mount Container (Required by Noon Payments SDK) */}
        <div
          id={containerId}
          className={`w-full transition-all duration-200 ${loading || configured === false ? "hidden" : "block"
            }`}
          style={{ minHeight: `${iframeHeight}px`, width: "100%" }}
        />

        {/* Validation Status Indicator */}
        {!loading && configured === true && (
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <div className="flex items-center gap-1.5 text-[#746D69]">
              {isValidCard ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">
                    Card details valid {cardBrand ? `(${cardBrand.toUpperCase()})` : ""}
                  </span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                  <span className="text-stone-500">Please enter complete card number, expiry, and CVV</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <span>Visa</span>
              <span>•</span>
              <span>Mastercard</span>
              <span>•</span>
              <span>Mada</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

NoonPaymentForm.displayName = "NoonPaymentForm";

