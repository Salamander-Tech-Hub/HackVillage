const STEPS = [
  {
    number: "01",
    title: "Deposit & lock",
    body: "Organizers deposit 100% of the prize pool up front. Funds are locked before the event can go live.",
  },
  {
    number: "02",
    title: "Compete verified",
    body: "Only Prize-Verified events appear to builders. Every competition starts with money already secured.",
  },
  {
    number: "03",
    title: "Split payout",
    body: "Winners receive 50% instantly on announcement, and the final 50% after milestone handover.",
  },
] as const;

export function PrizeVerificationSection() {
  return (
    <section className="landing-verify" aria-labelledby="landing-verify-title">
      <div className="landing-verify-inner">
        <p className="landing-verify-kicker">Trust protocol</p>
        <h2 id="landing-verify-title" className="landing-verify-title">
          How <span>Prize Verification</span> works
        </h2>
        <p className="landing-verify-lede">
          One job for this layer: make sure every advertised prize reaches the right hands —
          with no ghosting and no ambiguous payouts.
        </p>

        <ol className="landing-verify-steps">
          {STEPS.map((step) => (
            <li key={step.number} className="landing-verify-step">
              <span className="landing-verify-num" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="landing-verify-step-title">{step.title}</h3>
              <p className="landing-verify-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
