import React from "react";
import { useNavigate } from "react-router-dom";
import "./SupportSable.css";

import confirmationImg from "../assets/images/payment_confirmation.png";

const PRESET_AMOUNTS = [5, 10, 15];

export default function SupportSable() {
  const navigate = useNavigate();

  const [selectedAmount, setSelectedAmount] = React.useState(5);
  const [customAmount, setCustomAmount] = React.useState("");
  const [method, setMethod] = React.useState("providers"); // providers | card
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Validation, UI errors
  const [amountError, setAmountError] = React.useState("");
  const [cardErrors, setCardErrors] = React.useState({});

  // Card form (demo)
  const [cardName, setCardName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [zip, setZip] = React.useState("");

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

  //Validation helper
  function validateAmount(rawValue, fallbackPreset) {
    const raw = String(rawValue ?? "").trim();
    if (!raw) return ""; // preset is fine
    // allow "25", "25.00", but reject letters
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return "Enter a valid amount (e.g., 25 or 25.00).";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return "Amount must be greater than 0.";
    // optional limits for demo (keep reasonable)
    if (parsed > 5000) return "Please enter an amount under $5,000 for this demo.";
    return "";
  }

  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  // Luhn check for card number
  function luhnIsValid(num) {
    const digits = onlyDigits(num);
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (shouldDouble) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function normalizeExpiry(input) {
    // Keep digits + slash, auto-insert slash after MM
    const raw = String(input || "").replace(/[^\d/]/g, "");
    const digits = raw.replace(/\D/g, "").slice(0, 4); // MMYY
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function expiryIsValid(mmYY) {
    const val = String(mmYY || "").trim();
    const m = val.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;

    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    if (mm < 1 || mm > 12) return false;

    // interpret YY as 2000-2099
    const fullYear = 2000 + yy;

    // valid through end of month
    const now = new Date();
    const endOfExpMonth = new Date(fullYear, mm, 0, 23, 59, 59, 999); // day 0 of next month = last day of exp month
    return endOfExpMonth >= now;
  }

  function validateCardForm() {
    const next = {};

    const name = cardName.trim();
    if (!name) next.cardName = "Name on card is required.";
    else if (name.length < 2) next.cardName = "Please enter a valid name.";

    const digits = onlyDigits(cardNumber);
    if (!digits) next.cardNumber = "Card number is required.";
    else if (digits.length < 13 || digits.length > 19) next.cardNumber = "Card number must be 13–19 digits.";
    else if (!luhnIsValid(digits)) next.cardNumber = "Card number looks invalid.";

    if (!expiry.trim()) next.expiry = "Expiry date is required.";
    else if (!expiryIsValid(expiry)) next.expiry = "Enter a valid, unexpired date (MM/YY).";

    const c = onlyDigits(cvc);
    if (!c) next.cvc = "Security code is required.";
    else if (!(c.length === 3 || c.length === 4)) next.cvc = "Security code must be 3–4 digits.";

    const z = zip.trim();
    if (!z) next.zip = "Zip/Postal code is required.";
    else if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(z)) next.zip = "Enter a valid Zip/Postal code.";

    return next;
  }

  function handleProviderPay() {
    const err = validateAmount(customAmount, selectedAmount);
    setAmountError(err);
    if (err) return;

    // Demo: succeeds
    setShowSuccess(true);
  }

  function handleCardPay() {
    const amtErr = validateAmount(customAmount, selectedAmount);
    setAmountError(amtErr);

    const nextErrors = validateCardForm();
    setCardErrors(nextErrors);

    if (amtErr) return;
    if (Object.keys(nextErrors).length > 0) return;

    // Demo: succeeds
    setShowSuccess(true);
  }

  function resetToStart() {
    setMethod("providers");
    setShowSuccess(false);
    setCardErrors({});
  }

  function handleBackToHome() {
    setShowSuccess(false);
    navigate("/");
  }

  return (
    <section className="supPage" aria-label="Support Sable payments">
      <div className="supShell">
        <h1 className="supTitle">THANK YOU FOR YOUR CONSIDERATION</h1>

        <div className="supCard" role="region" aria-label="Payment card">
          <div className="supCardTop" aria-hidden="true" />

          {method === "providers" ? (
            <div className="supCardBody">
              <div className="supAmounts" aria-label="Choose amount">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={selectedAmount === amt && !customAmount ? "supAmtBtn supAmtBtn--active" : "supAmtBtn"}
                    onClick={() => pickPreset(amt)}
                    aria-label={`Pay ${amt} dollars`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

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
                      // live-clear error when user edits
                      if (amountError) setAmountError("");
                    }}
                    aria-label="Custom payment amount"
                    aria-invalid={amountError ? "true" : "false"}
                    aria-describedby={amountError ? "amountError" : undefined}
                  />
                </div>

                {amountError ? (
                  <div
                    id="amountError"
                    role="alert"
                    style={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: 12,
                      marginTop: 6,
                      color: "rgba(127, 31, 21, 0.95)",
                    }}
                  >
                    {amountError}
                  </div>
                ) : null}
              </div>

              <div className="supProviders" aria-label="Choose payment provider">
                <button type="button" className="supProvider supProvider--paypal" onClick={handleProviderPay}>
                  <span className="supProviderBrand">PayPal</span>
                </button>

                <button
                  type="button"
                  className="supProvider supProvider--card"
                  onClick={() => {
                    setMethod("card");
                    setCardErrors({});
                  }}
                >
                  <span className="supProviderBrand">Credit Card</span>
                </button>

                <button type="button" className="supProvider supProvider--apple" onClick={handleProviderPay}>
                  <span className="supProviderBrand">Pay</span>
                </button>
              </div>

              <div className="supMeta">
                You’ll be charged <strong>{formatMoney(effectiveAmount())}</strong>. This is a demo payment flow.
              </div>
            </div>
          ) : (
            <div className="supCardBody supCardBody--form">
              <div className="supFormRow">
                <label className="supLabel" htmlFor="amount">
                  Payment Amount:
                </label>
                <input id="amount" className="supInput" value={formatMoney(effectiveAmount())} readOnly aria-label="Payment amount" />
                {amountError ? (
                  <div
                    role="alert"
                    style={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: 12,
                      marginTop: 6,
                      color: "rgba(127, 31, 21, 0.95)",
                    }}
                  >
                    {amountError}
                  </div>
                ) : null}
              </div>

              <div className="supFormRow">
                <label className="supLabel" htmlFor="nameOnCard">
                  Name on card
                </label>
                <input
                  id="nameOnCard"
                  className="supInput"
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value);
                    if (cardErrors.cardName) setCardErrors((p) => ({ ...p, cardName: "" }));
                  }}
                  aria-invalid={cardErrors.cardName ? "true" : "false"}
                  aria-describedby={cardErrors.cardName ? "errName" : undefined}
                />
                {cardErrors.cardName ? (
                  <div
                    id="errName"
                    role="alert"
                    style={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: 12,
                      marginTop: 6,
                      color: "rgba(127, 31, 21, 0.95)",
                    }}
                  >
                    {cardErrors.cardName}
                  </div>
                ) : null}
              </div>

              <div className="supFormRow">
                <label className="supLabel" htmlFor="cardNumber">
                  Card Number
                </label>
                <input
                  id="cardNumber"
                  className="supInput"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => {
                
                    const digits = onlyDigits(e.target.value).slice(0, 19);
                    const spaced = digits.replace(/(.{4})/g, "$1 ").trim();
                    setCardNumber(spaced);
                    if (cardErrors.cardNumber) setCardErrors((p) => ({ ...p, cardNumber: "" }));
                  }}
                  aria-invalid={cardErrors.cardNumber ? "true" : "false"}
                  aria-describedby={cardErrors.cardNumber ? "errCard" : undefined}
                />
                {cardErrors.cardNumber ? (
                  <div
                    id="errCard"
                    role="alert"
                    style={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: 12,
                      marginTop: 6,
                      color: "rgba(127, 31, 21, 0.95)",
                    }}
                  >
                    {cardErrors.cardNumber}
                  </div>
                ) : null}
              </div>

              <div className="supTwoCol">
                <div className="supFormRow">
                  <label className="supLabel" htmlFor="expiry">
                    Expiry Date
                  </label>
                  <input
                    id="expiry"
                    className="supInput"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => {
                      setExpiry(normalizeExpiry(e.target.value));
                      if (cardErrors.expiry) setCardErrors((p) => ({ ...p, expiry: "" }));
                    }}
                    aria-invalid={cardErrors.expiry ? "true" : "false"}
                    aria-describedby={cardErrors.expiry ? "errExp" : undefined}
                  />
                  {cardErrors.expiry ? (
                    <div
                      id="errExp"
                      role="alert"
                      style={{
                        fontFamily: '"Libre Baskerville", serif',
                        fontSize: 12,
                        marginTop: 6,
                        color: "rgba(127, 31, 21, 0.95)",
                      }}
                    >
                      {cardErrors.expiry}
                    </div>
                  ) : null}
                </div>

                <div className="supFormRow">
                  <label className="supLabel" htmlFor="cvc">
                    Security Code
                  </label>
                  <input
                    id="cvc"
                    className="supInput"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => {
                      setCvc(onlyDigits(e.target.value).slice(0, 4));
                      if (cardErrors.cvc) setCardErrors((p) => ({ ...p, cvc: "" }));
                    }}
                    aria-invalid={cardErrors.cvc ? "true" : "false"}
                    aria-describedby={cardErrors.cvc ? "errCvc" : undefined}
                  />
                  {cardErrors.cvc ? (
                    <div
                      id="errCvc"
                      role="alert"
                      style={{
                        fontFamily: '"Libre Baskerville", serif',
                        fontSize: 12,
                        marginTop: 6,
                        color: "rgba(127, 31, 21, 0.95)",
                      }}
                    >
                      {cardErrors.cvc}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="supFormRow">
                <label className="supLabel" htmlFor="zip">
                  Zip/Postal Code
                </label>
                <input
                  id="zip"
                  className="supInput"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value);
                    if (cardErrors.zip) setCardErrors((p) => ({ ...p, zip: "" }));
                  }}
                  aria-invalid={cardErrors.zip ? "true" : "false"}
                  aria-describedby={cardErrors.zip ? "errZip" : undefined}
                />
                {cardErrors.zip ? (
                  <div
                    id="errZip"
                    role="alert"
                    style={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: 12,
                      marginTop: 6,
                      color: "rgba(127, 31, 21, 0.95)",
                    }}
                  >
                    {cardErrors.zip}
                  </div>
                ) : null}
              </div>

              <div className="supActions">
                <button type="button" className="supBack" onClick={resetToStart}>
                  Back
                </button>
                <button type="button" className="supPayNow" onClick={handleCardPay}>
                  Pay Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSuccess ? (
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

            <img className="supConfirmImg supConfirmImg--thankyou" src={confirmationImg} alt="" aria-hidden="true" />

            <button type="button" className="supBackHome" onClick={handleBackToHome}>
              Back to Home
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}


