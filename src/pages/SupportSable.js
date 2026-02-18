import React from "react";
import { useNavigate } from "react-router-dom";
import "./SupportSable.css";

import confirmationImg from "../assets/images/payment_confirmation.png";

const PRESET_AMOUNTS = [5, 10, 15, 25, 50];

export default function SupportSable() {
  const navigate = useNavigate();

  const [selectedAmount, setSelectedAmount] = React.useState(10);
  const [customAmount, setCustomAmount] = React.useState("");
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [processingPayment, setProcessingPayment] = React.useState(false);

  // Validation error
  const [amountError, setAmountError] = React.useState("");

  function effectiveAmount() {
    const raw = customAmount.trim();
    if (!raw) return selectedAmount;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return selectedAmount;
    return parsed;
  }

  function formatMoney(n) {
    const val = Number(n);
    if (!Number.isFinite(val)) return "$0.00";
    return `$${val.toFixed(2)}`;
  }

  function pickPreset(n) {
    setSelectedAmount(n);
    setCustomAmount("");
    setAmountError("");
  }

  // Validation helper
  function validateAmount(rawValue) {
    const raw = String(rawValue ?? "").trim();
    if (!raw) return ""; // preset is fine
    // allow "25", "25.00", but reject letters
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return "Enter a valid amount (e.g., 25 or 25.00).";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return "Amount must be greater than 0.";
    if (parsed < 1) return "Minimum donation is $1.00.";
    if (parsed > 5000) return "Maximum donation is $5,000.";
    return "";
  }

  function handlePayPalPayment() {
    const err = validateAmount(customAmount);
    setAmountError(err);
    if (err) return;

    const amount = effectiveAmount();
    setProcessingPayment(true);

    // In production, this would redirect to PayPal or open PayPal SDK
    // For demo purposes, we simulate a successful payment after a brief delay
    setTimeout(() => {
      setProcessingPayment(false);
      setShowSuccess(true);
    }, 1500);

    // Production code would look like:
    // window.location.href = `https://www.paypal.com/paypalme/sablewriting/${amount}`;
    // Or use PayPal SDK to create a payment
  }

  function handleBackToHome() {
    setShowSuccess(false);
    navigate("/");
  }

  return (
    <section className="supPage" aria-label="Support Sable payments">
      <div className="supShell">
        <h1 className="supTitle">SUPPORT SABLE</h1>
        <p className="supSubtitle">Your contribution helps keep Sable free and ad-free for all writers and readers.</p>

        <div className="supCard" role="region" aria-label="Payment card">
          <div className="supCardTop" aria-hidden="true" />

          <div className="supCardBody">
            {/* Amount Selection */}
            <div className="supSection">
              <div className="supSectionTitle">Choose an amount</div>
              <div className="supAmounts" aria-label="Choose amount">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={selectedAmount === amt && !customAmount ? "supAmtBtn supAmtBtn--active" : "supAmtBtn"}
                    onClick={() => pickPreset(amt)}
                    aria-label={`Donate ${amt} dollars`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="supSection">
              <div className="supCustomRow">
                <label className="supLabel" htmlFor="customAmount">
                  Or enter a custom amount
                </label>
                <div className="supCustomInputWrap">
                  <span className="supDollar" aria-hidden="true">
                    $
                  </span>
                  <input
                    id="customAmount"
                    className="supInput"
                    inputMode="decimal"
                    placeholder="25.00"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (amountError) setAmountError("");
                    }}
                    aria-label="Custom payment amount"
                    aria-invalid={amountError ? "true" : "false"}
                    aria-describedby={amountError ? "amountError" : undefined}
                  />
                </div>

                {amountError && (
                  <div
                    id="amountError"
                    role="alert"
                    className="supError"
                  >
                    {amountError}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="supSummary">
              <div className="supSummaryLabel">Your contribution:</div>
              <div className="supSummaryAmount">{formatMoney(effectiveAmount())}</div>
            </div>

            {/* PayPal Button */}
            <div className="supPaymentSection">
              <button
                type="button"
                className="supPayPalBtn"
                onClick={handlePayPalPayment}
                disabled={processingPayment}
                aria-label="Pay with PayPal"
              >
                {processingPayment ? (
                  <span className="supPayPalProcessing">Processing...</span>
                ) : (
                  <>
                    <span className="supPayPalLogo">PayPal</span>
                    <span className="supPayPalText">Pay with PayPal</span>
                  </>
                )}
              </button>

              <div className="supPaymentNote">
                You'll be redirected to PayPal to complete your payment securely.
              </div>
            </div>

            {/* Why Support Section */}
            <div className="supWhySection">
              <div className="supWhyTitle">Why Support Sable?</div>
              <ul className="supWhyList">
                <li>Keep the platform free for all writers and readers</li>
                <li>Help us maintain ad-free reading experiences</li>
                <li>Support ongoing development of new features</li>
                <li>Contribute to server costs and infrastructure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div
          className="supOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Payment successful"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowSuccess(false);
          }}
        >
          <div className="supModal supModal--thankyou">
            <div className="supThankTitle">Thank You For Your Contribution!</div>
            <div className="supThankAmount">{formatMoney(effectiveAmount())}</div>

            <img className="supConfirmImg supConfirmImg--thankyou" src={confirmationImg} alt="" aria-hidden="true" />

            <p className="supThankMessage">
              Your generous support helps keep Sable running and free for all writers and readers. We truly appreciate your contribution!
            </p>

            <button type="button" className="supBackHome" onClick={handleBackToHome}>
              Back to Home
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
