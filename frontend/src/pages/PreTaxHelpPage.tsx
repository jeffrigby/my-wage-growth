import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store';
import { ANIMATION_VARIANTS } from '../constants';

export const PreTaxHelpPage: React.FC = () => {
  const country = useAppSelector(state => state.wageEntries.country);

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8"
      initial={ANIMATION_VARIANTS.FADE_IN.initial}
      animate={ANIMATION_VARIANTS.FADE_IN.animate}
      exit={ANIMATION_VARIANTS.FADE_IN.exit}
    >
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
      >
        <i className="fas fa-arrow-left"></i>
        <span>Back to Calculator</span>
      </Link>

      {/* Header */}
      <motion.section
        className="text-center space-y-4"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gradient">
          Finding Your Pre-Tax Income
        </h1>
        <p className="text-xl text-secondary max-w-2xl mx-auto">
          Learn where to find your gross earnings and why using pre-tax amounts gives you accurate inflation-adjusted comparisons.
        </p>
      </motion.section>

      {/* Why Pre-Tax */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-question-circle text-primary"></i>
          <span>Why Pre-Tax?</span>
        </h2>

        <div className="space-y-4">
          <p className="text-lg text-secondary leading-relaxed">
            Tax rates and brackets change over time, which means your take-home pay can vary even if your salary stays the same.
            By using pre-tax (gross) income, you're comparing your actual earning power before government policies affect it.
          </p>
          <p className="text-secondary">
            This gives you a cleaner, more accurate picture of how your compensation has changed relative to inflation.
          </p>
        </div>
      </motion.section>

      {/* Quick Reference Cards */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-bolt text-warning"></i>
          <span>Quick Reference</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-accent">
              <i className="fas fa-calendar-alt mr-2"></i>
              Annual Salary
            </h3>
            <ul className="space-y-2 text-secondary text-sm">
              {country === 'US' && (
                <li className="flex items-start space-x-2">
                  <i className="fas fa-check text-accent mt-1 text-xs"></i>
                  <span><strong>W-2 Box 3 or 5</strong> – Your total gross wages (includes pre-tax deductions)</span>
                </li>
              )}
              {country === 'CA' && (
                <li className="flex items-start space-x-2">
                  <i className="fas fa-check text-accent mt-1 text-xs"></i>
                  <span><strong>T4 Box 14</strong> – Your total employment income</span>
                </li>
              )}
              {country === 'UK' && (
                <li className="flex items-start space-x-2">
                  <i className="fas fa-check text-accent mt-1 text-xs"></i>
                  <span><strong>P60</strong> – Your total pay for the year</span>
                </li>
              )}
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1 text-xs"></i>
                <span><strong>Offer letter</strong> – Your stated annual salary</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-accent mt-1 text-xs"></i>
                <span><strong>Year-end pay stub</strong> – YTD gross earnings</span>
              </li>
            </ul>
          </div>

          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">
              <i className="fas fa-money-check-alt mr-2"></i>
              Per Paycheck
            </h3>
            <ul className="space-y-2 text-secondary text-sm">
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1 text-xs"></i>
                <span><strong>Gross Pay</strong> – Top line before any deductions</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-primary mt-1 text-xs"></i>
                <span><strong>Total Earnings</strong> – Sum of all pay types</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-times text-error mt-1 text-xs"></i>
                <span><strong>NOT Net Pay</strong> – That's after deductions</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Where to Find It - By Country */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-search text-accent"></i>
          <span>Where to Find Your Pre-Tax Income</span>
        </h2>

        <div className="space-y-6">
          {/* United States */}
          {country === 'US' && (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <i className="fas fa-flag-usa text-primary"></i>
                <span>United States</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-accent mb-2">W-2 Form</h4>
                  <p className="text-secondary mb-2">
                    <strong>Box 3 or 5</strong> – Social Security or Medicare wages
                  </p>
                  <p className="text-muted text-xs">
                    These boxes show your total gross wages before pre-tax deductions (401k, HSA, health insurance). Box 1 excludes these, so use Box 3 or 5 for total compensation.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Pay Stub</h4>
                  <p className="text-secondary mb-2">
                    Look for <strong>"Gross Pay"</strong> or <strong>"Total Earnings"</strong>
                  </p>
                  <p className="text-muted text-xs">
                    This appears before deductions like taxes, 401(k), and health insurance are subtracted.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Form 1040 (Tax Return)</h4>
                  <p className="text-secondary mb-2">
                    <strong>Line 1</strong> – Total income
                  </p>
                  <p className="text-muted text-xs">
                    May include income beyond wages (interest, dividends). Use W-2 for wage-only comparison.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Employment Contract</h4>
                  <p className="text-secondary mb-2">
                    Your <strong>stated annual salary</strong>
                  </p>
                  <p className="text-muted text-xs">
                    Base salary only – add bonuses and other compensation separately for total comp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Canada */}
          {country === 'CA' && (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <i className="fas fa-leaf text-primary"></i>
                <span>Canada</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-accent mb-2">T4 Slip</h4>
                  <p className="text-secondary mb-2">
                    <strong>Box 14</strong> – "Employment income"
                  </p>
                  <p className="text-muted text-xs">
                    Your total employment income before deductions. Issued by end of February for the previous year.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Pay Stub</h4>
                  <p className="text-secondary mb-2">
                    Look for <strong>"Gross Earnings"</strong> or <strong>"Total Pay"</strong>
                  </p>
                  <p className="text-muted text-xs">
                    Before CPP, EI, and income tax deductions are applied.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Employment Contract</h4>
                  <p className="text-secondary mb-2">
                    Your <strong>stated annual salary</strong>
                  </p>
                  <p className="text-muted text-xs">
                    Base salary only – add bonuses and other compensation separately for total comp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* United Kingdom */}
          {country === 'UK' && (
            <div className="bg-surface rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <i className="fas fa-crown text-primary"></i>
                <span>United Kingdom</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-accent mb-2">P60</h4>
                  <p className="text-secondary mb-2">
                    <strong>"Total for year"</strong> in Pay section
                  </p>
                  <p className="text-muted text-xs">
                    Year-end summary of your total pay and tax deducted. Issued by May 31 for the previous tax year.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">P45 (if you left a job)</h4>
                  <p className="text-secondary mb-2">
                    <strong>"Total pay to date"</strong> in this employment
                  </p>
                  <p className="text-muted text-xs">
                    Shows your earnings from that job up to your leaving date.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Payslip</h4>
                  <p className="text-secondary mb-2">
                    Look for <strong>"Gross Pay"</strong>
                  </p>
                  <p className="text-muted text-xs">
                    Before PAYE tax and National Insurance contributions are deducted.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-accent mb-2">Employment Contract</h4>
                  <p className="text-secondary mb-2">
                    Your <strong>stated annual salary</strong>
                  </p>
                  <p className="text-muted text-xs">
                    Base salary only – add bonuses and other compensation separately for total comp.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* What to Include */}
      <motion.section
        className="glass-card p-8"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-6 flex items-center space-x-3">
          <i className="fas fa-plus-circle text-accent"></i>
          <span>What to Include</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Base Salary</h4>
                <p className="text-sm text-muted">Your regular annual or hourly pay</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Bonuses</h4>
                <p className="text-sm text-muted">Annual, signing, performance, or spot bonuses</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Commissions</h4>
                <p className="text-sm text-muted">Sales commissions and similar variable pay</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Overtime Pay</h4>
                <p className="text-sm text-muted">All overtime and premium pay</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Stock Compensation</h4>
                <p className="text-sm text-muted">RSUs, stock options (taxable value at vesting/exercise)</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">ESPP Gains</h4>
                <p className="text-sm text-muted">Discount received on employee stock purchases</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Tips</h4>
                <p className="text-sm text-muted">All reported tips and gratuities</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-check text-accent mt-1"></i>
              <div>
                <h4 className="font-semibold">Severance Pay</h4>
                <p className="text-sm text-muted">If tracking total compensation for a separation year</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tips */}
      <motion.section
        className="glass-card p-8 border-l-4 border-info"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center space-x-3">
          <i className="fas fa-lightbulb text-info"></i>
          <span>Helpful Tips</span>
        </h2>

        <div className="space-y-4 text-secondary">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-info mt-1"></i>
            <div>
              <h4 className="font-semibold">Pre-Tax Deductions Count</h4>
              <p>Your 401(k), HSA, and health insurance contributions are part of your total compensation – that's your money going to savings and benefits. Make sure to include them.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-info mt-1"></i>
            <div>
              <h4 className="font-semibold">Approximations Are Fine</h4>
              <p>If you don't have exact figures, use your best estimate. The goal is to understand trends, not achieve accounting precision.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-info mt-1"></i>
            <div>
              <h4 className="font-semibold">Be Consistent</h4>
              <p>Use the same type of figure (e.g., always gross pay from pay stubs, or always base salary) across all your entries for meaningful comparisons.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-info mt-1"></i>
            <div>
              <h4 className="font-semibold">Multiple Jobs?</h4>
              <p>Add up your gross earnings from all employers for your total annual income, or track each job separately for career analysis.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="text-center"
        initial={ANIMATION_VARIANTS.SLIDE_UP.initial}
        animate={ANIMATION_VARIANTS.SLIDE_UP.animate}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Calculate?</h2>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            Now that you know what to enter, head back to the calculator and add your wage entries.
          </p>
          <Link
            to="/"
            className="btn-primary px-8 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <i className="fas fa-calculator"></i>
            <span>Return to Calculator</span>
          </Link>
        </div>
      </motion.section>
    </motion.div>
  );
};
