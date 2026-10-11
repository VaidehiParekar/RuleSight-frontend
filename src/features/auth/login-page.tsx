import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileSearch, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { useAuth } from "@/app/auth-context";
import { BrandLockup } from "@/components/layout/brand-mark";
import { Field, Input } from "@/components/ui/field";
import { mockDataEnabled } from "@/lib/env";
import { describeError } from "@/lib/errors";
import { MOCK_USERS } from "@/mocks/fixtures";

const HIGHLIGHTS = [
  {
    icon: FileSearch,
    title: "Reads RBI text",
    body: "Extracts every obligation with a verbatim quote that is checked against the source.",
  },
  {
    icon: GitBranch,
    title: "Maps to your controls",
    body: "A knowledge graph links clauses, obligations, controls and evidence.",
  },
  {
    icon: ShieldCheck,
    title: "Finds and ranks gaps",
    body: "Drafts fixes for a person to approve. Nothing is final without review.",
  },
] as const;

/** Easing used across the app for entrances: fast start, soft landing. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Where to go after signing in. Only same-app paths are accepted. */
function targetFrom(state: unknown): string {
  if (state && typeof state === "object" && "from" in state) {
    const from = state.from;
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
      return from === "/login" ? "/" : from;
    }
  }
  return "/";
}

/** Slow "breathing" circles and flowing lines behind the hero copy. Pure decoration. */
function HeroBackdrop() {
  const reduce = useReducedMotion() ?? false;
  const loop = (duration: number) =>
    reduce ? { duration: 0 } : { duration, ease: "easeInOut" as const, repeat: Infinity };

  return (
    <>
      <div className="login-dots" aria-hidden="true" />
      <svg
        className="login-waves"
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <motion.circle
          cx="380"
          cy="560"
          r={230}
          stroke="url(#rs-circle-1)"
          animate={
            reduce
              ? undefined
              : {
                  r: [230, 248, 218, 230],
                  strokeWidth: [1.2, 1.9, 1, 1.2],
                  opacity: [0.45, 0.7, 0.35, 0.45],
                }
          }
          transition={loop(4.2)}
        />
        <motion.circle
          cx="340"
          cy="360"
          r={170}
          stroke="url(#rs-circle-2)"
          animate={
            reduce
              ? undefined
              : {
                  r: [170, 185, 158, 170],
                  strokeWidth: [1, 1.6, 0.8, 1],
                  opacity: [0.35, 0.6, 0.25, 0.35],
                }
          }
          transition={loop(3.5)}
        />
        <motion.path
          d="M -20 640 C 120 560, 220 510, 320 440 C 420 370, 480 290, 560 50"
          stroke="url(#rs-line-1)"
          strokeWidth="2"
          strokeLinecap="round"
          animate={
            reduce
              ? undefined
              : {
                  d: [
                    "M -20 640 C 120 560, 220 510, 320 440 C 420 370, 480 290, 560 50",
                    "M -20 610 C 140 585, 240 475, 340 415 C 440 355, 500 265, 560 25",
                    "M -20 670 C 100 535, 200 545, 300 465 C 400 385, 460 315, 560 75",
                    "M -20 640 C 120 560, 220 510, 320 440 C 420 370, 480 290, 560 50",
                  ],
                }
          }
          transition={loop(3.2)}
        />
        <motion.path
          d="M -20 670 C 140 590, 240 535, 340 465 C 440 395, 500 315, 580 75"
          stroke="url(#rs-line-2)"
          strokeWidth="1.2"
          strokeLinecap="round"
          animate={
            reduce
              ? undefined
              : {
                  d: [
                    "M -20 670 C 140 590, 240 535, 340 465 C 440 395, 500 315, 580 75",
                    "M -20 690 C 120 615, 260 505, 360 440 C 460 375, 520 290, 580 50",
                    "M -20 650 C 160 565, 220 565, 320 490 C 420 415, 480 340, 580 100",
                    "M -20 670 C 140 590, 240 535, 340 465 C 440 395, 500 315, 580 75",
                  ],
                }
          }
          transition={loop(4.2)}
        />
        <defs>
          <linearGradient id="rs-line-1" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.08 }} />
            <stop offset="45%" style={{ stopColor: "var(--cyan)", stopOpacity: 0.7 }} />
            <stop offset="100%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.2 }} />
          </linearGradient>
          <linearGradient id="rs-line-2" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.04 }} />
            <stop offset="60%" style={{ stopColor: "var(--cyan)", stopOpacity: 0.45 }} />
            <stop offset="100%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.1 }} />
          </linearGradient>
          <linearGradient id="rs-circle-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.35 }} />
            <stop offset="50%" style={{ stopColor: "var(--cyan)", stopOpacity: 0.5 }} />
            <stop
              offset="100%"
              style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.05 }}
            />
          </linearGradient>
          <linearGradient id="rs-circle-2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.25 }} />
            <stop offset="60%" style={{ stopColor: "var(--cyan)", stopOpacity: 0.4 }} />
            <stop
              offset="100%"
              style={{ stopColor: "var(--navy-foreground)", stopOpacity: 0.05 }}
            />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion() ?? false;
  const target = targetFrom(location.state);

  useEffect(() => {
    document.title = "Sign in · RuleSight";
  }, []);

  if (status === "signed_in") {
    return <Navigate to={target} replace />;
  }

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    signIn(email.trim(), password).then(
      () => {
        void navigate(target, { replace: true });
      },
      (caught: unknown) => {
        setError(describeError(caught).message);
        setPending(false);
      },
    );
  };

  return (
    <div className="login">
      <aside className="login-hero">
        <HeroBackdrop />
        <motion.div className="login-brand" {...rise(0.05)}>
          <BrandLockup />
        </motion.div>

        <div className="login-hero-copy">
          <motion.h1 {...rise(0.12)}>
            Regulatory
            <br />
            Compliance Intelligence
          </motion.h1>
          <motion.p {...rise(0.2)}>
            AI agents read RBI regulations, map them to your controls, and show the evidence behind
            every gap.
          </motion.p>
          <ul className="login-highlights">
            {HIGHLIGHTS.map((item, index) => (
              <motion.li key={item.title} {...rise(0.3 + index * 0.08)}>
                <span className="login-highlight-icon" aria-hidden="true">
                  <item.icon size={18} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.body}</small>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.p className="login-hero-foot" {...rise(0.55)}>
          <span>Demo institution: Nova Trust Bank (fictional)</span>
          <span className="login-hero-badge">
            <ShieldCheck size={14} aria-hidden="true" /> Regulator: RBI
          </span>
        </motion.p>
      </aside>

      <main className="login-panel" id="main-content">
        <motion.form
          className="login-card"
          noValidate
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 24, scale: 0.98 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { type: "spring", stiffness: 260, damping: 26, delay: 0.1 },
              })}
          onSubmit={submit}
        >
          <div className="login-card-head">
            <span className="login-eyebrow">Welcome back</span>
            <h2>Sign in</h2>
            <p className="muted">Your name is recorded on every review and approval.</p>
          </div>

          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="username"
                value={email}
                disabled={pending}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
            )}
          </Field>

          <Field label="Password">
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={pending}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            )}
          </Field>

          {error ? (
            <p className="field-message error" role="alert">
              {error}
            </p>
          ) : null}

          <motion.button
            type="submit"
            className="button primary full login-submit"
            disabled={pending || email.trim() === "" || password === ""}
            whileHover={reduce ? undefined : { scale: 1.015 }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
          >
            {pending ? "Signing in…" : "Sign in"}
            <ArrowRight size={16} className="login-submit-arrow" aria-hidden="true" />
          </motion.button>

          {mockDataEnabled ? (
            <div className="login-note">
              <p>Demo mode: any password works. Use one of these accounts:</p>
              <ul className="demo-accounts">
                {MOCK_USERS.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="link-button mono"
                      onClick={() => {
                        setEmail(user.email);
                      }}
                    >
                      {user.email}
                    </button>{" "}
                    <span className="muted">{user.full_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </motion.form>
      </main>
    </div>
  );
}
